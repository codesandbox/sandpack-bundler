export type RequestHandlerFn = (method: string, ...params: any[]) => Promise<any>;
export type NotificationHandlerFn = (method: string, data: any) => Promise<any>;
export type ErrorHandlerFn = (error: Error) => Promise<any>;

export interface MessageEndpoint {
  postMessage(message: any, ...params: any[]): void;
  addEventListener(type: string, listener: (ev: any) => any): any;
  removeEventListener(type: string, listener: (ev: any) => any): any;
}

export interface WorkerMessageBusOpts {
  /** name for the channel */
  channel: string;
  // worker ref (on main) or self (on worker)
  endpoint: MessageEndpoint;
  handleRequest: RequestHandlerFn;
  handleNotification: NotificationHandlerFn;
  handleError: ErrorHandlerFn;
  timeoutMs: number;
}

export interface PendingRequest {
  resolve: (result: any) => void;
  reject: (err: Error) => void;
}

const serializeError = (originalError: any): any => {
  if (typeof originalError !== 'object') {
    return { message: originalError };
  } else {
    return {
      message: originalError.message,
      name: originalError.name,
      stack: originalError.stack,
      ...originalError,
    };
  }
};

const parseError = (serializedError: any): Error => {
  const error = new Error(serializedError.message);
  for (const key of Object.keys(serializedError)) {
    // @ts-ignore
    error[key] = serializedError[key];
  }
  return error;
};

export class WorkerMessageBus {
  private endpoint: MessageEndpoint;
  private handleRequest: RequestHandlerFn;
  private handleNotification: NotificationHandlerFn;
  private handleError: ErrorHandlerFn;
  private channel: string;
  private timeoutMs: number;

  private pendingRequests = new Map<number, PendingRequest>();
  private _messageId = 0;

  constructor(opts: WorkerMessageBusOpts) {
    this.channel = opts.channel;
    this.endpoint = opts.endpoint;
    this.handleRequest = opts.handleRequest;
    this.handleNotification = opts.handleNotification;
    this.handleError = opts.handleError;
    this.timeoutMs = opts.timeoutMs;

    this.endpoint.addEventListener('message', async (evt) => {
      const data = evt.data;
      if (data.channel !== this.channel) {
        return;
      }

      const messageId = data.id;
      if (data.method) {
        if (messageId == null) {
          this.handleNotification(data.method, data.data);
        } else if (data.method && data.params) {
          // It's a request
          try {
            const result = await this.handleRequest(data.method, ...data.params);
            this.endpoint.postMessage({
              id: messageId,
              channel: this.channel,
              result,
            });
          } catch (err) {
            console.error(err);

            this.endpoint.postMessage({
              id: messageId,
              channel: this.channel,
              error: serializeError(err),
            });
          }
        }
      } else if (messageId != null) {
        // It's a response
        const pendingRequest = this.pendingRequests.get(messageId);
        if (!pendingRequest) {
          return;
        }

        if (data.error !== undefined) {
          pendingRequest.reject(parseError(data.error));
        } else {
          pendingRequest.resolve(data.result);
        }
      }
    });

    this.endpoint.addEventListener('error', (err) => this.handleError(err));
  }

  nextMessageId() {
    this._messageId++;
    return this._messageId;
  }

  request(method: string, ...params: any): Promise<any> {
    const messageId = this.nextMessageId();
    const message = {
      channel: this.channel,
      id: messageId,
      method,
      params,
    };
    const promise = new Promise((resolve, reject) => {
      const timeoutRef = setTimeout(() => {
        this.pendingRequests.delete(messageId);
        reject(new Error(`Request on channel ${this.channel} timed out`));
      }, this.timeoutMs);

      this.pendingRequests.set(messageId, {
        resolve: (data) => {
          clearTimeout(timeoutRef);
          resolve(data);
        },
        reject: (err) => {
          clearTimeout(timeoutRef);
          reject(err);
        },
      });
    });
    this.endpoint.postMessage(message);
    return promise;
  }
}
