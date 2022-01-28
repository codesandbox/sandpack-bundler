import { Bundler } from "./bundler/bundler";
import { IFrameParentMessageBus } from "./protocol/iframe";
import { ICompileRequest } from "./protocol/message-types";
import { Debouncer } from "./utils/Debouncer";
import { DisposableStore } from "./utils/Disposable";

class SandpackInstance {
  private messageBus: IFrameParentMessageBus;
  private disposableStore = new DisposableStore();
  private isFirstLoad = true;
  private bundler = new Bundler();
  private compileDebouncer = new Debouncer(50);

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
        this.compileDebouncer.debounce(() => {
          return this.handleCompile(message).catch(console.error);
        });
        break;
      case "refresh":
        window.location.reload();
        break;
    }
  }

  async init() {
    this.messageBus.sendMessage("initialized");
  }

  async handleCompile(compileRequest: ICompileRequest) {
    this.messageBus.sendMessage("start", {
      firstLoad: this.isFirstLoad,
    });

    const startTime = Date.now();
    console.log("Started bundling");
    await this.bundler.compile(Object.values(compileRequest.modules));
    console.log(`Finished bundling in ${Date.now() - startTime}ms`);

    this.messageBus.sendMessage("done");

    this.isFirstLoad = false;
  }

  dispose() {
    this.disposableStore.dispose();
  }
}

new SandpackInstance();
