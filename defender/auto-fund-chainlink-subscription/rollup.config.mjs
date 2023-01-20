import json from '@rollup/plugin-json';
import yaml from '@rollup/plugin-yaml';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'builtin-modules';

/**
 * @type {import('rollup').RollupOptions}
 */
const config = [
  {
    input: 'autotasks/detect-low-balance/index.js',
    output: {
      file: 'autotasks/detect-low-balance/dist/index.js',
      format: 'cjs',
    },
    plugins: [json({ compact: true }), yaml()],
  },
  {
    input: 'autotasks/fund-subscription/index.js',
    output: {
      file: 'autotasks/fund-subscription/dist/index.js',
      format: 'cjs',
    },
    plugins: [resolve({ preferBuiltins: true }), commonjs(), json({ compact: true }), yaml()],
    external: [...builtins, 'ethers', 'web3', 'axios', /^defender-relay-client(\/.*)?$/],
  },
];

export default config;
