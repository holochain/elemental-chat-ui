import  create_message from './create-message.spec.js'
import { orchestrator } from './setup/tryorama'
// import { callTest } from './new-messsage.spec.js'

// require('./create-message.spec.js')(orchestrator)
create_message(orchestrator)

try {
  orchestrator.run()
} catch (error) {
  throw new Error('ERROR running orhestrator..')
}
/// then call all other non-tryorama tests....
// callTest()
