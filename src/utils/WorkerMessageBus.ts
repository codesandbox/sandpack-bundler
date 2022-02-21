export type RequestHandlerFn = (method: string, data: any) => Promise<any>;
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
}

export interface PendingRequest {
  resolve: (result: any) => void;
  reject: (err: Error) => void;
}

export class WorkerMessageBus {
  private endpoint: MessageEndpoint;
  private handleRequest: RequestHandlerFn;
  private handleNotification: NotificationHandlerFn;
  private handleError: ErrorHandlerFn;
  private channel: string;

  private pendingRequests = new Map<number, PendingRequest>();
  private _messageId = 0;

  constructor(opts: WorkerMessageBusOpts) {
    this.channel = opts.channel;
    this.endpoint = opts.endpoint;
    this.handleRequest = opts.handleRequest;
    this.handleNotification = opts.handleNotification;
    this.handleError = opts.handleError;

    this.endpoint.addEventListener("message", async (evt) => {
      const data = evt.data;
      if (data.channel !== this.channel) {
        return;
      }

      const method = data.method;
      if (!method) {
        return;
      }

      const messageId = data.id;
      if (!messageId) {
        this.handleNotification(data.method, data.data);
      } else {
        if (data.method && data.params) {
          // It's a request
          try {
            const result = await this.handleRequest(data.method, data.params);
            this.endpoint.postMessage({
              id: messageId,
              result,
            });
          } catch (err) {
            this.endpoint.postMessage({
              id: messageId,
              error: err,
            });
          }
        } else {
          // It's a response
          const pendingRequest = this.pendingRequests.get(messageId);
          if (!pendingRequest) {
            return;
          }

          if (data.error !== undefined) {
            pendingRequest.reject(data.error);
          } else {
            pendingRequest.resolve(data.result);
          }
        }
      }
    });

    this.endpoint.addEventListener("error", (err) => this.handleError(err));
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
      this.pendingRequests.set(messageId, { resolve, reject });
    });
    this.endpoint.postMessage(message);
    return promise;
  }
}
