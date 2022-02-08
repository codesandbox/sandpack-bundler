import { Module } from "../module/Module";
import { Transformer } from "../transforms/Transformer";

export class Preset {
  private transformers = new Map<string, Transformer>();

  constructor(public name: string) {}

  async registerTransformer(transfomer: Transformer): Promise<void> {
    await transfomer.init();
    this.transformers.set(transfomer.id, transfomer);
  }

  getTransformer(id: string): Transformer | undefined {
    return this.transformers.get(id);
  }

  async init(): Promise<void> {
    throw new Error("Not implemented");
  }

  mapTransformers(module: Module): Array<[string, any]> {
    throw new Error("Not implemented");
  }

  getTransformers(module: Module): Array<[Transformer, any]> {
    const transformersMap = this.mapTransformers(module);
    return transformersMap.map((t) => {
      const transformer = this.getTransformer(t[0]);
      if (!transformer) {
        throw new Error(`Transformer ${t[0]} not found`);
      }
      return [transformer, t[1]];
    });
  }
}
