module.exports = {
  root: true,
  env: {
    node: true
  },
  plugins: ["jest"],
  extends: ["plugin:vue/essential", "eslint:recommended", "@vue/prettier", "plugin:jest/recommended"],
  parserOptions: {
    parser: "babel-eslint"
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off"
  },
  globals: {
    expect: "readonly",
    it: "readonly",
    describe: "readonly",      
    before: "readonly",
    after: "readonly"
  },
  overrides: [
    {
      files: [
        "**/__tests__/*.{j,t}s?(x)",
        "**/tests/unit/**/*.spec.{j,t}s?(x)"
      ],
      env: {
        jest: true
      }
    }
  ]
};
