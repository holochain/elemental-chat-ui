require('regenerator-runtime/runtime.js') // TODO: follow-up on need for this import
// const { fireEvent, within, act, wait } = require('@testing-library/vue')
// const msgpack = require('@msgpack/msgpack')
const { v4: uuidv4 } = require('uuid')
const waait = require('waait')
const { conductorConfig, elChatDna, orchestrator } = require('./setup/tryorama.js')
const { TIMEOUT } = require('./setup/globals.js')
const { closeTestConductor } = require('./setup/helpers.js')
// const { renderAndWait } = require('../test-utils.js')
// const HApp = require('@/applications/ElementalChat/views/ElementalChat.vue')

console.log(' START with >>>>>>>>>>>>>>>> ', orchestrator)

orchestrator.registerScenario('New Message Scenario', async (scenario, t) => {
  console.log(' >>>> SCENARIO ', scenario)

  describe('New Message Flow', () => {
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
})

test('test ', () => {
  orchestrator.run()
})
