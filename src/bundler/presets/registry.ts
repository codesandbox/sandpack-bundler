import { Preset } from './Preset';
import { ReactPreset } from './react/ReactPreset';
import { SolidPreset } from './solid/SolidPreset';

const PRESET_MAP: Map<string, Preset> = new Map([
  ['react', new ReactPreset()],
  ['solid', new SolidPreset()],
]);

export function getPreset(presetName: string): Preset {
  return PRESET_MAP.get(presetName) ?? new ReactPreset();
}
