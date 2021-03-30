const baseConfig = require('./jest.base.config')

module.exports = {
  ...baseConfig,
  preset: '@vue/cli-plugin-unit-jest',
  verbose: true,
  transform: {
    ...baseConfig.transform,
    '^.+\\.vue$': 'vue-jest',
    '^.+\\js$': 'babel-jest'
  },
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  moduleNameMapper: {
    ...baseConfig.moduleNameMapper,
    '@/utils/(.*)$': '<rootDir>/utils/$1'
  },
  collectCoverage: false,
  collectCoverageFrom: ['**/*.{js,vue}', '!**/node_modules/**'],
  testMatch: ['<rootDir>/tests/**/unit/**/*.spec.hc.{js,jsx,ts,tsx}']
}
