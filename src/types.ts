import { DepMap } from './bundler/module-registry';

export interface ISandboxFile {
  path: string;
  code: string;
}

export interface IPackageJSON {
  main?: string;
  module?: string;
  source?: string;
  dependencies?: DepMap;
}
