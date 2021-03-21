export const callZome = async (_, __, zomeName, fnName, payload) => {
  console.log(`calling mock callZome with ${zomeName}.${fnName}() with payload : `, payload)
  switch (fnName) {
    case 'agent_stats':
      return {
        active: 1,
        agents: 1
      }
    case 'create_channel':
      /* eslint-disable no-case-declarations */
      const { name, ...channelEntry } = payload
      return {
        ...channelEntry,
        info: {
          name,
          createdAt: [0, 0]
        }
      }
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
