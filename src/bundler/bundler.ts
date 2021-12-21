import { ISandboxFile } from "../api/sandbox";

export class Bundler {
  async run(files: ISandboxFile[]) {
    console.log(files);
  }
}
