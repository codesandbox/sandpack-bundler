/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

// @ts-ignore
import { settle } from 'settle-promise';

import { Bundler } from '../../bundler/bundler';
import { getLinesAround } from './get-lines-around';
import { SourceMap, getSourceMap } from './get-source-map';
import StackFrame from './stack-frame';

/**
 * Enhances a set of <code>StackFrame</code>s with their original positions and code (when available).
 * @param {StackFrame[]} frames A set of <code>StackFrame</code>s which contain (generated) code positions.
 * @param {number} [contextLines=3] The number of lines to provide before and after the line specified in the <code>StackFrame</code>.
 */
async function map(bundler: Bundler, frames: StackFrame[], contextLines: number = 3): Promise<StackFrame[]> {
  const cache: {
    [filename: string]: {
      filepath: string;
      fileSource: string;
      map?: SourceMap;
    };
  } = {};
  const fileNames: Set<string> = new Set();
  frames.forEach((frame) => {
    const { fileName } = frame;
    if (fileName == null) {
      return;
    }
    fileNames.add(fileName.replace(location.origin, ''));
  });

  console.log(fileNames);

  await settle(
    Array.from(fileNames).map(async (fileName) => {
      if (!fileName.startsWith('webpack')) {
        // TODO: In case we ever support query parameters
        // if (fileName.includes('?')) {
        //   transpiledModule = manager.getTranspiledModuleByHash(
        //     fileName.split('?')[1]
        //   );
        // }

        const resolvedFilepath = await bundler.resolveAsync(fileName, '/index.js');
        const foundModule = bundler.getModule(resolvedFilepath);

        if (foundModule) {
          const fileSource = foundModule.source && foundModule.compiled;
          if (fileSource) {
            const map = await getSourceMap(fileName, fileSource);
            cache[fileName] = { filepath: resolvedFilepath, fileSource, map };
          }
        }
      }
    })
  );

  return frames.map((frame) => {
    const { functionName, fileName, lineNumber, columnNumber } = frame;

    // Unknown file, returning original frame
    if (!fileName) {
      return frame;
    }

    // Try to get file source info from cache
    const { map, fileSource, filepath } = cache[fileName] || {};

    // File not known to sandpack, returning original frame
    if (!filepath || lineNumber == null || columnNumber == null) {
      return frame;
    }

    // There is no map so we assume the positions are correct
    if (map == null) {
      return new StackFrame(
        functionName,
        fileName,
        lineNumber,
        columnNumber,
        getLinesAround(lineNumber, contextLines, fileSource),
        functionName,
        filepath,
        lineNumber,
        columnNumber,
        getLinesAround(lineNumber, contextLines, fileSource)
      );
    }

    // There is a sourcemap so we map to the original position
    const { source, line, column } = map.getOriginalPosition(lineNumber, columnNumber);
    const originalSource = source == null ? [] : map.getSource(source);
    return new StackFrame(
      functionName,
      fileName,
      lineNumber,
      columnNumber,
      getLinesAround(lineNumber, contextLines, fileSource),
      functionName,
      source,
      line,
      column,
      getLinesAround(line, contextLines, originalSource)
    );
  });
}

export { map };
export default map;
