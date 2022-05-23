import { WEB_CLIENT_PORT } from '@/consts'
import * as tryorama from '@holochain/tryorama'
import wait from 'waait'
import { WAITTIME } from './globals'

const path = require('path')

const appPort = parseInt(WEB_CLIENT_PORT)

export const conductorConfig = tryorama.Config.gen({ appPort })
export const elChatDna = path.join(
  __dirname,
  '../../../dnas/elemental-chat.dna'
)
export const initializeTryorama = async scenario_name => {
  const orchestrator = new tryorama.Orchestrator({
    // Specify mode to prevent tryorama using the `tape` testing library
    mode: {
      executor: 'none',
      spawning: 'local'
    }
  })
  let scenarioStarted
  let endScenario
  const scenarioPromise = new Promise(resolve => (scenarioStarted = resolve))
  const scenarioEndedPromise = new Promise(resolve => (endScenario = resolve))
  orchestrator.registerScenario(scenario_name, scenario => {
    scenarioStarted(scenario)
    return scenarioEndedPromise
  })
  orchestrator.run()
  const s = await scenarioPromise
  const close = async () => {
    endScenario()
    await wait(WAITTIME)
  }
  return { s, close }
}
