import {
  ITranspilationContext,
  ITranspilationResult,
  Transformer,
} from "../Transformer";

export class CSSTransformer extends Transformer {
  constructor() {
    super("css-transformer");
  }

  async transform(
    ctx: ITranspilationContext,
    config: any
  ): Promise<ITranspilationResult> {
    // TODO: Handle @import statements
    return {
      code: ctx.code,
      dependencies: new Set(),
    };
  }
}
