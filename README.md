# Sandpack Bundler

The sandpack bundler, this aims to eventually replace the current sandpack with a more streamlined and faster version.

[Architecture chart](https://excalidraw.csb.dev/OF3psMUWe9WwUWgrevj5Es2JnDE3/1pzFeqkVTX12H8lmGuez)

## Getting started

1. Run `yarn` to install dependencies.
2. Run `yarn dev` to start the development server
3. Set the `bundlerURL` of sandpack-react to `http://localhost:1234/` to see it in action.

## Test the production build (performance/integration tests)

1. Run `yarn` to install dependencies.
2. Run `yarn build` to build the application
3. Run `yarn start` to start a local test server
4. Set the `bundlerURL` of sandpack-react to `http://localhost:4587/`

## Using the deployed version

The `main` branch of this repository is automatically deployed to `https://sandpack-bundler.pages.dev/` so you can update `bundlerURL` of `sandpack-react` to that url and start using the new sandpack bundler.

