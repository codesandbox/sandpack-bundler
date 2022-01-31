import evaluate from "./eval";
import { HotContext } from "./hot";
import { Module } from "./Module";

class EvaluationContext {
  exports: any;
  globals: any;
  hot: HotContext;
  id: string;

  constructor(evaluation: Evaluation) {
    this.exports = {};
    this.globals = {};
    this.hot = evaluation.module.hot;
    this.id = evaluation.module.id;
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

    this.context = new EvaluationContext(this);
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
      console.log("Require", {
        dependencies: this.module.dependencyMap,
        specifier,
      });

      throw new Error("Module not found");
    }
    const m = this.module.bundler.getModule(resolved);
    return m?.evaluate().context.exports ?? {};
  }
}
