export default function loadBabelMinimal() {
  return new Worker(new URL('./babel-minimal.minify.js', import.meta.url), { type: 'module' });
}
