import { decode as decodeMsgPack } from '@msgpack/msgpack';
import urlJoin from 'url-join';

import { retryFetch } from '../../utils/fetch';
import { DepMap } from '.';

const CDN_ROOT = 'https://sandpack-cdn-staging.blazingly.io/';

export interface IResolvedDependency {
  // name
  n: string;
  // version
  v: string;
  // depth
  d: number;
}

const CDN_VERSION = 4;

function encodePayload(payload: string): string {
  return btoa(`${CDN_VERSION}(${payload})`);
}

export async function fetchManifest(deps: DepMap): Promise<IResolvedDependency[]> {
  const encoded_manifest = encodePayload(JSON.stringify(deps));
  const result = await retryFetch(urlJoin(CDN_ROOT, `/dep_tree/${encoded_manifest}`), {
    maxRetries: 5,
    retryDelay: 1000,
  });
  const buffer = await result.arrayBuffer();
  return decodeMsgPack(buffer) as IResolvedDependency[];
}

export type CDNModuleFileType = ICDNModuleFile | number;

export interface ICDNModuleFile {
  // content
  c: string;
  // dependencies
  d: string[];
  // is transpiled
  t: boolean;
}

export interface ICDNModule {
  // files
  f: Record<string, CDNModuleFileType>;
  // transient dependencies
  m: string[];
}

export async function fetchModule(name: string, version: string): Promise<ICDNModule> {
  const specifier = `${name}@${version}`;
  const encoded_specifier = encodePayload(specifier);
  const result = await retryFetch(urlJoin(CDN_ROOT, `/package/${encoded_specifier}`), { maxRetries: 5 });
  const buffer = await result.arrayBuffer();
  return decodeMsgPack(buffer) as ICDNModule;
}
