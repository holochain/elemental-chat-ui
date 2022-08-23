export const callZome = async (_, rootState, zomeName, fnName, payload) => {
  console.log(`calling mock callZome with ${zomeName}.${fnName}() with payload : `, payload)
  switch (`${zomeName}.${fnName}`) {
    case 'chat.agent_stats':
      return {
        active: 1,
        agents: 1
      }
    case 'chat.create_channel':
      /* eslint-disable no-case-declarations */
      const { name, ...channel } = payload
      return {
        ...channel,
        info: {
          name,
          created_by: Buffer.from('uhCAkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64')
        },
        latest_chunk: channel.latestChunk || 0,
        activeChatters: []
      }

    case 'chat.list_channels':
      return rootState.elementalChat.channels.map(channel => {
        /* eslint-disable no-unused-vars */
        const { messages, activeChatters, unseen, dnaChannel } = channel
        return { ...dnaChannel, latest_chunk: 0 }
      })

    case 'chat.list_messages':
      const messageChannel = rootState.elementalChat.channels.find(c => c.entry.uuid === payload.channel.uuid)
      return messageChannel.messages

    case 'chat.list_all_messages':
      const allMessages = rootState.elementalChat.channels.map(c => ({ channel: c, messages: c.messages }))
      return allMessages

    case 'chat.create_message':
      return {
        ...payload,
        createdAt: 0,
        entryHash: Buffer.from('uhCEkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64'),
        createdBy: rootState.holochain.agentKey || Buffer.from('agent public key')
      }
    case 'chat.signal_specific_chatters':
      return null
    case 'chat.refresh_chatter':
      return null
    case 'profile.get_my_profile':
      return null
    case 'profile.update_my_profile':
      return Buffer.from('uhCEkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64')
    default:
      throw new Error(`mock callZome called with unknown zomeName.fnName: ${zomeName.fnName}`)
  }
}
