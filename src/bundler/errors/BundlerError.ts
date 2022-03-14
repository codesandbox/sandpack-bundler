interface BundlerErrorFormat {
  title: string;
  message: string;

  path?: string;
  column?: number;
  line?: number;
}

export class BundlerError extends Error implements BundlerErrorFormat {
  title: string;
  message: string;

  path?: string;
  column?: number;
  line?: number;

  constructor(error: Error, path?: string) {
    super(error.message);

    this.title = "Unknown error";
    this.message = error.message;
    this.path = path;
  }
}
