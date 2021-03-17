import { fireEvent } from '@testing-library/vue'
import { renderAndWait } from '../test-utils'
import Channels from '@/Channels.vue'

test('increments value on click', async () => {
  // The render method returns a collection of utilities to query your component.
  const { getByText } = renderAndWait(Channels)

  // getByText returns the first matching node for the provided text, and
  // throws an error if no elements match or if more than one match is found.
  getByText('Times clicked: 0')

  const button = getByText('increment')

  // Dispatch a native click event to our button element.
  await fireEvent.click(button)
  await fireEvent.click(button)

  getByText('Times clicked: 2')
})
