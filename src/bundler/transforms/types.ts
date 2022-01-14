export interface ITranspilationResult {
  code: string;
  dependencies: Set<string>;
}

export interface ITranspilationContext {
  filepath: string;
  code: string;
}

export type TransformerFn = (ctx: ITranspilationContext) => Promise<ITranspilationResult>;
