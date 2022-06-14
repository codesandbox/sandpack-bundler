/* eslint-disable no-console */

// Based on https://github.com/facebook/create-react-app/tree/main/packages/react-error-overlay

type ReactFrame = {
  fileName: string | null;
  lineNumber: number | null;
  name: string | null;
};
const reactFrameStack: Array<ReactFrame[]> = [];

export type { ReactFrame };

// This is a stripped down barebones version of this proposal:
// https://gist.github.com/sebmarkbage/bdefa100f19345229d526d0fdd22830f
// We're implementing just enough to get the invalid element type warnings
// to display the component stack in React 15.6+:
// https://github.com/facebook/react/pull/9679
// / TODO: a more comprehensive implementation.

export function registerReactStack() {
  if (typeof console !== 'undefined') {
    // @ts-ignore
    console.reactStack = (frames) => reactFrameStack.push(frames);
    // @ts-ignore
    console.reactStackEnd = (frames) => reactFrameStack.pop();

    return () => {
      // @ts-ignore
      console.reactStack = undefined;
      // @ts-ignore
      console.reactStackEnd = undefined;
    };
  }

  return () => {};
}

type ConsoleProxyCallback = (message: string, frames: ReactFrame[]) => void;
export function permanentRegisterConsole(type: string, callback: ConsoleProxyCallback) {
  if (typeof console !== 'undefined') {
    // @ts-ignore
    const orig = console[type];
    if (typeof orig === 'function') {
      // @ts-ignore
      console[type] = function __stack_frame_overlay_proxy_console__() {
        try {
          const message = arguments[0];
          if (typeof message === 'string' && reactFrameStack.length > 0) {
            callback(message, reactFrameStack[reactFrameStack.length - 1]);
          }
        } catch (err) {
          // Warnings must never crash. Rethrow with a clean stack.
          setTimeout(function () {
            throw err;
          });
        }
        return orig.apply(this, arguments);
      };
    }
  }
}
