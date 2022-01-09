import { fetchSandboxData } from "./api/sandbox";
import { Bundler } from "./bundler/bundler";

async function run() {
  let parsedUrl = new URL(location.href);
  let sandboxId = parsedUrl.searchParams.get("sandbox-id");
  if (!sandboxId) {
    throw new Error("No sandbox-id found in search params!");
  }

  console.log("Fetching sandbox data");
  let sandboxData = await fetchSandboxData(sandboxId);
  console.log("Fetched sandbox data", sandboxData);

  const bundler = new Bundler(sandboxData.files);

  const startTime = Date.now();
  console.log("Started bundling");
  await bundler.run();
  console.log(`Finished bundling in ${Date.now() - startTime}ms`);
}

run().catch(console.error);
