import { BundlerError } from './BundlerError';

export class IntegrationError extends BundlerError {
  constructor(error: Error) {
    super(error);

    this.title = 'Integration error';
  }
}
