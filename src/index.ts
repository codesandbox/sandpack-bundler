import * as babel from "@babel/standalone";
import { fetchSandboxData } from "./api/sandbox";

import { collectDependencies } from "./bundler/transforms/js/dep-collector";
import { Bundler } from "./bundler/bundler";

async function run() {
  let parsedUrl = new URL(location.href);
  let sandboxId = parsedUrl.searchParams.get("sandbox-id");
  if (!sandboxId) {
    throw new Error("No sandbox-id found in search params!");
  }

  console.log("Fetching sandbox data");
  let sandboxData = await fetchSandboxData(sandboxId);
  console.log("Fetched sandbox data");

  const bundler = new Bundler();

  console.log("Started bundling");
  await bundler.run(sandboxData.files);
  console.log("Finished bundling");

  // const CODE = `import ReactDOM from 'react-dom';

  // console.log("test");

  // const React = require('react');

  // export const App = () => {
  //   return <div>test</div>
  // }

  // ReactDOM.render(<App />, document.getElementById('app'));
  // `;

  // const requires: Set<string> = new Set();
  // const transformed = babel.transform(CODE, {
  //   presets: ["env", "react"],
  //   plugins: [collectDependencies(requires)],
  //   ast: true,
  // });

  // console.log(transformed);
  // console.log(requires);
}

run().catch(console.error);
