import * as babel from "@babel/standalone";

import { ITranspilationContext, ITranspilationResult } from "../types";
import { collectDependencies } from "./dep-collector";

export async function transform(
  ctx: ITranspilationContext
): Promise<ITranspilationResult> {
  const requires: Set<string> = new Set();
  const transformed = babel.transform(ctx.code, {
    filename: ctx.filepath,
    presets: [
      "env",
      "typescript",
      [
        "react",
        {
          runtime: "automatic",
        },
      ],
    ],
    plugins: [collectDependencies(requires)],
    ast: true,
  });

  return {
    code: transformed.code,
    dependencies: requires,
  };
}
