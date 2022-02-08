import { Preset } from "./Preset";
import { ReactPreset } from "./react/ReactPreset";

const PRESET_MAP: Map<string, Preset> = new Map([["react", new ReactPreset()]]);

export function getPreset(presetName: string): Preset {
  return PRESET_MAP.get(presetName) ?? new ReactPreset();
}
