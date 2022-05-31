import { ITranspilationContext, ITranspilationResult, Transformer } from '../Transformer';
import type * as PostCSSLoader from './postcss-loader';

const FEATURE_REGEX = /@import|@url|url\(/;

export class CSSTransformer extends Transformer {
  private _loader: null | Promise<typeof PostCSSLoader> = null;

  constructor() {
    super('css-transformer');
  }

  getLoader(): Promise<typeof PostCSSLoader> {
    if (this._loader) {
      return Promise.resolve(this._loader);
    } else {
      this._loader = import('./postcss-loader');
      return this._loader;
    }
  }

  async transform(ctx: ITranspilationContext, config: any): Promise<ITranspilationResult> {
    if (!FEATURE_REGEX.test(ctx.code)) {
      return {
        code: ctx.code,
        dependencies: new Set(),
      };
    }

    const loader = await this.getLoader();
    return loader.default(ctx);
  }
}
