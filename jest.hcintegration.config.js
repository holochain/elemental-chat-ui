const config = require('./jest.config')

module.exports = {
  ...config,
  collectCoverage: false,
  globalSetup: './config/puppeteer/setup.js',
  globalTeardown: './config/puppeteer/teardown.js',
  testEnvironment: './config/puppeteer/environment.js',
  testMatch: ['<rootDir>/tests/**/integration/**/*.spec.holochain.{js,jsx,ts,tsx}']
}
