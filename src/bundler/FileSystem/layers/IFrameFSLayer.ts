import { FSLayer } from '../FSLayer';
import { MemoryFSLayer } from './MemoryFSLayer';

export class IFrameFSLayer extends FSLayer {
  files: Map<string, string> = new Map();

  constructor(private memoryFS: MemoryFSLayer) {
    super('iframe-fs');
  }

  writeFile(path: string, content: string): void {
    this.memoryFS.writeFile(path, content);
  }

  readFileSync(path: string): string {
    return this.memoryFS.readFileSync(path);
  }

  async readFileAsync(path: string): Promise<string> {
    try {
      return this.memoryFS.readFileSync(path);
    } catch (err) {
      // Skip node_modules
      if (!path.includes('node_modules')) {
        // TODO: Fetch file using iframe protocol
        // TODO: Write to memory fs
      }
      throw err;
    }
  }

  isFileSync(path: string): boolean {
    return this.memoryFS.isFileSync(path);
  }

  async isFileAsync(path: string): Promise<boolean> {
    let isFile = this.memoryFS.isFileSync(path);
    if (!isFile) {
      // Skip node_modules
      if (!path.includes('node_modules')) {
        // TODO: Do isFile through iFrame Protocol
        // TODO: Write to memory fs?
      }
    }
    return isFile;
  }
}
