import { IFrameParentMessageBus } from '../../protocol/iframe';
import { FSLayer } from '../FSLayer';
import { MemoryFSLayer } from './MemoryFSLayer';

export class IFrameFSLayer extends FSLayer {
  private isBypassed = true;

  constructor(private memoryFS: MemoryFSLayer, private messageBus: IFrameParentMessageBus) {
    super('iframe-fs');
  }

  enableIFrameFS(): void {
    this.isBypassed = false;
  }

  shouldSkipLayer(path: string): boolean {
    return this.isBypassed || path.includes('node_modules');
  }

  resetCache(): void {
    // do nothing yet
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
      try {
        const response = await this.messageBus.protocolRequest('file-resolver', {
          m: 'readFile',
          path,
        });
        if (typeof response === 'string') {
          return response;
        }
      } catch (err) {
        // do nothing
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
      try {
        const response = await this.messageBus.protocolRequest('file-resolver', {
          m: 'isFile',
          path,
        });
        return !!response;
      } catch (err) {
        console.error(err);
      }
    }
    return isFile;
  }
}
