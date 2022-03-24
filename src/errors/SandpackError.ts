export class SandpackError extends Error {
  code: string = 'SANDPACK_ERROR';

  constructor(message: string) {
    super(message);
  }
}
