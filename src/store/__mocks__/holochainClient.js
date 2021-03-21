export const holochainClient = {
  appInfo: payload => {
    console.log('calling holochainClient.appInfo with payload: ', payload)
    Promise.resolve({
      cell_data: [{
        cell_id: 'test_cell_id',
        cell_nick: 'test_cell_nick'
      }]
    })
  },
  callZome: (_) => {
    console.error('calling holochainClient.callZome, but should be calling mock callZome...')
  }
}
