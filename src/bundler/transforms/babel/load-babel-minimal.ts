export default function loadBabelMinimal() {
  return new Worker(new URL('./babel-minimal-worker.min.js', import.meta.url), { type: 'module' });
}
