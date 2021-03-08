module.exports = {
  root: true,
  env: {
    node: true
  },
  plugins: ["jest"],
  extends: [
    "plugin:vue/essential",
    "eslint:recommended",
    "@vue/prettier",
    "plugin:jest/recommended",
    'standard'
  ],
  globals: {
    expect: "readonly",
    it: "readonly",
    describe: "readonly",
    before: "readonly",
    after: "readonly"
  },
  parserOptions: {
    parser: 'babel-eslint'
  },
  rules: {
    'no-debugger': process.env.NODE_ENV === 'production' ? 'warn' : 'off'
  },
  overrides: [
    {
      files: [
        '**/__tests__/*.{j,t}s?(x)',
        '**/tests/unit/**/*.spec.{j,t}s?(x)'
      ],
      env: {
        jest: true
      }
    }
  ]
}
