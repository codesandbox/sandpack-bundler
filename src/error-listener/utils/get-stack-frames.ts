/**
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Bundler } from '../../bundler/bundler';
import { map } from './mapper';
import { parse } from './parser';
import type { StackFrame } from './stack-frame';
import { unmap } from './unmapper';

export async function getStackFrames(
  bundler: Bundler,
  error: Error,
  contextSize: number = 3
): Promise<StackFrame[] | null> {
  const parsedFrames = parse(error);
  let enhancedFrames;
  // @ts-ignore
  if (error.__unmap_source) {
    enhancedFrames = await unmap(
      // @ts-ignore
      error.__unmap_source,
      parsedFrames,
      contextSize
    );
  } else {
    enhancedFrames = await map(bundler, parsedFrames, contextSize);
  }

  // if (
  //   enhancedFrames
  //     .map((f) => {
  //       return f._originalFileName;
  //     })
  //     .filter((f) => {
  //       return f != null && f.indexOf('node_modules') === -1;
  //     }).length === 0
  // ) {
  //   return null;
  // }

  return enhancedFrames.filter(({ functionName }) => {
    return functionName == null || functionName.indexOf('__stack_frame_overlay_proxy_console__') === -1;
  });
}
