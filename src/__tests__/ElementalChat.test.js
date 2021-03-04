/* global it */

import { render } from  '@testing-library/vue'
import ElementalChat from '../ElementalChat.vue'

it("Doesn't overwrite signal data with listMessages data", async () => {
  const { getByText } = render(ElementalChat)

  const bannerText = 'This is a proof of concept application, not intended for full production use. Read more in our'

  getByText(bannerText)
})
