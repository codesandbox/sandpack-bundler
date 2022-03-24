import { SandpackError } from './SandpackError';

export class ModuleNotFoundError extends SandpackError {
  code = 'MODULE_NOT_FOUND';

  filepath: string;
  parent: string;

  constructor(filepath: string, parent: string) {
    super(`Cannot find module '${filepath}' from '${parent}'`);
    this.parent = parent;
    this.filepath = filepath;
  }
}
