
import {transformSync} from "@babel/core"
import presetReact from "@babel/preset-react";

import * as logger from '../../../utils/logger';
import { WorkerMessageBus } from '../../../utils/WorkerMessageBus';
import { ITranspilationResult } from '../Transformer';


export interface ITransformData {
  code: string;
  filepath: string;
  config: any;
}




async function transform({ code, filepath, config }: ITransformData): Promise<ITranspilationResult> {

  let transformed = transformSync(code, {
    filename: filepath,
    presets:[presetReact],
    plugins:[],
    // no ast needed for now
    ast: false,
    sourceMaps: 'inline',
    compact: /node_modules/.test(filepath),
  });
  
  console.log(transformed)

  // no-op module
  if (!transformed?.code) {
      transformed = {}
    transformed.code = 'module.exports = {};';
  }

  return {
    code: transformed?.code??"",
    dependencies: new Set()
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
