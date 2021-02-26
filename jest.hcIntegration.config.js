const config = require("./jest.config");
// const { transform } = require('./jest.common.config')

module.exports = {
  ...config,
  collectCoverage: false,
  testMatch: ["<rootDir>/tests/**/integration/**/*.spec.{js,jsx,ts,tsx}"] // ,
  // transform
};
