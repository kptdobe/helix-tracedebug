const { URL } = require('url')
const fetch = require('node-fetch')

const CORALOGIX_API_ENDPOINT = 'https://coralogix-esapi.coralogix.com:9443/*/_search'

async function decorateSpans(spans, token, logger) {

    const activationIds = spans.map((span) => span.activationId).filter((id) => id)

    if (activationIds.length > 0) {
        spans.forEach((span) => {
            span.logs = []
        })

        // const currentTime = new Date().getTime()

        // // fetch content from external api endpoint
        let response = await fetch(CORALOGIX_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'token': `${token}`
            },
            body: JSON.stringify({
                'query': {
                    'query_string' : {
                        'query' : `(ow.activationId: ${activationIds.join(') OR (ow.activationId: ')})`,
                    }
            },
            'sort': [
                { 'timestamp.keyword': 'desc' }
            ],
            'size': 200
        }),

        })
        if (!response.ok) {
            logger.error('Error while requesting Coralogix API', response.body)
            throw new Error(`Request to ${CORALOGIX_API_ENDPOINT} failed with status code ${response.status}`)
        }

        const json = await response.json()
        if (json && json.hits && json.hits.hits) {
            json.hits.hits.forEach((hit) => {
                const activationId = hit._source.ow.activationId
                // get corresponding span
                const span = spans.filter((span) => span.activationId === activationId)[0]
                const s = hit._source
                const logEntry = {
                    activationId: s.ow.activationId,
                    actionName: s.ow.actionName,
                    applicationName: s.coralogix.metadata.applicationName,
                    date: new Date(s.timestamp),
                    level: s.level,
                    message: s.message,
                    subsystemName: s.coralogix.metadata.subsystemName,
                    timestamp: new Date(s.timestamp).getTime(),
                    transactionId: s.ow.transactionId,
                    url: s.cdn ? s.cdn.url : 'N/A',
                }
                span.url = s.cdn ? s.cdn.url : null

                // only source is useful
                span.logs.push(logEntry)
            })

            // sort the logs
            spans.forEach((span) => {
                span.logs = span.logs.sort((a,b) => {
                    if (a.timestamp < b.timestamp) return -1
                    if (a.timestamp > b.timestamp) return 1
                    return 0
                })
            })
        }
    }
    return spans
}

async function getActivationIdFromURL(url, token, logger) {

    const href = new URL(url).href

    let query = `(cdn.url.keyword: "${href}") AND (ow.actionName: "/helix/helix-services/dispatch*")`
    if (href.length > 70) {
        // keyword is limited to 70 characters, prefer standard search then
        query = `(cdn.url: "${href}") AND (ow.actionName: "/helix/helix-services/dispatch*")`
    }
    // retrieve first dispatch activation with cdn.url = url
    let response = await fetch(CORALOGIX_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': `${token}`
        },
        body: JSON.stringify({
            'query':{
                'query_string':{
                    query
                }
            },
            'sort': [
                { 'timestamp.keyword': 'desc' }
            ],
            'size': '1'
        }),

    })
    if (!response.ok) {
        logger.error('Error while requesting Coralogix API', response.body)
        throw new Error(`Request to ${CORALOGIX_API_ENDPOINT} failed with status code ${response.status}`)
    }

    const json = await response.json()
    if (json && json.hits && json.hits.hits && json.hits.hits.length > 0 && json.hits.hits[0]._source) {
        return json.hits.hits[0]._source.ow.activationId
    }

    return null
}

async function getActivationIdFromCDNRequestId(cdnRequestId, token, logger) {

    let query = `(actionOptions.params.__ow_headers.x-cdn-request-id: "${cdnRequestId}") AND (ow.actionName: "/helix/helix-services/dispatch*")`

    // retrieve first dispatch activation with cdn.url = url
    let response = await fetch(CORALOGIX_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': `${token}`
        },
        body: JSON.stringify({
            'query':{
                'query_string':{
                    query
                }
            },
            'sort': [
                { 'timestamp.keyword': 'desc' }
            ],
            'size': '1'
        }),

    })
    if (!response.ok) {
        logger.error('Error while requesting Coralogix API', response.body)
        throw new Error(`Request to ${CORALOGIX_API_ENDPOINT} failed with status code ${response.status}`)
    }

    const json = await response.json()
    if (json && json.hits && json.hits.hits && json.hits.hits.length > 0 && json.hits.hits[0]._source) {
        return json.hits.hits[0]._source.ow.activationId
    }

    return null
}

module.exports = {
    decorateSpans,
    getActivationIdFromURL,
    getActivationIdFromCDNRequestId
}