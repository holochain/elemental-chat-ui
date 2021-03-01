import Message from '@/applications/ElementalChat/components/Message.vue'

export const callTest = () => {
  describe('Message.vue', () => {
    it.skip('renders props.msg when passed', () => {
      console.log('Message: ', Message)
    })
  })
}
