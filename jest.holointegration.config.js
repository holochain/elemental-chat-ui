const holochainConfig = require('./jest.hcintegration.config')

module.exports = {
  ...holochainConfig,
  testMatch: ['<rootDir>/tests/**/integration/**/*.spec.holo.{js,jsx,ts,tsx}']
}
