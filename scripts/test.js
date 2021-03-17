'use strict'

// Do this as the first thing so that any code reading it knows the right env.
process.env.BABEL_ENV = 'test'
process.env.NODE_ENV = 'test'
process.env.PUBLIC_URL = ''

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err
})

// Ensure environment variables are read.
require('../config/env')

const jest = require('jest')
const execSync = require('child_process').execSync
const argv = process.argv.slice(2)

function isInGitRepository () {
  try {
    execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

function isInMercurialRepository () {
  try {
    execSync('hg --cwd . root', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

// Watch unless on CI or explicitly running all tests
if (
  !process.env.CI &&
  argv.indexOf('--watchAll') === -1
) {
  const hasSourceControl = isInGitRepository() || isInMercurialRepository()
  argv.push(hasSourceControl ? '--watch' : '--watchAll')
}
if (process.env.CI) {
  argv.push('--forceExit')
  argv.push('--watchAll=false')
  // replace existing 'watch' flag from true to false
  if (argv.includes('--watch')) {
    const index = argv.findIndex((arg) => arg === '--watch')
    argv[index] = '--watch=false'
  }
}

jest.run(argv)
  .then((success) => {
    console.log('Successfully completed Jest integration tests: ', success)
    process.exit()
  })
  .catch((failure) => {
    console.error('Error running Jest integration tests: ', failure)
  })
