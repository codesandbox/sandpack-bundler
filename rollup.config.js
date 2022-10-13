import commonjs from '@rollup/plugin-commonjs';
import html from '@rollup/plugin-html';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/index.ts',
  output: { dir: 'dist', sourcemap: true },
  external: [],
  plugins: [
    html(),
    typescript(),
    nodeResolve({ browser: true }),
    commonjs({
      preferBuiltins: true,
      include: 'node_modules/**',
    }),
    // terser(),
    replace({
      preventAssignment: true,
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
  ],
};
