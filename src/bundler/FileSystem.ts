import gensync, { Gensync } from "gensync";

export class FileSystem {
  // path => content
  private files: Map<string, string>;
  readFile: Gensync<(filepath: string) => string>;
  isFile: Gensync<(filepath: string) => boolean>;

  constructor() {
    this.files = new Map();
    this.readFile = gensync({
      sync: this.readFileSync.bind(this),
    });
    this.isFile = gensync({
      sync: this.isFileSync.bind(this),
    });
  }

  writeFileSync(path: string, content: string): void {
    this.files.set(path, content);
  }

  readFileSync(path: string): string {
    const content = this.files.get(path);
    if (content == null) {
      throw new Error(`File ${path} not found`);
    }
    return content;
  }

  isFileSync(path: string): boolean {
    return this.files.has(path);
  }
}
