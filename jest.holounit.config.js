const holochainUnitConfig = require('./jest.hcunit.config')

module.exports = {
  ...holochainUnitConfig,
  testMatch: ['<rootDir>/tests/**/unit/**/*.spec.holo.{js,jsx,ts,tsx}']
}
