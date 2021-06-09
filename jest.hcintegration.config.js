const unitConfig = require('./jest.hcunit.config')

module.exports = {
  ...unitConfig,
  collectCoverage: false,
  globalSetup: './config/puppeteer/setup.js',
  globalTeardown: './config/puppeteer/teardown.js',
  testEnvironment: './config/puppeteer/environment.js',
  testMatch: ['<rootDir>/tests/**/integration/**/*.spec.hc.{js,jsx,ts,tsx}']
}
