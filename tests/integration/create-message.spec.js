// import { fireEvent, within, act, wait } from '@testing-library/vue'
// import msgpack from '@msgpack/msgpack'
import { v4 as uuidv4 } from 'uuid'
// import waait from 'waait'
// import { renderAndWait } from '../utils'
import { orchestrator, conductorConfig, elChatDna } from './setup/tryorama'
// import HApp from '@/applications/ElementalChat/views/ElementalChat.vue'

orchestrator.registerScenario('New Message Scenario', async s => {
  const [conductor] = await s.players([conductorConfig])
  // install app into tryorama conductor
  const [[chatter1Happ], [chatter2Happ]] = await conductor.installAgentsHapps([[[elChatDna]], [[elChatDna]]])
  // destructure and define agents
  const [chatter1] = chatter1Happ.cells
  console.log(chatter1)
  const [chatter2] = chatter2Happ.cells
  console.log(chatter2)

  // Create a channel
  const channelId = uuidv4()
  const channel = await chatter1.call('chat', 'create_channel', { name: 'Test Channel', channel: { category: 'General', uuid: channelId } })
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
  const returnedMessage = await chatter1.call('chat', 'create_message', message)

  it('returns message', () => {
    console.log(returnedMessage)
  })

  // it('Arrives at Book Entries Page with Display Title', async () => {
  //   const { alice } = await s.players({ alice: conductorConfig }, true)

  //   const { getByText, debug } = await renderAndWait(<HApp />)
  //   const welcomeMsg = 'Welcome to your generated Happ UI'
  //   expect(getByText(welcomeMsg)).toBeInTheDocument()

  //   await act(async () => {
  //     fireEvent.click(getByText('Book'))
  //   })
  //   expect(getByText('Book Entry')).toBeInTheDocument()

  //   debug()
  //   await alice.kill()
  // })

  // it('Creates and Lists new Book Entries', async () => {
  //   const { alice } = await s.players({ alice: conductorConfig }, true)

  //   const { getByText, getByLabelText, debug } = await renderAndWait(<Message />)

  //   // await act(async () => {
  //   //   fireEvent.click(getByText('Book'))
  //   // })

  //   await wait(() => getByText('Book Entry'))

  //   const book = {
  //     author: 'ut nulla quam',
  //     title: 'ipsam nobis cupiditate',
  //     topic: 'sed dignissimos debitis'
  //   }

  //   act(() => {
  //     fireEvent.change(getByLabelText('author'), { target: { value: book.author } })
  //     fireEvent.change(getByLabelText('title'), { target: { value: book.title } })
  //     fireEvent.change(getByLabelText('topic'), { target: { value: book.topic } })
  //   })
  //   await act(async () => {
  //     fireEvent.click(getByText('Submit'))
  //     await waait(0)
  //   })

  //   await s.consistency()
  //   expect(getByText(book.author)).toBeInTheDocument()
  //   expect(getByText(book.title)).toBeInTheDocument()
  //   expect(getByText(book.topic)).toBeInTheDocument()

  //   debug()
  //   await alice.kill()
  // })
})

orchestrator.run()
