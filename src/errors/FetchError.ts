import { SandpackError } from './SandpackError';

export class FetchError extends SandpackError {
  code = 'FETCH_ERROR';

  url: string;
  status: number;
  text: string;

  constructor(res: Response, text: string) {
    super(`Fetch failed with status ${res.status}: ${res.statusText}`);

    this.status = res.status;
    this.text = text;
    this.url = res.url;
  }
}
