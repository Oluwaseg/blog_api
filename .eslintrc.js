module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: ['eslint:recommended', 'plugin:node/recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 2021,
  },
  plugins: ['prettier'],
  rules: {
    'prettier/prettier': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: 'req|res|next|^_' }],
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'node/no-unsupported-features/es-syntax': [
      'error',
      { ignores: ['modules'], version: '>=14.0.0' },
    ],
  },
};
