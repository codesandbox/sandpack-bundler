// Based on https://github.com/facebook/create-react-app/tree/main/packages/react-error-overlay

type ErrorCallback = (error: Error) => void;

function errorHandler(callback: ErrorCallback, evt: Event & { error?: any }): void {
  if (!evt.error) {
    return;
  }

  const error = evt.error;
  if (error instanceof Error) {
    callback(error);
  } else {
    // A non-error was thrown, we don't have a trace. :(
    // Look in your browser's devtools for more information
    callback(new Error(error));
  }
}

export function registerUnhandledError(target: EventTarget, callback: ErrorCallback) {
  const boundErrorHandler = errorHandler.bind(undefined, callback);
  target.addEventListener('error', boundErrorHandler);
  return () => {
    target.removeEventListener('error', boundErrorHandler);
  };
}
