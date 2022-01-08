export interface ITranspilationResult {
  code: string;
  dependencies: Set<string>;
}

export type TransformerFn = (code: string) => Promise<ITranspilationResult>;
