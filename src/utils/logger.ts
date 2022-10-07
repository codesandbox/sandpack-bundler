/* eslint-disable no-console */

const steps = [
  'Init',
  'FileSystem',
  'Integrations',
  'Preset and transformers',
  'Bundling',
  'Evaluation',
  'Finished',
] as const;

export const logFactory = (step: typeof steps[number], details = '') => {
  const currentStep = steps.findIndex((name) => name === step) + 1;
  const total = steps.length;

  return `[${currentStep}/${total}]: ${step} ${details}`;
};

export enum SandpackLogLevel {
  None = 0,
  Error = 10,
  Warning = 20,
  Info = 30,
  Debug = 40,
}

let logLevel = SandpackLogLevel.Debug;

function shouldLog(minimalLogLevel: SandpackLogLevel) {
  return logLevel >= minimalLogLevel;
}

export function setLogLevel(newLogLevel: SandpackLogLevel) {
  logLevel = newLogLevel;
}

export function debug(...data: any[]) {
  if (shouldLog(SandpackLogLevel.Debug)) {
    console.log(...data);
  }
}

export function info(...data: any[]) {
  if (shouldLog(SandpackLogLevel.Info)) {
    console.log(...data);
  }
}

export function warn(...data: any[]) {
  if (shouldLog(SandpackLogLevel.Warning)) {
    console.warn(...data);
  }
}

export function error(...data: any[]) {
  if (shouldLog(SandpackLogLevel.Error)) {
    console.error(...data);
  }
}

export function groupCollapsed(...data: any[]) {
  if (shouldLog(SandpackLogLevel.Debug)) {
    console.groupCollapsed(...data);
  }
}

export function groupEnd() {
  if (shouldLog(SandpackLogLevel.Debug)) {
    console.groupEnd();
  }
}
