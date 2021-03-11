module.exports = {
  globals: {},
  testEnvironment: 'jsdom',

  transform: {
    '^.+\\.vue$': 'vue-jest',
    '^.+\\js$': 'babel-jest'
  },

  moduleFileExtensions: ['vue', 'js', 'json', 'jsx'],

  moduleNameMapper: {
    '@/utils/(.*)$': '<rootDir>/utils/$1'
  },

  preset: '@vue/cli-plugin-unit-jest'
}
