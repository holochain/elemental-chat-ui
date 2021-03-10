export const callZome = async (_, __, zomeName, fnName, payload) => {
  console.log('calling mock callZome with', zomeName, fnName, payload)

  switch (fnName) {
    case 'create_channel':
      return {
        ...payload,
        info: {
          ...payload.info,
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
    case 'signal_chatters':
      return null
    default:
      throw new Error(`mock callZome called with unknown fnName: ${fnName}`)
  }
}
