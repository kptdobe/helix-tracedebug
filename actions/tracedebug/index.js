/*
* <license header>
*/
const { URL }  = require('url')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')

const { getData: getEpsagonData, constructSpans } = require('./epsagon')
const { decorateSpans, getActivationIdFromURL, getActivationIdFromCDNRequestId } = require('./coralogix')


function isURL(id) {
  try {
    new URL(id)
    return true
  } catch (e) {
    return false
  }
}

const PATTERN_CDNREQUESTID = /^[\dabcdef]{8}-[\dabcdef]{4}-[\dabcdef]{3}-[\dabcdef]{4}-[\dabcdef]{12}$/gm

function isCDNRequestId(id) {
  // format like 12345678-90ab-cde-f123-4567890abcbc
  return id.match(PATTERN_CDNREQUESTID)
}

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' })

  try {
    // 'info' is the default level if not set
    logger.info('Calling the main action')

    // log parameters, only if params.LOG_LEVEL === 'debug'
    logger.debug(stringParameters(params))

    // check for missing request input parameters and headers
    const requiredParams = [ 'id' ]
    const errorMessage = checkMissingRequestInputs(params, requiredParams)
    if (errorMessage) {
      // return and log client errors
      return errorResponse(400, errorMessage, logger)
    }

    // extract the user Bearer token from the input request parameters
    const token = getBearerToken(params)

    let id = params.id
    if (isURL(id)) {
      id = await getActivationIdFromURL(id, params.CORALOGIX_API_TOKEN, logger)
    } else {
      if (isCDNRequestId(id)) {
        id = await getActivationIdFromCDNRequestId(id, params.CORALOGIX_API_TOKEN, logger)
      }
    }

    let spans = []
    if (id) {
      const epsagonData = await getEpsagonData(id, params.EPSAGON_API_TOKEN, logger)
      spans = constructSpans(epsagonData)
      spans = await decorateSpans(spans, params.CORALOGIX_API_TOKEN, logger)
    }

    const response = {
      statusCode: 200,
      body: {
        spans: spans
      }
    }
    
    return response
  } catch (error) {
    // log any server errors
    logger.error(error)
    // return with 500
    return errorResponse(500, `Server error: ${error.message}`, logger)
  }
}

exports.main = main
