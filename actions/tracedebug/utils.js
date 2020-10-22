

/*
* <license header>
*/
const { URL }  = require('url')

function isURL(id) {
    try {
      new URL(id)
      return true
    } catch (e) {
      return false
    }
  }
  
  const PATTERN_CDNREQUESTID = /^[\dabcdef]{8}-[\dabcdef]{4}-[\dabcdef]{3,4}-[\dabcdef]{4}-[\dabcdef]{12}$/gm
  
  function isCDNRequestId(id) {
    // format like 12345678-90ab-acde-f123-4567890abcbc
    return !!id.match(PATTERN_CDNREQUESTID)
  }

module.exports = {
    isURL,
    isCDNRequestId
}