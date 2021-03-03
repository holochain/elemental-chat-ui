const baseConfig = require("./jest.base.config");

module.exports = {
  ...baseConfig,
  preset: "@vue/cli-plugin-unit-jest",
  verbose: true,
  transform: {
    ...baseConfig.transform,
    "^.+\\.vue$": "vue-jest",
    "^.+\\.tsx?$": "ts-jest"
  },
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{js,vue}", "!**/node_modules/**"]
};
