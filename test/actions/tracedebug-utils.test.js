/*
* <license header>
*/
const { isURL, isCDNRequestId } = require('../../actions/tracedebug/utils')

describe('Utils', () => {
  test('isURL', () => {
    expect(isURL('https://www.hlx.page')).toBe(true)
    expect(isURL('https://www.hlx.page/index.html')).toBe(true)
    expect(isURL('www.hlx.page')).toBe(false)
    expect(isURL('a088839a7f5747ac88839a7f5777acbe')).toBe(false)
    expect(isURL('adcb424f-c397-d51c-a3cd-76d2559a0b40')).toBe(false)
  })
  
  test('isCDNRequestId', () => {
    expect(isCDNRequestId('https://www.hlx.page')).toBe(false)
    expect(isCDNRequestId('https://www.hlx.page/index.html')).toBe(false)
    expect(isCDNRequestId('www.hlx.page')).toBe(false)
    expect(isCDNRequestId('a088839a7f5747ac88839a7f5777acbe')).toBe(false)
    expect(isCDNRequestId('12345678-4567890abcbc')).toBe(false)
    expect(isCDNRequestId('adcb424f-c397-d51c-a3cd-76d2559a0b40-abcd')).toBe(false)
    // old format
    expect(isCDNRequestId('12345678-90ab-cde-f123-4567890abcbc')).toBe(true)
    // new format
    expect(isCDNRequestId('adcb424f-c397-d51c-a3cd-76d2559a0b40')).toBe(true)
  })
})