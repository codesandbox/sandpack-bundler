import { transform as jsTransform } from "./js";
import { TransformerFn } from "./types";

export function getTransformers(): TransformerFn[] {
  return [jsTransform];
}
