import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";
import { FileSystem } from "./FileSystem";
import { Module } from "./module/Module";
import { ICDNModuleFile } from "./module-registry/module-cdn";
import { ResolverCache, resolveAsync } from "../resolver/resolver";
import { NamedPromiseQueue } from "../utils/NamedPromiseQueue";
import { MemoryFSLayer } from "./FileSystem/layers/MemoryFSLayer";
import { NodeModuleFSLayer } from "./FileSystem/layers/NodeModuleFSLayer";
import { Preset } from "./presets/Preset";
import { getPreset } from "./presets/registry";
import { replaceHTML } from "../utils/html";
import * as logger from "../utils/logger";
import { Emitter } from "../utils/emitter";
import { BundlerStatus } from "../protocol/message-types";

export type TransformationQueue = NamedPromiseQueue<Module>;

interface IPackageJSON {
  main?: string;
  module?: string;
  source?: string;
  dependencies?: DepMap;
}

export class Bundler {
  private lastHTML: string | null = null;

  parsedPackageJSON: IPackageJSON | null = null;
  moduleRegistry: ModuleRegistry;
  fs: FileSystem;
  // Map filepath => Module
  modules: Map<string, Module> = new Map();
  transformationQueue: TransformationQueue;
  resolverCache: ResolverCache = new Map();
  hasHMR = false;
  isFirstLoad = true;
  preset: Preset | undefined;

  // Map from module id => parent module ids
  initiators = new Map<string, Set<string>>();
  runtimes: string[] = [];

  private onStatusChangeEmitter = new Emitter<BundlerStatus>();
  onStatusChange = this.onStatusChangeEmitter.event;

  constructor() {
    this.moduleRegistry = new ModuleRegistry();
    this.fs = new FileSystem([
      new MemoryFSLayer(),
      new NodeModuleFSLayer(this.moduleRegistry),
    ]);
    this.transformationQueue = new NamedPromiseQueue(true, 50);
  }

  /** Reset all compilation data */
  resetModules(): void {
    this.preset = undefined;
    this.modules = new Map();
    this.resolverCache = new Map();
  }

  async initPreset(preset: string): Promise<void> {
    if (!this.preset) {
      this.preset = getPreset(preset);
      await this.preset.init(this);
    }
  }

  registerRuntime(id: string, code: string): void {
    const filepath = `/node_modules/__csb_runtimes/${id}.js`;
    this.fs.writeFile(filepath, code);
    const module = new Module(filepath, code, false, this);
    this.modules.set(filepath, module);
    this.runtimes.push(filepath);
  }

  getModule(filepath: string): Module | undefined {
    return this.modules.get(filepath);
  }

  enableHMR(): void {
    this.hasHMR = true;
  }

  getInitiators(id: string): Set<string> {
    return this.initiators.get(id) ?? new Set();
  }

  addInitiator(moduleId: string, initiatorId: string): void {
    const initiators = this.getInitiators(moduleId);
    initiators.add(initiatorId);
    this.initiators.set(moduleId, initiators);
  }

  async processPackageJSON(): Promise<void> {
    const foundPackageJSON = await this.fs.readFileAsync("/package.json");
    this.parsedPackageJSON = JSON.parse(foundPackageJSON);
  }

  async resolveEntryPoint(): Promise<string> {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    if (!this.preset) {
      throw new Error("Preset has not been loaded yet");
    }

    const potentialEntries = new Set(
      [
        this.parsedPackageJSON.main,
        this.parsedPackageJSON.source,
        this.parsedPackageJSON.module,
        ...this.preset.defaultEntryPoints,
      ].filter((e) => typeof e === "string")
    );

    for (let potentialEntry of potentialEntries) {
      if (typeof potentialEntry === "string") {
        try {
          // Normalize path
          const entryPoint =
            potentialEntry[0] !== "." && potentialEntry[0] !== "/"
              ? `./${potentialEntry}`
              : potentialEntry;
          const resolvedEntryPont = await this.resolveAsync(
            entryPoint,
            "/index.js"
          );
          return resolvedEntryPont;
        } catch (err) {
          logger.debug(`Could not resolve entrypoint ${potentialEntry}`);
          logger.debug(err);
        }
      }
    }
    throw new Error(
      `Could not resolve entry point, potential entrypoints: ${Array.from(
        potentialEntries
      ).join(
        ", "
      )}. You can define one by changing the "main" field in package.json.`
    );
  }

  addPrecompiledNodeModule(
    path: string,
    file: ICDNModuleFile
  ): (() => Promise<void>)[] {
    const module = new Module(path, file.c, true, this);
    this.modules.set(path, module);
    return file.d.map((dep) => async () => {
      await module.addDependency(dep);

      for (let dep of module.dependencies) {
        this.transformModule(dep);
      }
    });
  }

  async loadNodeModules() {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    const dependencies = this.parsedPackageJSON.dependencies;
    if (dependencies) {
      if (dependencies["react"] && !dependencies["react-refresh"]) {
        dependencies["react-refresh"] = "^0.11.0";
      }

      await this.moduleRegistry.fetchNodeModules(dependencies);

      const depPromises = [];
      for (let [moduleName, nodeModule] of this.moduleRegistry.modules) {
        for (let [fileName, file] of Object.entries(nodeModule.files)) {
          if (typeof file === "object") {
            const promises = this.addPrecompiledNodeModule(
              `/node_modules/${moduleName}/${fileName}`,
              file
            );
            depPromises.push(...promises);
          }
        }
      }
      await Promise.all(depPromises.map((fn) => fn()));
    }
  }

  async resolveAsync(specifier: string, filename: string): Promise<string> {
    try {
      const resolved = await resolveAsync(specifier, {
        filename,
        extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
        isFile: this.fs.isFile,
        readFile: this.fs.readFile,
        resolverCache: this.resolverCache,
      });
      return resolved;
    } catch (err) {
      console.error(err);
      console.error(Array.from(this.modules));
      // console.error(Array.from(this.fs.files));
      throw err;
    }
  }

  private async _transformModule(path: string): Promise<Module> {
    let module = this.modules.get(path);
    if (module) {
      if (module.compiled != null) {
        return Promise.resolve(module);
      } else {
        // compilation got reset, we re-read the source to ensure it's the latest version.
        // reset happens mostly when we receive changes from the editor, so this ensures we actually output the changes...
        module.source = await this.fs.readFileAsync(path);
      }
    } else {
      const content = await this.fs.readFileAsync(path);
      module = new Module(path, content, false, this);
      this.modules.set(path, module);
    }
    await module.compile();
    for (let dep of module.dependencies) {
      const resolvedDependency = await this.resolveAsync(dep, module.filepath);
      this.transformModule(resolvedDependency);
    }
    return module;
  }

  /** Transform file at a certain absolute path */
  async transformModule(path: string): Promise<Module> {
    let module = this.modules.get(path);
    if (module && module.compiled != null) {
      return Promise.resolve(module);
    }
    return this.transformationQueue.addEntry(path, () => {
      return this._transformModule(path);
    });
  }

  async moduleFinishedPromise(
    id: string,
    moduleIds: Set<string> = new Set()
  ): Promise<any> {
    if (moduleIds.has(id)) return;

    const foundPromise = this.transformationQueue.getItem(id);
    if (foundPromise) {
      await foundPromise;
    }

    const asset = this.modules.get(id);
    if (!asset) {
      throw new Error(`Asset not in the compilation tree ${id}`);
    } else {
      if (asset.compilationError != null) {
        throw asset.compilationError;
      } else if (asset.compiled == null) {
        throw new Error(`Asset ${id} has not been compiled`);
      }
    }

    moduleIds.add(id);

    for (const dep of asset.dependencies) {
      if (!moduleIds.has(dep)) {
        try {
          await this.moduleFinishedPromise(dep, moduleIds);
        } catch (err) {
          logger.debug(
            `Failed awaiting transpilation ${dep} required by ${id}`
          );

          throw err;
        }
      }
    }
  }

  /** writes any new files and returns a list of updated modules */
  writeNewFiles(files: ISandboxFile[]): string[] {
    const res: string[] = [];

    for (let file of files) {
      try {
        const content = this.fs.readFileSync(file.path);
        if (content !== file.code) {
          res.push(file.path);
        }
      } catch (err) {
        // file does not exist
      }

      this.fs.writeFile(file.path, file.code);
    }

    return res;
  }

  async compile(files: ISandboxFile[]): Promise<() => any> {
    this.onStatusChangeEmitter.fire("installing-dependencies");

    // TODO: Have more fine-grained cache invalidation for the resolver
    // Reset resolver cache
    this.resolverCache = new Map();

    let changedFiles: string[] = [];
    if (!this.isFirstLoad) {
      logger.info("Started incremental compilation");

      changedFiles = this.writeNewFiles(files);

      if (!changedFiles.length) {
        logger.info("Skipping compilation, no changes detected");
        return () => {};
      }

      // If it's a change and we don't have any hmr modules we simply reload the application
      if (!this.hasHMR) {
        logger.debug("HMR is not enabled, doing a full page refresh");
        window.location.reload();
        return () => {};
      }
    } else {
      for (let file of files) {
        this.fs.writeFile(file.path, file.code);
      }
    }

    if (changedFiles.length) {
      const promises = [];
      for (let changedFile of changedFiles) {
        const module = this.getModule(changedFile);
        if (module) {
          module.resetCompilation();
        }
        promises.push(this.transformModule(changedFile));
      }
      await Promise.all(promises);
    } else {
      // TODO: Load only changed node modules and don't overwrite existing modules
      console.debug("Loading node modules");
      await this.processPackageJSON();
      await this.loadNodeModules();
    }

    this.onStatusChangeEmitter.fire("transpiling");

    // Transform runtimes
    if (this.isFirstLoad) {
      for (const runtime of this.runtimes) {
        await this.transformModule(runtime);
        await this.moduleFinishedPromise(runtime);
      }
    }

    // Resolve entrypoints
    const resolvedEntryPoint = await this.resolveEntryPoint();
    console.debug("Resolved entrypoint:", resolvedEntryPoint);

    // Transform entrypoint and deps
    const entryModule = await this.transformModule(resolvedEntryPoint);
    await this.moduleFinishedPromise(resolvedEntryPoint);
    console.debug("Bundling finished, manifest:");
    console.debug(this.modules);

    entryModule.isEntry = true;

    return () => {
      // Evaluate
      console.info("Evaluating...");

      if (this.isFirstLoad) {
        for (const runtime of this.runtimes) {
          const module = this.modules.get(runtime);
          if (!module) {
            throw new Error(`Runtime ${runtime} is not defined`);
          } else {
            console.debug(`Loading runtime ${runtime}...`);
            module.evaluate();
          }
        }

        entryModule.evaluate();
      } else {
        this.modules.forEach((module) => {
          if (module.hot.hmrConfig?.isDirty()) {
            module.evaluate();
          }
        });

        // TODO: Validate that this logic actually works...
        // Check if any module has been invalidated, because in that case we need to
        // restart evaluation.
        const invalidatedModules = Object.values(this.modules).filter(
          (m: Module) => {
            if (m.hot.hmrConfig?.invalidated) {
              m.resetCompilation();
              this.transformModule(m.filepath);
              return true;
            }

            return false;
          }
        );

        if (invalidatedModules.length > 0) {
          return this.compile(files);
        }
      }

      this.isFirstLoad = false;
    };
  }

  // TODO: Support template languages...
  getHTMLEntry(): string {
    const foundHTMLFilepath = ["/index.html", "/public/index.html"].find(
      (filepath) => this.fs.isFileSync(filepath)
    );

    if (foundHTMLFilepath) {
      return this.fs.readFileSync(foundHTMLFilepath);
    } else {
      if (!this.preset) {
        throw new Error("Bundler has not been initialized with a preset");
      }
      return this.preset.defaultHtmlBody;
    }
  }

  replaceHTML() {
    const html = this.getHTMLEntry() ?? '<div id="root"></div>';
    if (this.lastHTML) {
      if (this.lastHTML !== html) {
        window.location.reload();
      }
      return;
    } else {
      this.lastHTML = html;
      replaceHTML(html);
    }
  }
}
