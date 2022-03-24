import { SandpackError } from './SandpackError';

export class IntegrationError extends SandpackError {
  code = 'INTEGRATION_ERROR';

  name: string;

  constructor(message: string, name: string) {
    super(message);

    this.name = name;
  }
}
