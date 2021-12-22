import { ISandboxFile } from "../api/sandbox";

interface IPackageJSON {
  main: string;
}

export class Bundler {
  files: ISandboxFile[];
  parsedPackageJSON: IPackageJSON | null = null;

  constructor(files: ISandboxFile[]) {
    this.files = files;
  }

  loadPackageJSON(): string {
    const foundPackageJSON = this.files.find((f) => f.path === "/package.json");
    if (!foundPackageJSON) {
      throw new Error("package.json not found");
    }
    this.parsedPackageJSON = JSON.parse(foundPackageJSON.code);
    return this.parsedPackageJSON!.main;
  }

  async run() {
    const entrypoint = this.loadPackageJSON();

    console.log({ entrypoint });
  }
}
