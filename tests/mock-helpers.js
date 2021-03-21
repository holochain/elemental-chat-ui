/* global jest */
import { toUint8Array } from '@/utils'

export const UI_VERSION_MOCK = '0.0.1-test'
export const DNA_VERSION_MOCK = 'uhC0kvrTHaVNrHaYMBEBbP9nQDA8xdat45mfQb9NtklMJ1ZOfqmZh'
export const DNA_HASH_MOCK = toUint8Array(Buffer.from(DNA_VERSION_MOCK, 'base64'))
export const AGENT_KEY_MOCK = toUint8Array(Buffer.from('uhCAkKCV0Uy9OtfjpcO/oQcPO6JN6TOhnOjwkamI3dNDNi+359faa', 'base64'))

/// Window Mock helpers:
// --------------------
export const navigateToNextLocation = () => {
  const location = window.location.href + '/next'
  window.location.replace(location)
}

export const mockWindowReplace = jest.fn()
const mockWindowOpen = jest.fn()
// without a copy of window, a circular dependency problem occurs
const originalWindow = { ...window }
export const windowSpy = jest.spyOn(global, 'window', 'get')
export const mockWindowRedirect = (hrefLocation) => windowSpy.mockImplementation(() => ({
  ...originalWindow,
  location: {
    ...originalWindow.location,
    href: hrefLocation,
    replace: mockWindowReplace
  },
  open: mockWindowOpen
}))
