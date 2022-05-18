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

import { Bundler } from '../bundler/bundler';
import { getLinesAround } from './get-lines-around';
import { SourceMap, getSourceMap } from './get-source-map';
import StackFrame from './stack-frame';

interface MapCacheEntry {
  filepath: string;
  fileSource: string;
  map?: SourceMap | null;
}

/**
 * Enhances a set of <code>StackFrame</code>s with their original positions and code (when available).
 * @param {StackFrame[]} frames A set of <code>StackFrame</code>s which contain (generated) code positions.
 * @param {number} [contextLines=3] The number of lines to provide before and after the line specified in the <code>StackFrame</code>.
 */
async function map(bundler: Bundler, frames: StackFrame[], contextLines: number = 3): Promise<StackFrame[]> {
  const cache: Record<string, MapCacheEntry> = {};
  const fileNames: Set<string> = new Set();
  frames.forEach((frame) => {
    const { fileName } = frame;
    if (fileName == null) {
      return;
    }
    fileNames.add(fileName);
  });

  await settle(
    Array.from(fileNames).map(async (fileName) => {
      if (!fileName.startsWith('webpack')) {
        // TODO: In case we ever support query parameters
        // if (fileName.includes('?')) {
        //   transpiledModule = manager.getTranspiledModuleByHash(
        //     fileName.split('?')[1]
        //   );
        // }

        const resolvedFilepath = await bundler.resolveAsync(fileName.replace(location.origin, ''), '/index.js');
        const foundModule = bundler.getModule(resolvedFilepath);

        if (foundModule) {
          const fileSource = foundModule.compiled || foundModule.source;
          if (fileSource) {
            const map = await getSourceMap(fileName, fileSource).catch(() => null);
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

    // There is no map we assume the positions are correct
    if (map == null) {
      if (filepath.includes('node_modules')) {
        return frame;
      } else {
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
    }

    // There is a sourcemap so we map to the original position
    const { source, line, column } = map.getOriginalPosition(lineNumber, columnNumber);
    const originalSource: string | string[] = source == null ? [] : map.getSource(source);
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
