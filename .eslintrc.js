module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es2021: true,
    'jest/globals': true,
  },
  extends: ['airbnb-base'],
  parserOptions: {
    ecmaVersion: 13,
    sourceType: 'module',
  },
  plugins: ['jest'],
  rules: {
    'max-len': ['warn', 160],
    indent: ['error', 2, { ignoreComments: true }],
    'comma-dangle': ['off', 'never'],
    semi: ['off', 'never'],
    'linebreak-style': 0,
    radix: 'off',
    'func-names': 'off',
    'arrow-parens': 'off',
    'global-require': 'off',
    'no-unused-vars': 'off',
    'no-underscore-dangle': 'off',
    'no-await-in-loop': 'off',
    'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
    'import/extensions': 'off',
    'import/no-dynamic-require': 'off',
    'import/no-extraneous-dependencies': 'off',
    'import/no-unresolved': 'warn',
    'guard-for-in': 'warn',
    'no-restricted-syntax': 'warn',
    'no-continue': 'warn',
    'no-param-reassign': 'warn',
    'newline-per-chained-call': 'warn',
    'no-nested-ternary': 'warn',
    'no-multi-assign': 'warn',
    'no-console': 'off',

    // jest
    'jest/no-disabled-tests': 'warn',
    'jest/no-focused-tests': 'error',
    'jest/no-identical-title': 'error',
    'jest/prefer-to-have-length': 'warn',
    'jest/valid-expect': 'error'
  },
  ignorePatterns: ['node_modules', 'dist'],
  settings: {
    'import/resolver': {
      node: {
        moduleDirectory: ['node_modules'],
        paths: ['.'],
      },
    },
  },
}
