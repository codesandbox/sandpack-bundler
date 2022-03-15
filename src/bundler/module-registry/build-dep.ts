import { DepMap } from './index';

const BUILD_DEPS = new Set(['parcel', 'parcel-bundler', 'vite', '@babel/core', 'react-scripts']);
const BUILD_DEP_REGEXES = [
  /babel-plugin.*/,
  /@babel\/plugin.*/,
  /babel-preset.*/,
  /@babel\/preset.*/,
  /.*parcel-plugin.*/,
];

export function isBuildDep(name: string): boolean {
  if (BUILD_DEPS.has(name)) {
    return true;
  }

  for (let regex of BUILD_DEP_REGEXES) {
    if (regex.test(name)) {
      return true;
    }
  }

  return false;
}

export function filterBuildDeps(deps: DepMap): DepMap {
  const results: DepMap = {};
  for (let key in deps) {
    if (!isBuildDep(key)) {
      results[key] = deps[key];
    }
  }
  return results;
}
