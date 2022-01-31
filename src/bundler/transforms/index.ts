import { transform as jsTransform } from "./js";
import { transform as reactRefreshTransform } from "./react-refresh";
import { TransformerFn } from "./types";

export function getTransformers(): TransformerFn[] {
  return [jsTransform, reactRefreshTransform];
}
