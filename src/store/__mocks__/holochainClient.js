import { callZome } from './callZome'

export const holochainClient = Promise.resolve({
  appInfo: payload => {
    console.log('calling holochainClient.appInfo with payload: ', payload)
    return {
      cell_data: [{
        cell_id: 'test_cell_id',
        cell_nick: 'test_cell_nick'
      }]
    }
  },
  callZome: callZome
})
