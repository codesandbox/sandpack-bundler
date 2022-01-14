import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";
import { FileSystem } from "./FileSystem";
import { Module } from "./module/Module";
import { ICDNModuleFile } from "./module-registry/module-cdn";
import { ResolverCache, resolveAsync } from "../resolver/resolver";
import { NamedPromiseQueue } from "../utils/NamedPromiseQueue";

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

  constructor(files: ISandboxFile[]) {
    this.fs = new FileSystem();
    for (let file of files) {
      this.fs.writeFile(file.path, file.code);
    }
    this.moduleRegistry = new ModuleRegistry();
    this.transformationQueue = new NamedPromiseQueue(true, 50);
  }

  getModule(filepath: string): Module | undefined {
    return this.modules.get(filepath);
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
    this.fs.writeFile(path, file.c);
    const module = new Module(path, file.c, true, this);
    this.modules.set(path, module);
    return file.d.map((dep) => () => module.addDependency(dep));
  }

  async loadNodeModules() {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    const dependencies = this.parsedPackageJSON.dependencies;
    if (dependencies) {
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
      console.error(Array.from(this.fs.files));
      throw err;
    }
  }

  private async _transformModule(path: string): Promise<Module> {
    let module = this.modules.get(path);
    if (module) {
      if (module.compiled != null) {
        return Promise.resolve(module);
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
    return this.transformationQueue.addEntry(path, () =>
      this._transformModule(path)
    );
  }

  async moduleFinishedPromise(
    id: string,
    moduleIds: Set<string> = new Set()
  ): Promise<any> {
    if (moduleIds.has(id)) return;

    moduleIds.add(id);

    const foundPromise = this.transformationQueue.getItem(id);
    if (foundPromise) {
      await foundPromise;
    }

    const asset = this.modules.get(id);
    if (!asset) {
      throw new Error("Somethings up");
    }

    for (const dep of asset.dependencies) {
      if (!moduleIds.has(dep)) {
        await this.moduleFinishedPromise(dep, moduleIds);
      }
    }
  }

  async run() {
    console.log("Loading node modules");
    await this.processPackageJSON();
    await this.loadNodeModules();

    // Resolve entrypoints
    const entryPoint = this.getEntryPoint();
    const resolvedEntryPont = await this.resolveAsync(entryPoint, "/index.js");
    console.log("Resolved entrypoint:", resolvedEntryPont);

    // Transform entrypoint and deps
    const entryModule = await this.transformModule(resolvedEntryPont);
    await this.moduleFinishedPromise(resolvedEntryPont);
    console.log("Bundling finished, manifest:");
    console.log(this.modules);

    // Evaluate
    console.log("Evaluating...");
    entryModule.evaluate();
  }
}
