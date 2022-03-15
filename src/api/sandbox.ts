import { fetch } from '../utils/fetch';

export interface ISandboxFile {
  path: string;
  code: string;
}

export interface ISandboxData {
  files: ISandboxFile[];
}

export async function fetchSandboxData(sandboxId: string): Promise<ISandboxData> {
  const response = await fetch(`http://localhost:1234/api/v1/sandboxes/${sandboxId}`, {
    method: 'GET',
    retries: 5,
    retryDelay: 1000,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(text);
  }

  const data = JSON.parse(text).data;
  const directories: Map<string, any> = new Map(data.directories.map((d: any) => [d.shortid, d]));
  const modules = data.modules;
  let files: ISandboxFile[] = [];
  for (let module of modules) {
    let currNode = {
      directory_shortid: module.directory_shortid,
      title: module.title,
    };
    let path = [];
    while (currNode) {
      path.unshift(currNode.title);
      currNode = directories.get(currNode.directory_shortid);
    }
    path.unshift('');
    files.push({
      path: path.join('/'),
      code: module.code,
    });
  }
  return { files };
}
