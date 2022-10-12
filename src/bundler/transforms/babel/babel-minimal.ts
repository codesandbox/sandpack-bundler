import { transformSync } from '@babel/core';
import pluginCommonJs from '@babel/plugin-transform-modules-commonjs';
import presetReact from '@babel/preset-react';
import pluginReactRefresh from 'react-refresh/babel';

import * as logger from '../../../utils/logger';
import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';
import { collectDependencies } from './dep-collector';

export interface ITransformData {
  code: string;
  filepath: string;
  config: any;
}

async function transform({ code, filepath }: ITransformData): Promise<ITranspilationResult> {
  const requires: Set<string> = new Set();

  let transformed = transformSync(code, {
    filename: filepath,
    presets: [[presetReact, { runtime: 'automatic' }]],
    plugins: [[pluginReactRefresh, { skipEnvCheck: true }], pluginCommonJs, collectDependencies(requires)],
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
