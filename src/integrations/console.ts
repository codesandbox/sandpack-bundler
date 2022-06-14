import Hook from 'console-feed/lib/Hook';
import { Encode } from 'console-feed/lib/Transform';

import * as logger from '../utils/logger';

export function hookConsole(output: (log: any) => void) {
  Hook(window.console, async (log) => {
    output(log);
  });
}

export function handleEvaluate(command: string): { error: boolean; result: any } | undefined {
  let result = null;
  let error = false;

  try {
    // Attempt to wrap command in parentheses, fixing issues
    // where directly returning objects results in unexpected
    // behaviour.
    if (command && command.charAt(0) === '{') {
      try {
        const wrapped = `(${command})`;
        // `new Function` is used to validate Javascript syntax
        // eslint-disable-next-line
        const validate = new Function(wrapped);
        command = wrapped;
      } catch (e) {
        // We shouldn't wrap the expression
      }
    }

    result = (0, eval)(command); // eslint-disable-line no-eval
  } catch (e) {
    result = e;
    error = true;
  }

  try {
    return {
      error,
      result: Encode(result),
    };
  } catch (e) {
    logger.error(e);
  }
}
