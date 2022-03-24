import { BundlerError } from './BundlerError';

interface IParsedError {
  message: string;
  line: number;
  column: number;
}

const parseError = (error: any): IParsedError => {
  if (error.loc) {
    return {
      message: error.message,
      line: error.loc.line,
      column: error.loc.column,
    };
  }

  return {
    message: error.message,
    line: 1,
    column: 1,
  };
};

export class CompilationError extends BundlerError {
  code = 'COMPILATION_ERROR';

  constructor(error: Error, path: string) {
    super(error.message);

    const { column, line, message } = parseError(error);

    this.title = 'Compilation error';
    this.message = message;
    this.column = column;
    this.line = line;
    this.path = path;
  }
}
