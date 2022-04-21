export function nullthrows<T>(value?: T | null, message?: string): T {
  if (value == null) {
    throw new Error(message || 'Value is nullish');
  }
  return value;
}
