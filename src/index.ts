import { Bundler } from "./bundler/bundler";
import { IFrameParentMessageBus } from "./protocol/iframe";
import { ICompileRequest } from "./protocol/message-types";
import { DisposableStore } from "./utils/Disposable";

class SandpackInstance {
  private messageBus: IFrameParentMessageBus;
  private disposableStore = new DisposableStore();

  constructor() {
    this.messageBus = new IFrameParentMessageBus();

    const disposeOnMessage = this.messageBus.onMessage((msg) => {
      this.handleParentMessage(msg);
    });
    this.disposableStore.add(disposeOnMessage);

    this.init().catch(console.error);
  }

  handleParentMessage(message: any) {
    switch (message.type) {
      case "compile":
        this.handleCompile(message).catch(console.error);
        break;
      case "refresh":
        window.location.reload();
        break;
    }
    console.log({ message });
  }

  async init() {
    this.messageBus.sendMessage("initialized");
  }

  async handleCompile(compileRequest: ICompileRequest) {
    this.messageBus.sendMessage("start", {
      firstLoad: true,
    });

    const bundler = new Bundler(Object.values(compileRequest.modules));
    const startTime = Date.now();
    console.log("Started bundling");
    await bundler.run();
    console.log(`Finished bundling in ${Date.now() - startTime}ms`);

    this.messageBus.sendMessage("done");
  }

  dispose() {
    this.disposableStore.dispose();
  }
}

new SandpackInstance();
