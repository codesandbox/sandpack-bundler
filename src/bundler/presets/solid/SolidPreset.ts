import { Bundler } from '../../bundler';
import { Module } from '../../module/Module';
import { BabelTransformer } from '../../transforms/babel';
import { CSSTransformer } from '../../transforms/css';
import { StyleTransformer } from '../../transforms/style';
import { Preset } from '../Preset';

export class SolidPreset extends Preset {
  defaultHtmlBody = '<div id="app"></div>';

  constructor() {
    super('solid');
  }

  async init(bundler: Bundler): Promise<void> {
    await super.init(bundler);

    await Promise.all([
      this.registerTransformer(new BabelTransformer()),
      this.registerTransformer(new CSSTransformer()),
      this.registerTransformer(new StyleTransformer()),
    ]);
  }

  mapTransformers(module: Module): Array<[string, any]> {
    if (/^(?!\/node_modules\/).*\.(((m|c)?jsx?)|tsx)$/.test(module.filepath)) {
      return [
        [
          'babel-transformer',
          {
            presets: ['solid'],
          },
        ],
      ];
    }

    if (/\.(m|c)?(t|j)sx?$/.test(module.filepath) && !module.filepath.endsWith('.d.ts')) {
      return [['babel-transformer', {}]];
    }

    if (/\.css$/.test(module.filepath)) {
      return [
        ['css-transformer', {}],
        ['style-transformer', {}],
      ];
    }

    throw new Error(`No transformer for ${module.filepath}`);
  }
}
