/* eslint-disable no-eval */
// import buildProcess from "./utils/process";

const hasGlobalDeclaration = /^const global/m;

/* eslint-disable no-unused-vars */
export default function (
  iframeWindow: Window,
  code: string,
  require: Function,
  context: { id: string; exports: any; hot?: any },
  env: Object = {},
  globals: Object = {}
) {
  const global = iframeWindow;
  const process = {
    env: {
      NODE_ENV: 'development',
    },
  }; // buildProcess(env);
  // @ts-ignore
  global.global = global;

  const allGlobals: { [key: string]: any } = {
    require,
    module: context,
    exports: context.exports,
    process,
    global,
    ...globals,
  };

  if (hasGlobalDeclaration.test(code)) {
    delete allGlobals.global;
  }

  const allGlobalKeys = Object.keys(allGlobals);
  const globalsCode = allGlobalKeys.length ? allGlobalKeys.join(', ') : '';
  const globalsValues = allGlobalKeys.map((k) => allGlobals[k]);
  try {
    const newCode =
      `(function $csb$eval(` + globalsCode + `) {` + code + `\n})`;
    // @ts-ignore
    const wEval = iframeWindow.eval;

    wEval.call(iframeWindow, newCode)(...globalsValues);

    return context.exports;
  } catch (err) {
    console.error(err);
    console.error(code);

    let error = err;
    if (typeof err === 'string') {
      error = new Error(err);
    }
    // @ts-ignore
    error.isEvalError = true;

    throw error;
  }
}
