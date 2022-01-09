import { Bundler } from "./bundler";
import { getTransformers } from "./transforms";

export interface IDependencyEvent {
  specifier: string;
}

export class Module {
  filepath: string;
  dependencies: Set<string>;

  source: string;
  compiled: string | null;
  bundler: Bundler;

  constructor(
    filepath: string,
    source: string,
    isCompiled: boolean = false,
    bundler: Bundler
  ) {
    this.filepath = filepath;
    this.source = source;
    this.compiled = isCompiled ? source : null;
    this.dependencies = new Set();
    this.bundler = bundler;
  }

  /** Add dependency and emit event to queue transpilation of dep */
  async addDependency(depSpecifier: string): Promise<void> {
    const resolved = this.bundler.resolveSync(depSpecifier, this.filepath);
    this.dependencies.add(resolved);
  }

  async compile(): Promise<void> {
    if (this.compiled) {
      return;
    }

    const transformers = getTransformers();
    let input = this.source;
    for (const transformer of transformers) {
      const { code, dependencies } = await transformer(input);
      input = code;
      dependencies.forEach((d) => this.addDependency(d));
    }
    this.compiled = input;
  }
}
