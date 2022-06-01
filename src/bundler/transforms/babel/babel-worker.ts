import type { PluginItem, PluginOptions } from '@babel/core';

import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';
import { loadPlugin, loadPreset } from './babel-plugin-registry';
import * as babel from './babel-transform-runner';
import { collectDependencies } from './dep-collector';

export interface ITransformData {
  code: string;
  filepath: string;
  config: any;
}

function getNameFromConfigEntry(entry: any): string | null {
  if (typeof entry === 'string') {
    return entry;
  } else if (Array.isArray(entry) && typeof entry[0] === 'string') {
    return entry[0];
  } else {
    return null;
  }
}

export type MappedPluginTarget = object | ((...args: any[]) => any);
export type MappedPluginItem = MappedPluginTarget | [MappedPluginTarget, PluginOptions];

function getDefaultExport(module: any) {
  if (typeof module.default !== 'undefined') {
    return module.default;
  } else {
    return module;
  }
}

function mapPluginItem(item: string | [string, PluginOptions], plugin: MappedPluginTarget): MappedPluginItem {
  if (Array.isArray(item)) {
    return [getDefaultExport(plugin), item[1]];
  } else {
    return plugin;
  }
}

// TODO: Normalize preset names
async function getPresets(presets: PluginItem[] = []): Promise<MappedPluginItem[]> {
  const input: PluginItem[] = [
    // [
    //   'env',
    //   {
    //     targets: '> 2.5%, not ie 11, not dead, not op_mini all',
    //     useBuiltIns: 'usage',
    //     corejs: '3.22',
    //     exclude: ['@babel/plugin-transform-regenerator'],
    //   },
    // ],
    ...presets,
    'flow',
    'typescript',
  ];

  return Promise.all<MappedPluginItem[]>(
    input.map(async (preset) => {
      const presetName = getNameFromConfigEntry(preset);
      if (presetName !== null) {
        const loadedPreset = await loadPreset(presetName);
        return mapPluginItem(preset as any, loadedPreset);
      } else {
        return preset as MappedPluginItem;
      }
    })
  );
}

// TODO: Normalize plugin names
async function getPlugins(plugins: PluginItem[] = []): Promise<PluginItem[]> {
  const input: PluginItem[] = [
    ...plugins,
    'transform-modules-commonjs',
    [
      'polyfill-corejs3',
      {
        method: 'usage-global',
        version: '3.22',
        // maybe?
        // proposals: true,
        shippedProposals: true,
      },
    ],
  ];

  return Promise.all<MappedPluginItem[]>(
    input.map(async (plugin) => {
      const pluginName = getNameFromConfigEntry(plugin);
      if (pluginName !== null) {
        const loadedPlugin = await loadPlugin(pluginName);
        return mapPluginItem(plugin as any, loadedPlugin);
      } else {
        return plugin as MappedPluginItem;
      }
    })
  );
}

async function transform({ code, filepath, config }: ITransformData): Promise<ITranspilationResult> {
  const requires: Set<string> = new Set();
  const presets = await getPresets(config?.presets ?? []);
  const plugins = await getPlugins(config?.plugins ?? []);
  plugins.push(collectDependencies(requires));
  const transformed = babel.transform(code, {
    filename: filepath,
    presets,
    plugins,
    // no ast needed for now
    ast: false,
    sourceMaps: 'inline',
    compact: /node_modules/.test(filepath),
  });

  if (!transformed) {
    throw new Error('Babel transform returned null');
  }

  // no-op module
  if (!transformed.code) {
    transformed.code = 'module.exports = {};';
  }

  return {
    code: transformed.code,
    dependencies: requires,
  };
}

new WorkerMessageBus({
  channel: 'sandpack-babel',
  endpoint: self,
  handleNotification: () => Promise.resolve(),
  handleRequest: (method, data) => {
    switch (method) {
      case 'transform':
        return transform(data);
      default:
        return Promise.reject(new Error('Unknown method'));
    }
  },
  handleError: (err) => {
    console.error(err);
    return Promise.resolve();
  },
  timeoutMs: 30000,
});
