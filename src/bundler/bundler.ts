import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";
import { FileSystem } from "./FileSystem";
import { Module } from "./Module";
import { ICDNModuleFile } from "./module-registry/module-cdn";
import { ResolverCache, resolveSync } from "../resolver/resolver";

interface IPackageJSON {
  main: string;
  dependencies?: DepMap;
}

export class Bundler {
  parsedPackageJSON: IPackageJSON | null = null;
  moduleRegistry: ModuleRegistry;
  fs: FileSystem;
  modules: Map<string, Module> = new Map();

  resolverCache: ResolverCache = new Map();

  constructor(files: ISandboxFile[]) {
    this.fs = new FileSystem();
    for (let file of files) {
      this.fs.writeFileSync(file.path, file.code);
    }
    this.moduleRegistry = new ModuleRegistry();
  }

  processPackageJSON(): void {
    const foundPackageJSON = this.fs.readFileSync("/package.json");
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

  addPrecompiledNodeModule(path: string, file: ICDNModuleFile): void {
    this.fs.writeFileSync(path, file.c);
    const module = new Module(path, file.c, true);
    for (let dep of file.d) {
      module.addDependency(dep);
    }
    this.modules.set(path, module);
  }

  async loadNodeModules() {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    const dependencies = this.parsedPackageJSON.dependencies;
    if (dependencies) {
      await this.moduleRegistry.fetchNodeModules(dependencies);

      for (let [moduleName, nodeModule] of this.moduleRegistry.modules) {
        for (let [fileName, file] of Object.entries(nodeModule.files)) {
          if (typeof file === "object") {
            this.addPrecompiledNodeModule(
              `/node_modules/${moduleName}/${fileName}`,
              file
            );
          }
        }
      }
    }
  }

  resolveSync(specifier: string, filename: string): string {
    const resolved = resolveSync(specifier, {
      filename,
      extensions: [".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"],
      isFile: this.fs.isFile,
      readFile: this.fs.readFile,
      resolverCache: this.resolverCache,
    });
    return resolved;
  }

  async run() {
    this.processPackageJSON();
    await this.loadNodeModules();

    const entryPoint = this.getEntryPoint();
    console.log({ entryPoint, modules: this.modules, fs: this.fs });
    const resolvedEntryPont = this.resolveSync(entryPoint, "/index.js");
    console.log({ resolvedEntryPont });
  }
}
