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
