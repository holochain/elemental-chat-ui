// puppeteer_environment.js
const JsdomEnvironment = require('jest-environment-jsdom')
const fs = require('fs')
const path = require('path')
const puppeteer = require('puppeteer')
const os = require('os')

const DIR = path.join(os.tmpdir(), 'jest_puppeteer_global_setup')

class PuppeteerEnvironment extends JsdomEnvironment {
  // eslint-disable-next-line no-useless-constructor
  constructor (config) {
    super(config)
  }

  async setup () {
    await super.setup()
    // get the wsEndpoint
    const wsEndpoint = fs.readFileSync(path.join(DIR, 'wsEndpoint'), 'utf8')
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found')
    }

    // connect to puppeteer
    this.global.__BROWSER__ = await puppeteer.connect({
      browserWSEndpoint: wsEndpoint
    })
  }

  async teardown () {
    await super.teardown()
  }

  runScript (script) {
    return super.runScript(script)
  }
}

module.exports = PuppeteerEnvironment
