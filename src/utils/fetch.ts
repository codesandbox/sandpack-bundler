import { isPositiveInteger } from './number';

export type RequestInitWithRetry = RequestInit & { retries?: number; retryDelay?: number };

function cloneInput(input: RequestInfo): RequestInfo {
  if (typeof Request !== 'undefined' && input instanceof Request) {
    return input.clone();
  } else {
    return input;
  }
}

export function fetch(input: RequestInfo, init: RequestInitWithRetry = {}): Promise<Response> {
  const retries: number = isPositiveInteger(init.retries) ? init.retries : 3;
  const retryDelay: number = isPositiveInteger(init.retryDelay) ? init.retryDelay : 1000;

  return new Promise((resolve, reject) => {
    input = cloneInput(input);

    // TODO: Be a bit smarter about retry logic...
    function retry(attempt: number, error: Error | null, response: Response | null) {
      setTimeout(function () {
        wrappedFetch(++attempt);
      }, retryDelay);
    }

    function wrappedFetch(attempt: number) {
      window.fetch(input, init)
        .then(function (response) {
          if (attempt < retries) {
            retry(attempt, null, response);
          } else {
            resolve(response);
          }
        })
        .catch(function (error) {
          if (attempt < retries) {
            retry(attempt, error, null);
          } else {
            reject(error);
          }
        });
    }
  });
}
