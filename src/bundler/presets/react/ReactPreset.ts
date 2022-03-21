import { Bundler } from '../../bundler';
import { Module } from '../../module/Module';
import { BabelTransformer } from '../../transforms/babel';
import { CSSTransformer } from '../../transforms/css';
import { ReactRefreshTransformer } from '../../transforms/react-refresh';
import { StyleTransformer } from '../../transforms/style';
import { Preset } from '../Preset';

const INTEGRATIONS: Record<string, Record<string, (messageBus: IFrameParentMessageBus) => Promise<void>>> = {
  devtools: {
    legacy: initializeReactDevToolsLegacy,
    latest: initializeReactDevToolsLegacy, // TODO
  },
};

export class ReactPreset extends Preset {
  defaultHtmlBody = '<div id="root"></div>';

  constructor() {
    super('react');
  }

  async init(bundler: Bundler): Promise<void> {
    await super.init(bundler);

    await Promise.all([
      this.loadIntegrations(bundler.integrations),
      this.registerTransformer(new BabelTransformer()),
      this.registerTransformer(new ReactRefreshTransformer()),
      this.registerTransformer(new CSSTransformer()),
      this.registerTransformer(new StyleTransformer()),
    ]);
  }

  async loadIntegrations(integrations: Integrations) {
    logger.info('Loading preset integrations...');

    integrations.forEach(async (value, key) => {
      await INTEGRATIONS?.[key]?.[value.version]?.(value.messageBus);
    });
  }

  mapTransformers(module: Module): Array<[string, any]> {
    if (/^(?!\/node_modules\/).*\.(((m|c)?jsx?)|tsx)$/.test(module.filepath)) {
      return [
        ['babel-transformer', {}],
        ['react-refresh-transformer', {}],
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
