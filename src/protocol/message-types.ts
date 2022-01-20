export interface ISandboxFile {
  code: string;
  path: string;
}

export interface ICompileRequest {
  version: number;
  template: string;
  modules: Record<string, ISandboxFile>;

  clearConsoleDisabled?: boolean;
  disableDependencyPreprocessing?: boolean;
  externalResources?: Array<string>;
  hasFileResolver?: boolean;
  isInitializationCompile?: boolean;
  reactDevTools?: boolean;
  showErrorScreen?: boolean;
  showLoadingScreen?: boolean;
  showOpenInCodeSandbox?: boolean;
  skipEval?: boolean;
}
