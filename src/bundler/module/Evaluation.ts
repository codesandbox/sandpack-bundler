import { nullthrows } from '../../utils/nullthrows';
import evaluate from './eval';
import { HotContext } from './hot';
import { Module } from './Module';

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

    const code = module.compiled + `\n//# sourceURL=${location.origin}${this.module.filepath}`;

    this.context = new EvaluationContext(this);
    this.context.exports = evaluate(
      nullthrows(this.module.bundler.iframe.contentWindow),
      code,
      this.require.bind(this),
      this.context,
      {},
      {}
    );
  }

  require(specifier: string): any {
    const moduleFilePath = this.module.dependencyMap.get(specifier);
    if (!moduleFilePath) {
      console.debug('Require', {
        dependencies: this.module.dependencyMap,
        specifier,
      });

      throw new Error(`Dependency "${specifier}" not collected from "${this.module.filepath}"`);
    }
    const module = this.module.bundler.getModule(moduleFilePath);
    if (!module) {
      throw new Error(`Module "${moduleFilePath}" has not been transpiled`);
    }
    return module.evaluate().context.exports ?? {};
  }
}
