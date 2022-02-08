import { Module } from "../module/Module";

export interface ITranspilationResult {
  code: string;
  dependencies: Set<string>;
}

export interface ITranspilationContext {
  module: Module;
  code: string;
}

export class Transformer<Config = any> {
  constructor(public id: string) {}

  async init(): Promise<void> {}

  async transform(
    ctx: ITranspilationContext,
    config: Config
  ): Promise<ITranspilationResult> {
    throw new Error("Not implemented");
  }
}
