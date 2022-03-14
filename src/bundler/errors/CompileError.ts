import { BundlerError } from "./BundlerError";

export class CompilationError extends BundlerError {
  constructor(error: Error, path: string) {
    super(error);

    const { column, line, message } = this.formatter(error);

    this.title = "Compilation error";
    this.message = message;
    this.column = column;
    this.line = line;
    this.path = path;
  }

  static fromBabelError(error: Error) {
    const babelMatched = error.stack?.match(/(\d+):(\d+)/);

    if (babelMatched) {
      return {
        message: error.message,
        line: parseInt(babelMatched[1], 10),
        column: parseInt(babelMatched[2], 10),
      };
    }

    return undefined;
  }

  private formatter(error: Error) {
    const babelError = CompilationError.fromBabelError(error);
    if (babelError) {
      return babelError;
    }

    return {
      message: error.message,
      line: 1,
      column: 1,
    };
  }
}
