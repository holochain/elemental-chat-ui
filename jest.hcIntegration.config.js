const config = require('./jest.config')

module.exports = {
  ...config,
  collectCoverage: false,
  testMatch: ['<rootDir>/tests/**/integration/**/*.spec.{js,jsx,ts,tsx}']
}
