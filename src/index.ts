import { Bundler } from "./bundler/bundler";
import { IFrameParentMessageBus } from "./protocol/iframe";
import { ICompileRequest } from "./protocol/message-types";
import { Debouncer } from "./utils/Debouncer";
import { DisposableStore } from "./utils/Disposable";

class SandpackInstance {
  private messageBus: IFrameParentMessageBus;
  private disposableStore = new DisposableStore();
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
        this.compileDebouncer.debounce(() => this.handleCompile(message));
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
      firstLoad: this.bundler.isFirstLoad,
    });

    // --- Load preset
    console.log("Loading preset and transformers...");
    const initStartTime = Date.now();
    await this.bundler.initPreset(compileRequest.template);
    console.log(`Finished loading preset in ${Date.now() - initStartTime}ms`);

    // --- Bundling / Compiling
    console.log("Started bundling");
    const bundlingStartTime = Date.now();
    const files = Object.values(compileRequest.modules);
    const evaluate = await this.bundler
      .compile(files)
      .then((val) => {
        this.messageBus.sendMessage("done", {
          compilatonError: false,
        });
        return val;
      })
      .catch((err) => {
        this.messageBus.sendMessage("action", {
          action: "show-error",
          title: "Compilation error",
          path: "/App.tsx",
          message: err.message,
          line: 1,
          column: 1,
          payload: { frames: [] },
        });

        this.messageBus.sendMessage("done", {
          compilatonError: true,
        });
      })
      .finally(() => {
        console.log(`Finished bundling in ${Date.now() - bundlingStartTime}ms`);
      });

    // --- Evaluation
    if (evaluate) {
      try {
        console.log("Start evaluation");
        const evalStartTime = Date.now();
        evaluate();
        console.log(`Finished evaluation in ${Date.now() - evalStartTime}ms`);
      } catch (err: any) {
        this.messageBus.sendMessage("action", {
          action: "show-error",
          title: "Evaluation error",
          path: "/App.tsx",
          message: err.message,
          line: 1,
          column: 1,
          payload: { frames: [] },
        });
      }
    }
  }

  dispose() {
    this.disposableStore.dispose();
  }
}

new SandpackInstance();
