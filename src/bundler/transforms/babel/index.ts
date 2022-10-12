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
    // new Worker(new URL('./babel-worker', import.meta.url), {
    //   type: 'module',
    // });

    this.worker = new Worker(new URL('./babel-minimal', import.meta.url), {
      type: 'module',
    });

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
