import * as babel from "@babel/standalone";
import * as reactRefreshBabel from "react-refresh/babel";
import { ITranspilationContext, ITranspilationResult } from "../Transformer";

import { collectDependencies } from "./dep-collector";

const reactRefresh = reactRefreshBabel.default ?? reactRefreshBabel;

babel.availablePlugins["react-refresh/babel"] = reactRefresh;

export async function transform(
  ctx: ITranspilationContext,
  config: any
): Promise<ITranspilationResult> {
  const requires: Set<string> = new Set();
  const transformed = babel.transform(ctx.code, {
    filename: ctx.module.filepath,
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
    plugins: [
      collectDependencies(requires),
      ["react-refresh/babel", { skipEnvCheck: true }],
    ],
    // no ast needed for now
    ast: false,
    sourceMaps: false,
    compact: true,
  });

  return {
    code: transformed.code,
    dependencies: requires,
  };
}
