import { Bundler } from "../bundler";
import { getTransformers } from "../transforms";
import { Evaluation } from "./Evaluation";
import { HotContext } from "./hot";

export interface IDependencyEvent {
  specifier: string;
}

export class Module {
  id: string;
  filepath: string;
  isEntry = false;
  source: string;
  compiled: string | null;
  bundler: Bundler;
  evaluation: Evaluation | null = null;
  hot: HotContext;

  compilationError: Error | null = null;

  dependencies: Set<string>;
  // Keeping this seperate from dependencies as there might be duplicates otherwise
  dependencyMap: Map<string, string>;

  constructor(
    filepath: string,
    source: string,
    isCompiled: boolean = false,
    bundler: Bundler
  ) {
    this.id = filepath;
    this.filepath = filepath;
    this.source = source;
    this.compiled = isCompiled ? source : null;
    this.dependencies = new Set();
    this.dependencyMap = new Map();
    this.bundler = bundler;
    this.hot = new HotContext(this);
  }

  get initiators() {
    return this.bundler.getInitiators(this.id);
  }

  /** Add dependency */
  async addDependency(depSpecifier: string): Promise<void> {
    const resolved = await this.bundler.resolveAsync(
      depSpecifier,
      this.filepath
    );
    this.dependencies.add(resolved);
    this.dependencyMap.set(depSpecifier, resolved);
    this.bundler.addInitiator(resolved, this.id);
  }

  async compile(): Promise<void> {
    if (this.compiled || this.compilationError) {
      return;
    }

    try {
      const transformers = getTransformers();
      let code = this.source;
      for (const transformer of transformers) {
        const transformationResult = await transformer({
          module: this,
          code,
        });
        code = transformationResult.code;
        await Promise.all(
          Array.from(transformationResult.dependencies).map((d) => {
            return this.addDependency(d);
          })
        );
      }
      this.compiled = code;
    } catch (err: any) {
      this.compilationError = err;
    }
  }

  resetCompilation(): void {
    // We always reset compilation errors as this will be non-null while compilation is null
    this.compilationError = null;

    // Skip modules that don't have any compilation
    if (this.compiled == null) return;

    this.compiled = null;
    this.evaluation = null;

    if (this.hot.hmrConfig && this.hot.hmrConfig.isHot()) {
      this.hot.hmrConfig.setDirty(true);
    } else {
      for (let initiator of this.initiators) {
        const module = this.bundler.getModule(initiator);
        module?.resetCompilation();
      }

      // Array.from(this.transpilationInitiators)
      //   .filter((t) => t.compilation)
      //   .forEach((dep) => {
      //     dep.resetCompilation();
      //   });

      // If this is an entry we want all direct entries to be reset as well.
      // Entries generally have side effects
      if (this.isEntry) {
        for (let dependency of this.dependencies) {
          const module = this.bundler.getModule(dependency);
          module?.resetCompilation();
        }
      }
    }

    this.bundler.transformModule(this.filepath);
  }

  evaluate(): Evaluation {
    if (this.evaluation) {
      return this.evaluation;
    }

    if (this.hot.hmrConfig) {
      // this.bundler.setHmrStatus('dispose');
      // Call module.hot.dispose handler
      // https://webpack.js.org/api/hot-module-replacement/#dispose-or-adddisposehandler-
      this.hot.hmrConfig.callDisposeHandler();
      // this.bundler.setHmrStatus('apply');
    }

    // Reset hmr context while keeping the previous hot data
    this.hot = this.hot.clone();
    this.evaluation = new Evaluation(this);

    // this.bundler.setHmrStatus('apply');
    if (this.hot.hmrConfig && this.hot.hmrConfig.isHot()) {
      this.hot.hmrConfig.setDirty(false);
      this.hot.hmrConfig.callAcceptCallback();
    }
    // this.bundler.setHmrStatus('idle');

    return this.evaluation;
  }
}
