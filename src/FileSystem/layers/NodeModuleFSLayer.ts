import { retryFetch } from '../../utils/fetch';
import { ModuleRegistry } from '../../bundler/module-registry';
import { FSLayer } from '../FSLayer';

const MODULE_PATH_RE = /^\/node_modules\/(@[^/]+\/[^/]+|[^@/]+)(.*)$/;

function getUnpkgSpecifier(moduleName: string, moduleVersion: string, path: string): string {
  return `${moduleName}@${moduleVersion}/${path}`;
}

export class NodeModuleFSLayer extends FSLayer {
  private unpkgPromises: Map<string, Promise<string>> = new Map();
  private unpkgCache: Map<string, string | false> = new Map();

  constructor(private registry: ModuleRegistry) {
    super('node-module-fs');
  }

  async _fetchUnpkgFile(specifier: string): Promise<string> {
    try {
      const response = await retryFetch(`https://unpkg.com/${specifier}`);
      if (!response.ok) {
        throw new Error(`Could not fetch ${specifier} from unpkg`);
      }
      const content = await response.text();
      this.unpkgCache.set(specifier, content);
      return content;
    } catch (err) {
      this.unpkgCache.set(specifier, false);
      throw err;
    }
  }

  fetchUnpkgFile(moduleName: string, moduleVersion: string, path: string): Promise<string> {
    const specifier = getUnpkgSpecifier(moduleName, moduleVersion, path);
    const cachedContent = this.unpkgCache.get(specifier);
    if (typeof cachedContent === 'string') {
      return Promise.resolve(cachedContent);
    } else if (cachedContent === false) {
      return Promise.reject('unpkg file not found');
    }

    const promise = this.unpkgPromises.get(specifier) || this._fetchUnpkgFile(specifier);
    this.unpkgPromises.set(specifier, promise);
    return promise;
  }

  getUnpkgFile(moduleName: string, moduleVersion: string, path: string): string {
    const specifier = getUnpkgSpecifier(moduleName, moduleVersion, path);
    const cachedContent = this.unpkgCache.get(specifier);
    if (typeof cachedContent === 'string') {
      return cachedContent;
    }
    throw new Error('File not found in unpkg cache');
  }

  /** Turns a path into [moduleName, relativePath] */
  private getModuleFromPath(path: string): [string, string] {
    const parts = path.match(MODULE_PATH_RE);
    if (!parts) {
      throw new Error('Path is not a node_module');
    }
    const moduleName = parts[1];
    const modulePath: string = parts[2] ?? '';
    return [moduleName, modulePath.substring(1)];
  }

  readFileSync(path: string): string {
    const [moduleName, modulePath] = this.getModuleFromPath(path);
    const module = this.registry.modules.get(moduleName);
    if (module) {
      const foundFile = module.files[modulePath];
      if (foundFile) {
        if (typeof foundFile === 'object') {
          return foundFile.c;
        } else {
          return this.getUnpkgFile(moduleName, module.version, modulePath);
        }
      }
    }
    throw new Error(`Module ${path} not found`);
  }

  async readFileAsync(path: string): Promise<string> {
    const [moduleName, modulePath] = this.getModuleFromPath(path);
    await this.registry.ensureModule(moduleName);
    const module = this.registry.modules.get(moduleName);
    if (module) {
      const foundFile = module.files[modulePath];
      if (foundFile) {
        if (typeof foundFile === 'object') {
          return foundFile.c;
        }

        return this.fetchUnpkgFile(moduleName, module.version, modulePath);
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
    const [moduleName] = this.getModuleFromPath(path);
    return this.registry.ensureModule(moduleName).then(() => this.isFileSync(path));
  }
}
