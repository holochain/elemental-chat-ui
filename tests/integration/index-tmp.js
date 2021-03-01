const { Orchestrator } = require('@holochain/tryorama')
const { network } = require('./setup/tryorama')
const { callTest } = require('./tester.spec.js')

const orchestrator = new Orchestrator(network)

require('./create-message.spec.js')(orchestrator)

try {
  callTest()
} catch (error) {
  throw new Error('ERROR running orhestrator..')
}
/// then call all other non-tryorama tests....
orchestrator.run()

module.exports = {
  orchestrator
}
