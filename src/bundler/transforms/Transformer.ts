import { BundlerError } from '../../errors/BundlerError';
import { Bundler } from '../bundler';
import { Module } from '../module/Module';

export type ITranspilationResult =
  | {
      code: string;
      dependencies: Set<string>;
    }
  | BundlerError;

export interface ITranspilationContext {
  module: Module;
  code: string;
}

export class Transformer<Config = any> {
  constructor(public id: string) {}

  async init(bundler: Bundler): Promise<void> {}

  async transform(ctx: ITranspilationContext, config: Config): Promise<ITranspilationResult> {
    throw new Error('Not implemented');
  }
}
