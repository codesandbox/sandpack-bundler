import { ITranspilationContext, ITranspilationResult, Transformer } from '../Transformer';
import { insertCss } from './insert-css';

const getStyleId = (id: string) => id + '-css';

export class StyleTransformer extends Transformer {
  constructor() {
    super('style-transformer');
  }

  transform(ctx: ITranspilationContext, config: any): Promise<ITranspilationResult> {
    const id = getStyleId(ctx.module.id);
    const result = insertCss(id, ctx.code, true);
    return Promise.resolve({ code: result, dependencies: new Set() });
  }
}
