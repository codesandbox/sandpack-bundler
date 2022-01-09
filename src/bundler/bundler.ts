import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";
import { FileSystem } from "./FileSystem";
import { Module } from "./Module";
import { ICDNModuleFile } from "./module-registry/module-cdn";

interface IPackageJSON {
  main: string;
  dependencies?: DepMap;
}

export class Bundler {
  parsedPackageJSON: IPackageJSON | null = null;
  moduleRegistry: ModuleRegistry;
  fs: FileSystem;
  modules: Map<string, Module> = new Map();

  constructor(files: ISandboxFile[]) {
    this.fs = new FileSystem();
    for (let file of files) {
      this.fs.writeFile(file.path, file.code);
    }
    this.moduleRegistry = new ModuleRegistry();
  }

  processPackageJSON(): void {
    const foundPackageJSON = this.fs.readFile("/package.json");
    if (!foundPackageJSON) {
      throw new Error("package.json not found");
    }
    this.parsedPackageJSON = JSON.parse(foundPackageJSON);
  }

  getEntryPoint(): string {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    return this.parsedPackageJSON!.main;
  }

  addPrecompiledNodeModule(path: string, file: ICDNModuleFile): void {
    this.fs.writeFile(path, file.c);
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

  async run() {
    this.processPackageJSON();
    await this.loadNodeModules();

    const entryPoint = this.getEntryPoint();
    console.log({ entryPoint, modules: this.modules, fs: this.fs });
  }
}
