import { CDNModuleFileType } from "./module-cdn";

export class NodeModule {
  name: string;
  version: string;
  files: CDNModuleFileType[];
  // transient dependencies
  modules: string[];

  constructor(
    name: string,
    version: string,
    files: CDNModuleFileType[],
    modules: string[]
  ) {
    this.name = name;
    this.version = version;
    this.files = files;
    this.modules = modules;
  }
}
