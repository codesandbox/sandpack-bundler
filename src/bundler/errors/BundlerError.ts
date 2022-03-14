interface BundlerErrorFormat {
  title: string;
  message: string;
  path: string | undefined;
}

export class BundlerError implements BundlerErrorFormat {
  title;
  message;
  path;

  constructor(error: Error, path?: string) {
    this.title = "Unknown error";
    this.message = error.message;
    this.path = path;
  }
}
