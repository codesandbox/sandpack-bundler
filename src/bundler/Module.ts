import { getTransformers } from "./transforms";

export class Module {
  filepath: string;
  dependencies: Set<string>;

  source: string;
  compiled: string | null;

  constructor(filepath: string, source: string, isCompiled: boolean = false) {
    this.filepath = filepath;
    this.source = source;
    this.compiled = isCompiled ? source : null;
    this.dependencies = new Set();
  }

  /** Add dependency and emit event to queue transpilation of dep */
  addDependency(dep: string): void {
    this.dependencies.add(dep);
  }

  async _compile(): Promise<void> {
    const transformers = getTransformers();
    let input = this.source;
    for (const transformer of transformers) {
      const { code, dependencies } = await transformer(input);
      input = code;
      dependencies.forEach((d) => this.addDependency(d));
    }
    this.compiled = input;
  }

  async compile(): Promise<void> {
    if (this.compiled) {
      return;
    }

    await this._compile();
  }
}
