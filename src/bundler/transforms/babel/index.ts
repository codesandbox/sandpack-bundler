import {
  ITranspilationContext,
  ITranspilationResult,
  Transformer,
  TransformFn,
} from "../Transformer";

export class BabelTransformer extends Transformer {
  private loader: null | TransformFn = null;

  constructor() {
    super("babel-transformer");
  }

  async init() {
    this.transform = await import("./loader").then((l) => l.transform);
  }

  async transform(
    ctx: ITranspilationContext,
    config: any
  ): Promise<ITranspilationResult> {
    if (!this.loader) {
      throw new Error("Babel loader has not been initialized");
    }

    return this.loader(ctx, config);
  }
}
