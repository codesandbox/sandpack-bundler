import { Module } from "../../module/Module";
import { Preset } from "../Preset";

export class ReactPreset extends Preset {
  constructor() {
    super("react");
  }

  async init(): Promise<void> {
    const [{ BabelTransformer }, { ReactRefreshTransformer }] =
      await Promise.all([
        import("../../transforms/babel/index"),
        import("../../transforms/react-refresh/index"),
      ]);
    this.registerTransformer(new BabelTransformer());
    this.registerTransformer(new ReactRefreshTransformer());
  }

  mapTransformers(module: Module): Array<[string, any]> {
    if (/^(?!\/node_modules\/).*\.(((m|c)?jsx?)|tsx)$/.test(module.filepath)) {
      return [
        ["babel-transformer", {}],
        ["react-refresh-transformer", {}],
      ];
    }

    if (
      /\.(m|c)?(t|j)sx?$/.test(module.filepath) &&
      !module.filepath.endsWith(".d.ts")
    ) {
      return [["babel-transformer", {}]];
    }

    if (/\.css$/.test(module.filepath)) {
      return [["css-transformer", {}]];
    }

    throw new Error(`No transformer for ${module.filepath}`);
  }
}
