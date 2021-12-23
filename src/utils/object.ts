export function sortObj<T = any>(obj: Record<string, T>): Record<string, T> {
  const res: Record<string, T> = {};
  const sortedKeys = Object.keys(obj).sort();
  for (let key of sortedKeys) {
    res[key] = obj[key];
  }
  return res;
}
