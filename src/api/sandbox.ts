import { fetch } from "../utils/fetch";

export interface SandboxData {}

export async function fetchSandboxData(
  sandboxId: string
): Promise<SandboxData> {
  const response = await fetch(
    `https://codesandbox.io/api/v1/sandboxes/${sandboxId}`,
    {
      method: "GET",
      retries: 5,
      retryDelay: 1000,
    }
  );

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text);
  }

  return JSON.parse(text);
}
