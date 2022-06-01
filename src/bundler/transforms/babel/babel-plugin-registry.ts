// @ts-nocheck
import transformCommonJSPlugin from '@babel/plugin-transform-modules-commonjs';
import flowPreset from '@babel/preset-flow';
import reactPreset from '@babel/preset-react';
import typescriptPreset from '@babel/preset-typescript';
import typescriptPreset from '@babel/preset-typescript';
import polyfillCoreJS3Plugin from 'babel-plugin-polyfill-corejs3';
import reactRefreshPlugin from 'react-refresh/babel';

type LoaderFn = () => Promise<any>;

const loaderCache: Map<string, Promise<any>> = new Map();

const BABEL_PRESET_LOADERS: Map<string, LoaderFn> = new Map([
  ['solid', () => import('babel-preset-solid')],
  ['typescript', () => Promise.resolve(typescriptPreset)],
  ['react', () => Promise.resolve(reactPreset)],
  ['flow', () => Promise.resolve(flowPreset)],
]);

const BABEL_PLUGIN_LOADERS: Map<string, LoaderFn> = new Map([
  ['react-refresh/babel', () => Promise.resolve(reactRefreshPlugin)],
  ['solid-refresh/babel', () => import('solid-refresh/babel')],
  ['polyfill-corejs3', () => Promise.resolve(polyfillCoreJS3Plugin)],
  ['transform-modules-commonjs', () => Promise.resolve(transformCommonJSPlugin)],
]);

function load(key: string, loader: LoaderFn): Promise<any> {
  let cached = loaderCache.get(key);
  if (!cached) {
    cached = loader().then((val) => val.default ?? val);
    loaderCache.set(key, cached);
  }
  return cached;
}

export function loadPreset(name: string): Promise<any> {
  const foundLoader = BABEL_PRESET_LOADERS.get(name);
  if (!foundLoader) {
    return Promise.reject(new Error(`Preset loader ${name} not found`));
  }
  return load(`preset-${name}`, foundLoader);
}

export function loadPlugin(name: string): Promise<any> {
  const foundLoader = BABEL_PLUGIN_LOADERS.get(name);
  if (!foundLoader) {
    return Promise.reject(new Error(`Plugin loader ${name} not found`));
  }
  return load(`plugin-${name}`, foundLoader);
}
