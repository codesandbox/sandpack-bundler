import { CompilationError } from '../../../errors/CompilationError';
import * as logger from '../../../utils/logger';
import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationContext, ITranspilationResult, Transformer } from '../Transformer';
import { ITransformData } from './babel-worker';

export class BabelTransformer extends Transformer {
  private worker: null | Worker = null;
  private messageBus: null | WorkerMessageBus = null;

  constructor() {
    super('babel-transformer');
  }

  async init() {
    const loadRegularBabelWorker = () => import('./load-babel-standalone');
    const loadMinimalBabelWorker = () => import('./load-babel-minimal');

    const babelSetting = /babel=minimal/.test(window.location.search);
    let loadWorker = await (babelSetting ? loadMinimalBabelWorker() : loadRegularBabelWorker());
    this.worker = loadWorker.default();

    this.messageBus = new WorkerMessageBus({
      channel: 'sandpack-babel',
      endpoint: this.worker,
      handleNotification: () => Promise.resolve(),
      handleRequest: () => Promise.reject(new Error('Unknown method')),
      handleError: (err) => {
        logger.error(err);
        return Promise.resolve();
      },
      timeoutMs: 30000,
    });
  }

  async transform(ctx: ITranspilationContext, config: any): Promise<ITranspilationResult> {
    if (!this.messageBus) {
      throw new Error('Babel worker has not been initialized');
    }

    const data: ITransformData = {
      code: ctx.code,
      filepath: ctx.module.filepath,
      config,
    };

    try {
      return await this.messageBus.request('transform', data);
    } catch (err: unknown) {
      return new CompilationError(err as Error, ctx.module.filepath);
    }
  }
}
