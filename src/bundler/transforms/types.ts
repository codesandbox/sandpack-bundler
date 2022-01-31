import { Module } from "../module/Module";

export interface ITranspilationResult {
  code: string;
  dependencies: Set<string>;
}

export interface ITranspilationContext {
  module: Module;
  code: string;
}

export type TransformerFn = (ctx: ITranspilationContext) => Promise<ITranspilationResult>;
