export const callZome = async (_, rootState, zomeName, fnName, payload) => {
  console.log(`calling mock callZome with ${zomeName}.${fnName}() with payload : `, payload)
  switch (fnName) {
    case 'agent_stats':
      return {
        active: 1,
        agents: 1
      }
    case 'create_channel':
      /* eslint-disable no-case-declarations */
      const { name, ...channel } = payload
      return {
        ...channel,
        info: {
          name,
          createdAt: [0, 0]
        }
      }

    case 'list_channels':
      return rootState.elementalChat.channels.map(channel => {
        /* eslint-disable no-unused-vars */
        const { messages, activeChatters, unseen, dnaChannel } = channel
        return { ...dnaChannel, latest_chunk: 0 }
      })

    case 'list_messages':
      const messageChannel = rootState.elementalChat.channels.find(c => c.entry.uuid === payload.channel.uuid)
      return messageChannel.messages

    case 'create_message':
      return {
        ...payload,
        createdAt: [0, 0],
        entryHash: '',
        createdBy: ''
      }
    case 'signal_specific_chatters':
      return null
    case 'refresh_chatter':
      return null
    default:
      throw new Error(`mock callZome called with unknown fnName: ${fnName}`)
  }
}
