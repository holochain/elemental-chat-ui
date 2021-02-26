import 'regenerator-runtime/runtime.js' // TODO: follow-up on need for this import
// import { fireEvent, within, act, wait } from '@testing-library/vue'
// import msgpack from '@msgpack/msgpack'
import { v4 as uuidv4 } from 'uuid'
import waait from 'waait'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
import { TIMEOUT } from './setup/globals'
import { closeTestConductor } from './setup/helpers'
// import { renderAndWait } from '../test-utils'
// import HApp from '@/applications/ElementalChat/views/ElementalChat.vue'

orchestrator.registerScenario('New Message Scenario', async (scenario, tape) => {
  let chatter1, chatter2
  beforeAll(async () => {
    console.log('---------------> 1')
    const [conductor] = await scenario.players([conductorConfig])
    console.log('\n\nconductor : ', conductor)
    console.log('---------------> 2')
    // install app into tryorama conductor
    const [[chatter1Happ], [chatter2Happ]] = await conductor.installAgentsHapps([
      [[elChatDna]],
      [[elChatDna]]
    ])

    console.log('---------------> 3');

    // destructure and define agents
    ([chatter1] = chatter1Happ.cells)
    console.log('---------------> 4')

    console.log(chatter1);
    ([chatter2] = chatter2Happ.cells)
  }, TIMEOUT)

  afterAll(() => {
    if (chatter2) {
      chatter2.close()
    }
    closeTestConductor(chatter1, 'Create Request e2e')
  })

  describe('New Message Flow', () => {
    it('returns message', async () => {
      console.log(chatter2)
      // Create a channel
      const channelId = uuidv4()
      const channel = await chatter1.call('chat', 'create_channel', {
        name: 'Test Channel',
        channel: { category: 'General', uuid: channelId }
      })
      console.log(channel)

      const message = {
        last_seen: { First: null },
        channel: channel.channel,
        chunk: 0,
        message: {
          uuid: uuidv4(),
          content: 'Hello from alice :)'
        }
      }

      // chatter1 sends a message
      const returnedMessage = await chatter1.call(
        'chat',
        'create_message',
        message
      )
      console.log(returnedMessage)
      await waait(7500)

      expect(true).toBe(true)
    })
  })

  // tape.ok()
})

orchestrator.run()
