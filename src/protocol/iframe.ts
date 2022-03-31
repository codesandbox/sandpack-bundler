import { Emitter } from '../utils/emitter';

/**
 * A message bus to handle messaging with the parent
 * used when this code is ran inside the iframe
 * */
export class IFrameParentMessageBus {
  private parentId: number | null = null;
  private messageId = Date.now();

  // TODO: Type messages
  private messageEmitter = new Emitter();
  onMessage = this.messageEmitter.event;

  private rawMessageEmitter = new Emitter();
  private onRawMessage = this.rawMessageEmitter.event;

  constructor() {
    this._messageListener = this._messageListener.bind(this);

    window.addEventListener('message', this._messageListener);
  }

  private _messageListener(evt: any) {
    const data = evt.data;

    this.rawMessageEmitter.fire(data);

    if (data.type === 'register-frame') {
      this.parentId = data.id;
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

  protocolRequest(protocol: string, data: Record<string, any> = {}): Promise<any> {
    const type = `p-${protocol}`;
    const messageId = this.messageId++;
    return new Promise((resolve, reject) => {
      const disposable = this.onRawMessage((msg: any) => {
        if (msg.$id === messageId && msg.$type === type) {
          disposable.dispose();

          if (msg.$error) {
            reject(new Error(msg.$error.message));
          } else {
            resolve(msg.$data);
          }
        }
      });

      this._postMessage({
        $type: type,
        codesandbox: true,
        $data: data,
        // !!! This is really dangerous, overlap with channelId...
        // Should've named this msgId...
        $id: messageId,
      });
    });
  }
}
