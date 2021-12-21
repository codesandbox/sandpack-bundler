import fetchRetry from "fetch-retry";

export const fetch = fetchRetry(window.fetch);
