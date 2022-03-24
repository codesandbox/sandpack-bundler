import { SandpackError } from './SandpackError';

export class BundlerError extends SandpackError {
  code = 'BUNDLER_ERROR';

  title: string;
  path?: string;
  column?: number;
  line?: number;

  constructor(message: string, path?: string) {
    super(message);

    this.title = 'Unknown error';
    this.message = message;
    this.path = path;
  }
}
