export default function loadBabelMinimal() {
  return new Worker(new URL('./babel-worker', import.meta.url), { type: 'module' });
}
