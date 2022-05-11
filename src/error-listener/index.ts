import { Bundler } from '../bundler/bundler';
import { getStackFrames } from './get-stack-frames';
import { permanentRegisterConsole, registerReactStack } from './proxy-console';
import StackFrame from './stack-frame';
import { registerStackTraceLimit } from './stack-trace-limit';
import { registerUnhandledError } from './unhandled-error';
import { registerUnhandledRejection } from './unhandled-rejection';
import { warningMessage } from './warnings';

const CONTEXT_SIZE: number = 3;

export interface ErrorRecord {
  error: Error;
  unhandledRejection: boolean;
  contextSize: number;
  stackFrames: StackFrame[];
}

export const crashWithFrames = (bundler: Bundler, crash: (record: ErrorRecord) => void) => {
  return (error: Error, unhandledRejection = false) => {
    getStackFrames(bundler, error, CONTEXT_SIZE)
      .then((stackFrames) => {
        console.log({stackFrames})
        crash({
          error,
          unhandledRejection,
          contextSize: CONTEXT_SIZE,
          stackFrames: stackFrames ?? [],
        });
      })
      .catch((e) => {
        console.log('Could not get the stack frames of error:', e);
      });
  };
};

export function listenToRuntimeErrors(
  bundler: Bundler,
  crash: (record: ErrorRecord) => void,
  filename: string = '/bundle.js'
) {
  const crashWithFramesRunTime = crashWithFrames(bundler, crash);

  const unregisterError = registerUnhandledError(window, (error) => crashWithFramesRunTime(error, false));
  const unregisterUnhandledRejection = registerUnhandledRejection(window, (error) =>
    crashWithFramesRunTime(error, true)
  );
  registerStackTraceLimit();
  const unregisterReactStack = registerReactStack();
  permanentRegisterConsole('error', (warning, stack) => {
    const data = warningMessage(warning, stack);
    crashWithFramesRunTime(
      {
        message: data.message,
        stack: data.stack,
        // @ts-ignore
        __unmap_source: filename,
      },
      false
    );
  });

  return () => {
    unregisterUnhandledRejection();
    unregisterError();
    unregisterReactStack();
  };
}
