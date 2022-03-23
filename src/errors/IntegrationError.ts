export class IntegrationError extends Error {
  code: string;
  name: string;

  constructor(error: Error | string, name: string) {
    super(typeof error === 'string' ? error : error.message);

    this.code = 'Integration error';
    this.name = name;
  }
}
