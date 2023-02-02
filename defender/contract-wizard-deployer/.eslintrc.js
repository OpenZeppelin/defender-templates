module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    jest: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
  },
  rules: {
  },
  overrides: [
    {
      files: '*',
      rules: {
        'no-plusplus': 'off',
        'no-console': 'off',
      },
    },
  ],
};
