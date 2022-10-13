export default function loadBabelMinimal() {
  return new Worker(new URL('./babel-minimal-worker', import.meta.url), { type: 'module' });
}
