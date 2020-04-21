/*
* <license header>
*/

const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')

const { getData: getEpsagonData, constructSpans } = require('./epsagon')
const { getRootSpan, decorateSpans } = require('./coralogix')

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

    const root = await getRootSpan(params.id, params.CORALOGIX_API_TOKEN, logger)
    
    let spans = []
    if (root) {
      if (!root.empty) {
        spans.push(root);
      }
      if (root.pivotActivationId) {
        const epsagonData = await getEpsagonData(root.pivotActivationId, params.EPSAGON_API_TOKEN, logger)
        spans = spans.concat(constructSpans(epsagonData))
        spans = await decorateSpans(spans, params.CORALOGIX_API_TOKEN, logger)
      }
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
