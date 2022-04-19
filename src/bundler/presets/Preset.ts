import { Bundler } from '../bundler';
import { Module } from '../module/Module';
import { Transformer } from '../transforms/Transformer';

export class Preset {
  private transformers = new Map<string, Transformer>();
  private bundler: Bundler | null = null;

  defaultEntryPoints: string[] = ['index', 'src/index'];
  defaultHtmlBody: string = '';

  constructor(public name: string) {}

  async registerTransformer(transformer: Transformer): Promise<void> {
    if (!this.bundler) {
      throw new Error('Call Preset#init before registering transformers');
    }

    await transformer.init(this.bundler);
    this.transformers.set(transformer.id, transformer);
  }

  getTransformer(id: string): Transformer | undefined {
    return this.transformers.get(id);
  }

  async init(bundler: Bundler): Promise<void> {
    this.bundler = bundler;
  }

  mapTransformers(module: Module): Array<[string, any]> {
    throw new Error('Not implemented');
  }

  getTransformers(module: Module): Array<[Transformer, any]> {
    const transformersMap = this.mapTransformers(module);
    console.log(transformersMap);
    return transformersMap.map((val) => {
      const transformer = this.getTransformer(val[0]);
      if (!transformer) {
        throw new Error(`Transformer ${val[0]} not found`);
      }
      return [transformer, val[1]];
    });
  }
}
