export class FSLayer {
  constructor(readonly name: string) {}

  writeFile(path: string, content: string): void {
    return;
  }

  readFileSync(path: string): string {
    throw new Error(`readFileSync is not implemented for fs#${this.name}`);
  }

  readFileAsync(path: string): Promise<string> {
    throw new Error(`readFileAsync is not implemented for fs#${this.name}`);
  }

  isFileSync(path: string): boolean {
    throw new Error(`isFileSync is not implemented for fs#${this.name}`);
  }

  isFileAsync(path: string): Promise<boolean> {
    throw new Error(`isFileAsync is not implemented for fs#${this.name}`);
  }
}
