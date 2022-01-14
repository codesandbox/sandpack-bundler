import gensync, { Gensync } from "gensync";

export class FileSystem {
  // path => content
  files: Map<string, string>;
  readFile: Gensync<(filepath: string) => string>;
  isFile: Gensync<(filepath: string) => boolean>;

  constructor() {
    this.files = new Map();
    this.readFile = gensync({
      sync: this.readFileSync.bind(this),
      async: this.readFileAsync.bind(this),
    });
    this.isFile = gensync({
      sync: this.isFileSync.bind(this),
      async: this.isFileAsync.bind(this),
    });
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  readFileSync(path: string): string {
    const content = this.files.get(path);
    if (content == null) {
      throw new Error(`File ${path} not found`);
    }
    return content;
  }

  readFileAsync(path: string): Promise<string> {
    const content = this.files.get(path);
    if (content == null) {
      return Promise.reject(new Error(`File ${path} not found`));
    }
    return Promise.resolve(content);
  }

  isFileSync(path: string): boolean {
    return this.files.has(path);
  }

  isFileAsync(path: string): Promise<boolean> {
    return Promise.resolve(this.files.has(path));
  }
}
