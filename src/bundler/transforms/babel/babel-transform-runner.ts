/// <reference lib="dom" />

import { Node, TransformOptions, transformFromAstSync, transformSync } from '@babel/core';

/**
 * Parses plugin names and presets from the specified options.
 */
function processOptions(options: TransformOptions): TransformOptions {
  return {
    babelrc: false,
    ...options,
  };
}

export function transform(code: string, options: TransformOptions) {
  return transformSync(code, processOptions(options));
}

export function transformFromAst(ast: Node, code: string, options: TransformOptions) {
  return transformFromAstSync(ast, code, processOptions(options));
}
