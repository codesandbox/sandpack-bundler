import * as logger from '../../utils/logger';
import { sortObj } from '../../utils/object';
import { Bundler } from '../bundler';
import { Module } from '../module/Module';
import { filterBuildDeps } from './build-dep';
import { ICDNModuleFile, IResolvedDependency, fetchManifest, fetchModule } from './module-cdn';
import { NodeModule } from './NodeModule';

// dependency => version range
export type DepMap = { [depName: string]: string };

export class ModuleRegistry {
  modules: Map<string, NodeModule> = new Map();
  moduleDownloadPromises: Map<string, Promise<NodeModule>> = new Map();

  manifest: IResolvedDependency[] = [];

  bundler: Bundler;

  constructor(bundler: Bundler) {
    this.bundler = bundler;
  }

  async fetchManifest(deps: DepMap, shouldFilterBuildDeps = true): Promise<void> {
    if (shouldFilterBuildDeps) {
      deps = filterBuildDeps(deps);
    }

    const sortedDeps = sortObj(deps);
    logger.debug('Fetching manifest', sortedDeps);
    this.manifest = await fetchManifest(sortedDeps);
    logger.debug('fetched manifest', this.manifest);
  }

  async preloadModules(): Promise<void> {
    await Promise.all(
      this.manifest.map((dep) => {
        return this.fetchNodeModule(dep.n, dep.v);
      })
    );
  }

  private async _fetchModule(name: string, version: string): Promise<NodeModule> {
    const module = await fetchModule(name, version);
    const processedNodeModule = new NodeModule(name, version, module.f, module.m);
    this.modules.set(name, processedNodeModule);
    logger.debug('fetched module', name, version, module);
    return processedNodeModule;
  }

  async fetchNodeModule(name: string, version: string): Promise<NodeModule> {
    // Module already found, skip fetching
    // This could also check version, but for now this is fine
    // as we don't allow multiple versions of the same module right now
    const foundModule = this.modules.get(name);
    if (foundModule) {
      return foundModule;
    }

    const cacheKey = `${name}::${version}`;
    let promise = this.moduleDownloadPromises.get(cacheKey);
    if (!promise) {
      promise = this._fetchModule(name, version).finally(() => this.moduleDownloadPromises.delete(cacheKey));
      this.moduleDownloadPromises.set(cacheKey, promise);
    }
    return promise;
  }

  private _writePrecompiledModule(path: string, file: ICDNModuleFile): Array<() => Promise<void>> {
    if (this.bundler.modules.has(path)) {
      return [];
    }

    const module = new Module(path, file.c, true, this.bundler);
    this.bundler.modules.set(path, module);
    return file.d.map((dep) => {
      return async () => {
        await module.addDependency(dep);

        for (let dep of module.dependencies) {
          this.bundler.transformModule(dep);
        }
      };
    });
  }

  async loadModuleDependencies() {
    const depPromises = [];
    for (let [moduleName, nodeModule] of this.modules) {
      for (let [fileName, file] of Object.entries(nodeModule.files)) {
        if (typeof file === 'object') {
          const promises = this._writePrecompiledModule(`/node_modules/${moduleName}/${fileName}`, file);
          depPromises.push(...promises);
        }
      }
    }
    await Promise.all(depPromises.map((fn) => fn()));
  }
}
