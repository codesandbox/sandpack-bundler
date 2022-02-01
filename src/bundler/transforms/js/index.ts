import * as babel from "@babel/standalone";
import * as reactRefreshBabel from "react-refresh/babel";

import { ITranspilationContext, ITranspilationResult } from "../types";
import { collectDependencies } from "./dep-collector";

const reactRefresh = reactRefreshBabel.default ?? reactRefreshBabel;

babel.availablePlugins["react-refresh/babel"] = reactRefresh;

export async function transform(
  ctx: ITranspilationContext
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
    ast: true,
  });

  return {
    code: transformed.code,
    dependencies: requires,
  };
}
