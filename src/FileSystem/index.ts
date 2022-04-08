import gensync, { Gensync } from 'gensync';

import { FSLayer } from './FSLayer';

export class FileSystem {
  // path => content
  readFile: Gensync<(filepath: string) => string>;
  isFile: Gensync<(filepath: string) => boolean>;
  layers: FSLayer[];

  constructor(layers: FSLayer[]) {
    this.layers = layers;
    this.readFile = gensync({
      sync: this.readFileSync.bind(this),
      async: this.readFileAsync.bind(this),
    });
    this.isFile = gensync({
      sync: this.isFileSync.bind(this),
      async: this.isFileAsync.bind(this),
    });
  }

  resetCache(): void {
    for (const layer of this.layers) {
      layer.resetCache();
    }
  }

  writeFile(path: string, content: string): void {
    for (let layer of this.layers) {
      if (layer.shouldSkipLayer(path)) continue;

      layer.writeFile(path, content);
    }
  }

  readFileSync(path: string): string {
    let lastError = null;
    for (let layer of this.layers) {
      if (layer.shouldSkipLayer(path)) continue;

      try {
        const result = layer.readFileSync(path);
        return result;
      } catch (err) {
        lastError = err;
      }
    }

    if (!lastError) {
      lastError = new Error(`File ${path} not found`);
    }

    throw lastError;
  }

  async readFileAsync(path: string): Promise<string> {
    let lastError = null;
    for (let layer of this.layers) {
      if (layer.shouldSkipLayer(path)) continue;

      try {
        const result = await layer.readFileAsync(path);
        return result;
      } catch (err) {
        lastError = err;
      }
    }

    if (!lastError) {
      lastError = new Error(`File ${path} not found`);
    }

    throw lastError;
  }

  isFileSync(path: string): boolean {
    for (let layer of this.layers) {
      if (layer.shouldSkipLayer(path)) continue;

      try {
        if (layer.isFileSync(path)) {
          return true;
        }
      } catch (err) {
        console.error(err);
      }
    }
    return false;
  }

  async isFileAsync(path: string): Promise<boolean> {
    for (let layer of this.layers) {
      if (layer.shouldSkipLayer(path)) continue;
      
      try {
        const exists = await layer.isFileAsync(path);
        if (exists) {
          return true;
        }
      } catch (err) {
        console.error(err);
      }
    }
    return false;
  }
}
