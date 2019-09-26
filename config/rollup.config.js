import nodeResolve from 'rollup-plugin-node-resolve';
import typescript from 'typescript';
import typescriptPlugin from 'rollup-plugin-typescript2';
import invariantPlugin from 'rollup-plugin-invariant';
import fs from 'fs';
import { transformSync } from '@babel/core';
import cjsModulesTransform from '@babel/plugin-transform-modules-commonjs';
import umdModulesTransform from '@babel/plugin-transform-modules-umd';
import { terser as minify } from 'rollup-plugin-terser';

const defaultGlobals = {};

export function rollup({ name, input = './src/index.ts', extraGlobals = {} }) {
  const tsconfig = './config/tsconfig.json';

  const globals = {
    ...defaultGlobals,
    ...extraGlobals,
  };

  function external(id) {
    return Object.prototype.hasOwnProperty.call(globals, id);
  }

  function outputFile(format) {
    return `./lib/${name}.${format}.js`;
  }

  const minifyPlugin = minify({
    mangle: {
      toplevel: true,
    },
    compress: {
      global_defs: {
        '@process.env.NODE_ENV': JSON.stringify('production'),
      },
    },
  });

  function fromSource(format, out = format, opts = { plugins: [] }) {
    return {
      input,
      external,
      output: {
        file: outputFile(out),
        format,
        sourcemap: true,
      },
      plugins: [
        nodeResolve({
          extensions: ['.ts', '.tsx'],
          module: true,
        }),
        typescriptPlugin({ typescript, tsconfig }),
        invariantPlugin({
          // Instead of completely stripping InvariantError messages in
          // production, this option assigns a numeric code to the
          // production version of each error (unique to the call/throw
          // location), which makes it much easier to trace production
          // errors back to the unminified code where they were thrown,
          // where the full error string can be found. See #4519.
          errorCodes: true,
        }),
        ...opts.plugins,
      ],
    };
  }

  function fromESM(toFormat, out = toFormat, opts = { plugins: [] }) {
    return {
      input: outputFile('esm'),
      output: {
        file: outputFile(out),
        format: 'esm',
        sourcemap: false,
      },
      // The UMD bundle expects `this` to refer to the global object. By default
      // Rollup replaces `this` with `undefined`, but this default behavior can
      // be overridden with the `context` option.
      context: 'this',
      plugins: [
        {
          transform(source, id) {
            const output = transformSync(source, {
              inputSourceMap: JSON.parse(fs.readFileSync(id + '.map')),
              sourceMaps: true,
              plugins: [
                [
                  toFormat === 'umd'
                    ? umdModulesTransform
                    : cjsModulesTransform,
                  {
                    loose: true,
                    allowTopLevelThis: true,
                  },
                ],
              ],
            });

            // There doesn't seem to be any way to get Rollup to emit a source map
            // that goes all the way back to the source file (rather than just to
            // the bundle.esm.js intermediate file), so we pass sourcemap:false in
            // the output options above, and manually write the CJS and UMD source
            // maps here.
            fs.writeFileSync(
              outputFile(toFormat) + '.map',
              JSON.stringify(output.map),
            );

            return {
              code: output.code,
            };
          },
        },
        ...opts.plugins,
      ],
    };
  }

  return [
    fromSource('esm'),
    fromESM('cjs'),
    fromESM('cjs', 'cjs.min', { plugins: [minifyPlugin] }),
    fromESM('umd'),
    fromESM('umd', 'umd.min', { plugins: [minifyPlugin] }),
  ];
}
