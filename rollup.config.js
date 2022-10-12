import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/bundler/transforms/babel/babel-minimal.ts',
  external: [],
  output: {
    file: './src/bundler/transforms/babel/babel-minimal.minify.js',
    format: 'cjs',
  },
  plugins: [typescript(), commonjs(), terser()],
};
