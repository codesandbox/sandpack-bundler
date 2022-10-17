type LoaderFn = () => Promise<any>;

const loaderCache: Map<string, Promise<any>> = new Map();

const BABEL_PRESET_LOADERS: Map<string, LoaderFn> = new Map([
  // [
  //   'solid',
  //   () => {
  //     // @ts-ignore
  //     return import('babel-preset-solid');
  //   },
  // ],
]);

const BABEL_PLUGIN_LOADERS: Map<string, LoaderFn> = new Map([
  // [
  //   'react-refresh/babel',
  //   () => {
  //     // @ts-ignore
  //     return import('react-refresh/babel');
  //   },
  // ],
  // [
  //   'solid-refresh/babel',
  //   () => {
  //     // @ts-ignore
  //     return import('solid-refresh/babel');
  //   },
  // ],
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
