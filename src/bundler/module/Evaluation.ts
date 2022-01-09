import evaluate from "./eval";
import { Module } from "./Module";

class EvaluationContext {
  exports: any;
  globals: any;

  constructor() {
    this.exports = {};
    this.globals = {};
  }
}

export class Evaluation {
  module: Module;
  context: EvaluationContext;

  constructor(module: Module) {
    this.module = module;

    const code =
      module.compiled +
      `\n//# sourceURL=${location.origin}${this.module.filepath}`;

    this.context = new EvaluationContext();
    this.context.exports = evaluate(
      code,
      this.require.bind(this),
      this.context,
      {},
      {}
    );
  }

  require(specifier: string): any {
    const resolved = this.module.dependencyMap.get(specifier);
    if (!resolved) {
      throw new Error("Module not found");
    }
    const m = this.module.bundler.getModule(resolved);
    return m?.evaluate().context.exports ?? {};
  }
}
