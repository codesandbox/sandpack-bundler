// Based on https://github.com/facebook/create-react-app/tree/main/packages/react-error-overlay

const MAX_STACK_LENGTH: number = 50;

export function registerStackTraceLimit(limit: number = MAX_STACK_LENGTH) {
  try {
    Error.stackTraceLimit = limit;
  } catch (e) {
    // Not all browsers support this so we don't care if it errors
  }
}
