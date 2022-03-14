import { BundlerError } from "./BundlerError";
import { CompilationError } from "./CompileError";

export const errorMessage = (error: BundlerError) => {
  const defaultMessage = {
    type: "action",
    action: "show-error",

    title: error.title,
    path: error.path,
    message: error.message,
    payload: { frames: [] },
  };

  if (error instanceof CompilationError) {
    return {
      ...defaultMessage,
      line: error.line,
      column: error.column,
    };
  }

  return defaultMessage;
};
