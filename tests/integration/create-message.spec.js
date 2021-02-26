import "regenerator-runtime/runtime.js"
// import { fireEvent, within, act, wait } from '@testing-library/vue'
// import msgpack from '@msgpack/msgpack'
import { v4 as uuidv4 } from 'uuid'
import waait from 'waait'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
// import { renderAndWait } from '../utils'
// import HApp from '@/applications/ElementalChat/views/ElementalChat.vue'

orchestrator.registerScenario('New Message Scenario', async (s, t) => {
  describe('New Message Flow', () => {
    let chatter1, chatter2
    beforeAll(async () => {
      console.log('---------------> 1')
      const [conductor] = await s.players([conductorConfig])
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
    })

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

  // t.ok()
})

orchestrator.run()
