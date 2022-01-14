import { ModuleRegistry } from "../../module-registry";
import { FSLayer } from "../FSLayer";

const MODULE_PATH_RE = /^\/node_modules\/(@[^/]+\/[^/]+|[^@/]+)(.*)$/;

export class NodeModuleFSLayer extends FSLayer {
  constructor(private registry: ModuleRegistry) {
    super("node-module-fs");
  }

  /** Turns a path into [moduleName, relativePath] */
  private getModuleFromPath(path: string): [string, string] {
    const parts = path.match(MODULE_PATH_RE);
    if (!parts) {
      throw new Error("Path is not a node_module");
    }
    const moduleName = parts[1];
    const modulePath: string = parts[2] ?? "";
    return [moduleName, modulePath.substring(1)];
  }

  readFileSync(path: string): string {
    const [moduleName, modulePath] = this.getModuleFromPath(path);
    const module = this.registry.modules.get(moduleName);
    if (module) {
      const foundFile = module.files[modulePath];
      if (typeof foundFile === "object") {
        return foundFile.c;
      }
    }
    throw new Error(`Module ${path} not found`);
  }

  async readFileAsync(path: string): Promise<string> {
    const [moduleName, modulePath] = this.getModuleFromPath(path);
    const module = this.registry.modules.get(moduleName);
    if (module) {
      const foundFile = module.files[modulePath];
      if (typeof foundFile === "object") {
        return foundFile.c;
      }
    }
    throw new Error(`Module ${path} not found`);
  }

  isFileSync(path: string): boolean {
    try {
      const [moduleName, modulePath] = this.getModuleFromPath(path);
      const module = this.registry.modules.get(moduleName);
      if (module) {
        return module.files[modulePath] != null;
      }
    } catch (err) {
      // do nothing...
    }
    return false;
  }

  isFileAsync(path: string): Promise<boolean> {
    return Promise.resolve(this.isFileSync(path));
  }
}
