import commonjs from '@rollup/plugin-commonjs';
import rollupJson from '@rollup/plugin-json';
import rollupNodeResolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import { terser } from 'rollup-plugin-terser';

export default {
  input: './src/babel-minimal-worker.ts',
  external: [],
  output: {
    file: './src/babel-minimal-worker.cjs.js',
    format: 'cjs',
  },
  plugins: [
    typescript(),
    rollupJson(),
    commonjs({
      include: [
        // Bundle node_modules only when building standalone
        /node_modules/,
      ],

      // Never delegate to the native require()
      ignoreDynamicRequires: false,
      // Align with the Node.js behavior
      defaultIsModuleExports: true,
    }),
    rollupNodeResolve({
      extensions: ['.ts', '.js', '.mjs', '.cjs', '.json'],
      browser: true,
      exportConditions: ['browser'],
      // It needs to be set to 'false' when using rollupNodePolyfills
      // https://github.com/rollup/plugins/issues/772
      preferBuiltins: false,
    }),
    terser(),
  ],
};
