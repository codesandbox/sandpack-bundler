import type { PluginItem } from '@babel/core';
import * as babel from '@babel/standalone';

import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';
import { loadPlugin, loadPreset } from './babel-plugin-registry';
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

// TODO: Normalize preset names
async function getPresets(presets: any): Promise<PluginItem[]> {
  const result: PluginItem[] = ['env', 'typescript'];
  if (!Array.isArray(presets)) {
    return result;
  }
  for (const preset of presets) {
    const presetName = getNameFromConfigEntry(preset);
    if (presetName !== null) {
      if (!babel.availablePresets[presetName]) {
        babel.availablePresets[presetName] = await loadPreset(presetName);
      }

      const foundIndex = result.findIndex((v) => getNameFromConfigEntry(v) === presetName);
      if (foundIndex > -1) {
        result[foundIndex] = preset;
        continue;
      }
    }
    result.push(preset);
  }
  return result;
}

// TODO: Normalize plugin names
async function getPlugins(plugins: any): Promise<PluginItem[]> {
  const result: PluginItem[] = [];
  if (!Array.isArray(plugins)) {
    return result;
  }
  for (const plugin of plugins) {
    const pluginName = getNameFromConfigEntry(plugin);
    if (pluginName !== null) {
      if (!babel.availablePlugins[pluginName]) {
        babel.availablePlugins[pluginName] = await loadPlugin(pluginName);
      }

      const foundIndex = result.findIndex((v) => getNameFromConfigEntry(v) === pluginName);
      if (foundIndex > -1) {
        result[foundIndex] = plugin;
        continue;
      }
    }
    result.push(plugin);
  }
  return result;
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
    sourceMaps: false,
    compact: true,
  });

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
