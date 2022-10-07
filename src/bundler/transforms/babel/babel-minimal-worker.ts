import { transformSync } from '@babel/core';
import type { PluginItem } from '@babel/core';
import presetReact from '@babel/preset-react';

import * as logger from '../../../utils/logger';
import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';
import { loadPlugin } from './babel-plugin-registry';
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

  requires.add('react-refresh/runtime');
  // const plugins = await getPlugins(config?.plugins ?? []);
  // plugins.push(collectDependencies(requires));

  let transformed = transformSync(code, {
    filename: filepath,
    presets: [presetReact],
    plugins: [],
    // no ast needed for now
    ast: false,
    sourceMaps: 'inline',
    compact: /node_modules/.test(filepath),
  });

  // no-op module
  if (!transformed?.code) {
    transformed = {};
    transformed.code = 'module.exports = {};';
  }

  return {
    code: transformed?.code ?? '',
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
    logger.error(err);
    return Promise.resolve();
  },
  timeoutMs: 30000,
});
