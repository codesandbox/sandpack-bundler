import HMR from "./HMR";
import { Module } from "./Module";

export class HotContext {
  hmrConfig: HMR | null = null;

  constructor(private module: Module) {}

  get data() {
    return this.hmrConfig?.data;
  }

  clone(): HotContext {
    const cloned = new HotContext(this.module);
    const data = this.data;
    if (data) {
      const hmrConfig = cloned.ensureHMRConfig();
      hmrConfig.data = data;
    }
    return cloned;
  }

  /** Get hmr config, if it does not exist it will be created and this module marked as hot */
  ensureHMRConfig(): HMR {
    this.hmrConfig = this.hmrConfig ?? new HMR();
    this.module.bundler.enableHMR();
    return this.hmrConfig;
  }

  accept(path: string | string[], cb: () => any) {
    if (
      typeof path === "undefined" ||
      (typeof path !== "string" && !Array.isArray(path))
    ) {
      // Self mark hot
      const hmrConfig = this.ensureHMRConfig();
      hmrConfig.setType("accept");
      hmrConfig.setSelfAccepted(true);
    } else {
      const paths = typeof path === "string" ? [path] : path;

      paths.forEach(async (p) => {
        const resolvedPath = await this.module.bundler.resolveAsync(
          p,
          this.module.filepath
        );
        const module = this.module.bundler.getModule(resolvedPath);
        if (module) {
          const hmrConfig = module.hot.ensureHMRConfig();
          hmrConfig.setType("accept");
          hmrConfig.setAcceptCallback(cb);
        }
      });
    }
  }

  decline(path: string | string[]) {
    if (typeof path === "undefined") {
      const hmrConfig = this.ensureHMRConfig();
      hmrConfig.setType("decline");
      this.module.resetCompilation();
    } else {
      const paths = typeof path === "string" ? [path] : path;

      paths.forEach(async (p) => {
        const resolvedPath = await this.module.bundler.resolveAsync(
          p,
          this.module.filepath
        );
        const module = this.module.bundler.getModule(resolvedPath);
        if (module) {
          const hmrConfig = module.hot.ensureHMRConfig();
          hmrConfig.setType("decline");
          module.resetCompilation();
        }
      });
    }
  }

  dispose(cb: () => void) {
    const hmrConfig = this.ensureHMRConfig();
    hmrConfig.setDisposeHandler(cb);
  }

  invalidate() {
    const hmrConfig = this.ensureHMRConfig();

    // We have to bubble up, so reset compilation of parents
    for (let initiator of this.module.initiators) {
      const module = this.module.bundler.getModule(initiator);
      module?.resetCompilation();
    }

    hmrConfig.setInvalidated(true);
  }
}
