import { ISandboxFile } from "../api/sandbox";
import { DepMap, ModuleRegistry } from "./module-registry";

interface IPackageJSON {
  main: string;
  dependencies?: DepMap;
}

export class Bundler {
  files: ISandboxFile[];
  parsedPackageJSON: IPackageJSON | null = null;
  moduleRegistry: ModuleRegistry;

  constructor(files: ISandboxFile[]) {
    this.files = files;
    this.moduleRegistry = new ModuleRegistry();
  }

  processPackageJSON(): void {
    const foundPackageJSON = this.files.find((f) => f.path === "/package.json");
    if (!foundPackageJSON) {
      throw new Error("package.json not found");
    }
    this.parsedPackageJSON = JSON.parse(foundPackageJSON.code);
  }

  getEntryPoint(): string {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    return this.parsedPackageJSON!.main;
  }

  async loadNodeModules() {
    if (!this.parsedPackageJSON) {
      throw new Error("No parsed pkg.json found!");
    }

    const dependencies = this.parsedPackageJSON.dependencies;
    if (dependencies) {
      await this.moduleRegistry.fetchNodeModules(dependencies);
    }
  }

  async run() {
    this.processPackageJSON();
    await this.loadNodeModules();

    const entryPoint = this.getEntryPoint();
    console.log({ entryPoint, registry: this.moduleRegistry });
  }
}
