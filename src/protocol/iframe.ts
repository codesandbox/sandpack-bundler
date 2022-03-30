import { Emitter } from '../utils/emitter';

/**
 * A message bus to handle messaging with the parent
 * used when this code is ran inside the iframe
 * */
export class IFrameParentMessageBus {
  private parentId: number | null = null;
  private messageId = 0;

  // TODO: Type messages
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
    }

    if (!data.codesandbox) {
      return;
    }

    this.messageEmitter.fire(data);
  }

  sendMessage(type: string, data: Record<string, any> = {}) {
    window.parent.postMessage(
      {
        ...data,
        $id: this.parentId,
        type,
        codesandbox: true,
      },
      '*'
    );
  }

  sendRequest(type: string, params: Record<string, any> = {}): Promise<any> {
    const messageId = this.messageId++;
    return new Promise((resolve) => {
      const disposable = this.onMessage((msg: any) => {
        if (msg.msgId === messageId) {
          disposable.dispose();
          resolve(msg);
        }
      });

      this.sendMessage(type, { params });
    });
  }
}
