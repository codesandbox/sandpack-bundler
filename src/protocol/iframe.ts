import { Emitter } from '../utils/emitter';

/**
 * A message bus to handle messaging with the parent
 * used when this code is ran inside the iframe
 * */
export class IFrameParentMessageBus {
  private parentId: number | null = null;
  private messageId = Date.now();

  private messageEmitter = new Emitter();
  onMessage = this.messageEmitter.event;

  constructor() {
    this._messageListener = this._messageListener.bind(this);

    window.addEventListener('message', this._messageListener);
  }

  private _messageListener(evt: any) {
    const data = evt.data;

    if (data.type === 'register-frame') {
      this.parentId = data.id;
      return;
    }

    if (!data.codesandbox) {
      return;
    }

    this.messageEmitter.fire(data);
  }

  _postMessage(message: any) {
    window.parent.postMessage(message, '*');
  }

  sendMessage(type: string, data: Record<string, any> = {}) {
    this._postMessage({
      ...data,
      $id: this.parentId,
      type,
      codesandbox: true,
    });
  }

  protocolRequest(protocolName: string, method: string, params: Array<any>): Promise<any> {
    const type = `protocol-${protocolName}`;
    const messageId = this.messageId++;
    return new Promise((resolve, reject) => {
      const disposable = this.onMessage((msg: any) => {
        if (msg.$msgId === messageId && msg.type === type) {
          disposable.dispose();

          if (msg.$error) {
            reject(new Error(msg.$error.message));
          } else {
            resolve(msg.$result);
          }
        }
      });

      this.sendMessage(type, {
        $msgId: messageId,
        $method: method,
        $params: params,
      });
    });
  }
}
