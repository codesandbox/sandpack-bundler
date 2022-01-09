export class FileSystem {
  // path => content
  private files: Map<string, string>;

  constructor() {
    this.files = new Map();
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  readFile(path: string): string | undefined {
    return this.files.get(path);
  }

  isFile(path: string): boolean {
    return this.files.has(path);
  }
}
