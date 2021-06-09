const holochainIntegrationConfig = require('./jest.hcintegration.config')

module.exports = {
  ...holochainIntegrationConfig,
  testMatch: ['<rootDir>/tests/**/integration/**/*.spec.holo.{js,jsx,ts,tsx}']
}
