import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";
import { FileSystem } from "./FileSystem";
import { Module } from "./module/Module";
import { ICDNModuleFile } from "./module-registry/module-cdn";
import { ResolverCache, resolveAsync } from "../resolver/resolver";
import { NamedPromiseQueue } from "../utils/NamedPromiseQueue";
import { MemoryFSLayer } from "./FileSystem/layers/MemoryFSLayer";
import { NodeModuleFSLayer } from "./FileSystem/layers/NodeModuleFSLayer";

export type TransformationQueue = NamedPromiseQueue<Module>;

interface IPackageJSON {
  main: string;
  dependencies?: DepMap;
}

export class Bundler {
  parsedPackageJSON: IPackageJSON | null = null;
  moduleRegistry: ModuleRegistry;
  fs: FileSystem;
  modules: Map<string, Module> = new Map();
  transformationQueue: TransformationQueue;
  resolverCache: ResolverCache = new Map();
  hasHMR = false;
  isFirstLoad = true;

  // Map from module id => parent module ids
  initiators: Map<string, Set<string>> = new Map();

  constructor() {
    this.moduleRegistry = new ModuleRegistry();
    this.fs = new FileSystem([
      new MemoryFSLayer(),
      new NodeModuleFSLayer(this.moduleRegistry),
    ]);
    this.transformationQueue = new NamedPromiseQueue(true, 50);
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

  getEntryPoint(): string {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    const entry = this.parsedPackageJSON?.main ?? "src/index.js";
    if (entry[0] !== "." && entry[0] !== "/") {
      return `./${entry}`;
    } else {
      return entry;
    }
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
      throw new Error(`Did not compile module ${id}`);
    }

    moduleIds.add(id);

    for (const dep of asset.dependencies) {
      if (!moduleIds.has(dep)) {
        try {
          await this.moduleFinishedPromise(dep, moduleIds);
        } catch (err) {
          console.log(`Failed awaiting transpilation ${dep} required by ${id}`);

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

  async compile(files: ISandboxFile[]) {
    // If it's a change and we don't have any hmr modules we simply reload the application
    if (!this.isFirstLoad && !this.hasHMR) {
      console.log("HMR is not enabled, doing a full page refresh");
      window.location.reload();
      return;
    }

    let changedFiles: string[] = [];
    if (!this.isFirstLoad) {
      changedFiles = this.writeNewFiles(files);
    } else {
      for (let file of files) {
        this.fs.writeFile(file.path, file.code);
      }
    }

    if (changedFiles.length) {
      for (let changedFile of changedFiles) {
        const module = this.getModule(changedFile);
        if (module) {
          module.resetCompilation();
        } else {
          this.transformModule(changedFile).catch(console.error);
        }
      }
    } else {
      // TODO: Load only changed node modules and don't overwrite existing modules
      console.log("Loading node modules");
      await this.processPackageJSON();
      await this.loadNodeModules();
    }

    // Resolve entrypoints
    const entryPoint = this.getEntryPoint();
    const resolvedEntryPont = await this.resolveAsync(entryPoint, "/index.js");
    console.log("Resolved entrypoint:", resolvedEntryPont);

    // Transform entrypoint and deps
    const entryModule = await this.transformModule(resolvedEntryPont);
    await this.moduleFinishedPromise(resolvedEntryPont);
    console.log("Bundling finished, manifest:");
    console.log(this.modules);

    entryModule.isEntry = true;

    // Evaluate
    console.log("Evaluating...");
    this.modules.forEach((module) => {
      if (module.hot.hmrConfig?.isDirty()) {
        module.evaluate();
      }
    });

    entryModule.evaluate();

    // Check if any module has been invalidated, because in that case we need to
    // restart evaluation.
    // const invalidatedModules = this.modules.filter(t => {
    //   if (t.hmrConfig?.invalidated) {
    //     t.compilation = null;
    //     t.hmrConfig = null;

    //     return true;
    //   }

    //   return false;
    // });

    // if (invalidatedModules.length > 0) {
    //   return this.evaluateModule(module, { force, globals });
    // }

    this.isFirstLoad = false;
  }
}
