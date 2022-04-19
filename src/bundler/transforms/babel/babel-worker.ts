import * as babel from '@babel/standalone';
// @ts-ignore
import * as solidBabelPreset from 'babel-preset-solid';
// @ts-ignore
import * as reactRefreshBabel from 'react-refresh/babel';

import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';
import { collectDependencies } from './dep-collector';

const reactRefresh = reactRefreshBabel.default ?? reactRefreshBabel;

babel.availablePlugins['react-refresh/babel'] = reactRefresh;
babel.availablePresets['solid'] = solidBabelPreset;

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
function getPresets(presets: any) {
  const result = ['env', 'typescript'];
  if (!Array.isArray(presets)) {
    return result;
  }
  for (const preset of presets) {
    const presetName = getNameFromConfigEntry(preset);
    if (presetName !== null) {
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
function getPlugins(requires: Set<string>, plugins: any) {
  const result = [collectDependencies(requires)];
  if (!Array.isArray(plugins)) {
    return result;
  }
  for (const plugin of plugins) {
    const pluginName = getNameFromConfigEntry(plugin);
    if (pluginName !== null) {
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
  const transformed = babel.transform(code, {
    filename: filepath,
    presets: getPresets(config?.presets ?? []),
    plugins: getPlugins(requires, config?.plugins ?? []),
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
