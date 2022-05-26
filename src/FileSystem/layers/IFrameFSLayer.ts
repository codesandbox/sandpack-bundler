import { IFrameParentMessageBus } from '../../protocol/iframe';
import { FSLayer } from '../FSLayer';
import { MemoryFSLayer } from './MemoryFSLayer';

export class IFrameFSLayer extends FSLayer {
  private isBypassed = true;
  private isFileCache: Map<string, boolean> = new Map();
  private getFileResolverId: () => string | undefined;

  constructor(
    private memoryFS: MemoryFSLayer,
    private messageBus: IFrameParentMessageBus,
    getFileResolverId: () => string | undefined
  ) {
    super('iframe-fs');

    this.getFileResolverId = getFileResolverId;
  }

  enableIFrameFS(): void {
    this.isBypassed = false;
  }

  shouldSkipLayer(path: string): boolean {
    return this.isBypassed || path.includes('node_modules');
  }

  resetCache(): void {
    this.isFileCache = new Map();
  }

  private getIsFileCache(path: string): boolean | undefined {
    return this.isFileCache.get(path);
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
      const isFile = this.getIsFileCache(path);
      if (isFile !== false) {
        try {
          const response = await this.messageBus.protocolRequest('file-resolver', {
            m: 'readFile',
            p: path,
            id: this.getFileResolverId(),
          });
          if (typeof response === 'string') {
            return response;
          }
        } catch (err) {
          // do nothing
        }
      }
      this.isFileCache.set(path, false);
      throw err;
    }
  }

  isFileSync(path: string): boolean {
    return this.memoryFS.isFileSync(path);
  }

  async isFileAsync(path: string): Promise<boolean> {
    let isFile = this.memoryFS.isFileSync(path);
    if (!isFile) {
      const cachedIsFile = this.getIsFileCache(path);
      if (cachedIsFile !== undefined) {
        return cachedIsFile;
      }

      try {
        const response = await this.messageBus.protocolRequest('file-resolver', {
          m: 'isFile',
          p: path,
        });
        isFile = !!response;
        this.isFileCache.set(path, !!response);
        return !!response;
      } catch (err) {
        console.error(err);
      }
    }
    return isFile;
  }
}
