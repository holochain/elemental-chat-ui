const {
  transformIgnorePatterns,
  moduleFileExtensions
} = require("./jest.common.config");

module.exports = {
  preset: "@vue/cli-plugin-unit-jest",
  verbose: true,
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.vue$": "vue-jest",
    ".*\\.(js)$": "babel-jest",
    "^.+\\.tsx?$": "ts-jest"
  },
  roots: ["<rootDir>/src/", "<rootDir>/tests/"],
  transformIgnorePatterns,
  moduleFileExtensions,
  collectCoverage: true,
  collectCoverageFrom: ["**/*.{js,vue}", "!**/node_modules/**"]
}
