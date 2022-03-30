import { Bundler } from './bundler/bundler';
import { BundlerError } from './errors/BundlerError';
import { CompilationError } from './errors/CompilationError';
import { errorMessage } from './errors/util';
import { Integrations } from './integrations/integrations';
import { IFrameParentMessageBus } from './protocol/iframe';
import { ICompileRequest } from './protocol/message-types';
import { Debouncer } from './utils/Debouncer';
import { DisposableStore } from './utils/Disposable';
import { getDocumentHeight } from './utils/document';
import * as logger from './utils/logger';

class SandpackInstance {
  private messageBus: IFrameParentMessageBus;
  private disposableStore = new DisposableStore();
  private bundler;
  private compileDebouncer = new Debouncer(50);
  private lastHeight: number = 0;
  private resizePollingTimer: NodeJS.Timer | undefined;
  private integrations: Integrations | undefined;

  constructor() {
    this.messageBus = new IFrameParentMessageBus();
    this.integrations = new Integrations(this.messageBus);
    this.bundler = new Bundler(this.messageBus);

    const disposeOnMessage = this.messageBus.onMessage((msg) => {
      this.handleParentMessage(msg);
    });
    this.disposableStore.add(disposeOnMessage);

    this.init().catch(console.error);
  }

  handleParentMessage(message: any) {
    switch (message.type) {
      case 'compile':
        this.compileDebouncer.debounce(() => this.handleCompile(message).catch(console.error));
        break;
      case 'refresh':
        window.location.reload();
        break;
    }
  }

  sendResizeEvent = () => {
    const height = getDocumentHeight();

    if (this.lastHeight !== height) {
      this.messageBus.sendMessage('resize', { height });
    }

    this.lastHeight = height;
  };

  initResizeEvent() {
    const resizePolling = () => {
      if (this.resizePollingTimer) {
        clearInterval(this.resizePollingTimer);
      }

      this.resizePollingTimer = setInterval(this.sendResizeEvent, 300);
    };

    /**
     * Ideally we should use a `MutationObserver` to trigger a resize event,
     * however, we noted that it's not reliable, so we went for polling strategy
     */
    resizePolling();
  }

  async init() {
    this.messageBus.sendMessage('initialized');
    this.initResizeEvent();
    this.bundler.onStatusChange((newStatus) => {
      this.messageBus.sendMessage('status', { status: newStatus });
    });
  }

  async handleCompile(compileRequest: ICompileRequest) {
    if (compileRequest.logLevel != null) {
      logger.setLogLevel(compileRequest.logLevel);
    }

    this.messageBus.sendMessage('start', {
      firstLoad: this.bundler.isFirstLoad,
    });

    this.messageBus.sendMessage('status', { status: 'initializing' });

    if (this.bundler.isFirstLoad) {
      this.bundler.resetModules();
    }

    // -- Load integrations
    logger.info('Loading integration...');
    const initStartTimeIntegration = Date.now();
    if (compileRequest.reactDevTools) {
      try {
        this.integrations?.load(`react-devtools-${compileRequest.reactDevTools}`).catch(logger.error);
      } catch (err) {
        logger.error(err);
      }
    }
    logger.info(`Finished loading integration in ${Date.now() - initStartTimeIntegration}ms`);

    // --- Load preset
    logger.info('Loading preset and transformers...');
    const initStartTime = Date.now();
    await this.bundler.initPreset(compileRequest.template);
    logger.info(`Finished loading preset in ${Date.now() - initStartTime}ms`);

    // --- Bundling / Compiling
    logger.info('Started bundling');
    const bundlingStartTime = Date.now();
    const files = Object.values(compileRequest.modules);
    const evaluate = await this.bundler
      .compile(files)
      .then((val) => {
        this.messageBus.sendMessage('done', {
          compilatonError: false,
        });

        return val;
      })
      .catch((error: CompilationError) => {
        logger.error(error);

        this.messageBus.sendMessage('action', errorMessage(error));

        this.messageBus.sendMessage('done', {
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
      this.messageBus.sendMessage('status', { status: 'evaluating' });

      try {
        logger.info('Start evaluation');
        const evalStartTime = Date.now();
        evaluate();
        logger.info(`Finished evaluation in ${Date.now() - evalStartTime}ms`);

        /**
         * Send an event right away it's initialized
         */
        this.sendResizeEvent();

        this.messageBus.sendMessage('success');
      } catch (error: unknown) {
        logger.error(error);

        this.messageBus.sendMessage(
          'action',
          errorMessage(error as BundlerError) // TODO: create a evaluation error
        );
      }
    }

    this.messageBus.sendMessage('status', { status: 'idle' });
  }

  dispose() {
    this.disposableStore.dispose();
  }
}

new SandpackInstance();
