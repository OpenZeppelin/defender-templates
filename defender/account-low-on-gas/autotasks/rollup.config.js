const resolve = require('@rollup/plugin-node-resolve');
const commonjs = require('@rollup/plugin-commonjs');
const json = require('@rollup/plugin-json');
const builtins = require('builtin-modules');
const yaml = require('@rollup/plugin-yaml');

module.exports = [
  {
    input: './compile/accountBalanceCheck/index.js',
    output: {
      file: './dist/accountBalanceCheck/index.js',
      format: 'cjs',
    },
    plugins: [resolve({ preferBuiltins: true }), commonjs(), json({ compact: true }), yaml()],
    external: [...builtins, 'ethers', 'web3', 'axios', /^defender-relay-client(\/.*)?$/],
  },
];
