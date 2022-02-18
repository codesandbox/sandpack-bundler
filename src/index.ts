import { Bundler } from "./bundler/bundler";
import { IFrameParentMessageBus } from "./protocol/iframe";
import { ICompileRequest } from "./protocol/message-types";
import { Debouncer } from "./utils/Debouncer";
import { DisposableStore } from "./utils/Disposable";
import { getDocumentHeight } from "./utils/document";
import * as logger from "./utils/logger";

class SandpackInstance {
  private messageBus: IFrameParentMessageBus;
  private disposableStore = new DisposableStore();
  private bundler = new Bundler();
  private compileDebouncer = new Debouncer(50);
  private lastHeight: number = 0;

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

  initDOMMutationObserver() {
    if (
      typeof window === "undefined" ||
      typeof window.MutationObserver !== "function"
    ) {
      return;
    }

    // Listen on document body for any change that could trigger a resize of the content
    // When a change is found, the sendResize function will determine if a message is dispatched
    const observer = new MutationObserver(() => {
      const height = getDocumentHeight();
      if (this.lastHeight !== height) {
        this.messageBus.sendMessage("resize", { height });
      }
      this.lastHeight = height;
    });

    observer.observe(document, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  async init() {
    this.messageBus.sendMessage("initialized");
    this.initDOMMutationObserver();
  }

  async handleCompile(compileRequest: ICompileRequest) {
    if (compileRequest.logLevel != null) {
      logger.setLogLevel(compileRequest.logLevel);
    }

    this.messageBus.sendMessage("start", {
      firstLoad: this.bundler.isFirstLoad,
    });

    // --- Load preset
    logger.info("Loading preset and transformers...");
    const initStartTime = Date.now();
    await this.bundler.initPreset(compileRequest.template);
    logger.info(`Finished loading preset in ${Date.now() - initStartTime}ms`);

    // --- Bundling / Compiling
    logger.info("Started bundling");
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
        logger.info(`Finished bundling in ${Date.now() - bundlingStartTime}ms`);
      });

    // --- Replace HTML
    this.bundler.replaceHTML();

    // --- Evaluation
    if (evaluate) {
      try {
        logger.info("Start evaluation");
        const evalStartTime = Date.now();
        evaluate();
        logger.info(`Finished evaluation in ${Date.now() - evalStartTime}ms`);
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
