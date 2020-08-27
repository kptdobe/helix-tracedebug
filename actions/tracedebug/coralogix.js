const { URL } = require('url')
const fetch = require('node-fetch')

const { isURL, isCDNRequestId } = require('./utils')

const CORALOGIX_API_ENDPOINT = 'https://coralogix-esapi.coralogix.com:9443/*/_search'

async function runQuery(query, token, logger) {
    let response = await fetch(CORALOGIX_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'token': `${token}`
        },
        body: JSON.stringify(query),

    })
    if (!response.ok) {
        logger.error('Error while requesting Coralogix API', response.body)
        throw new Error(`Request to ${CORALOGIX_API_ENDPOINT} failed with status code ${response.status}`)
    }

    const json = await response.json()
    if (json && json.hits && json.hits.hits && json.hits.hits.length > 0) {
        return json.hits.hits;
    }
    return [];
}

async function decorateSpans(spans, token, logger) {

    const activationIds = spans.map((span) => span.activationId).filter((id) => id)

    if (activationIds.length > 0) {
        // const currentTime = new Date().getTime()

        // // fetch content from external api endpoint
        let hits = await runQuery({
            'query': {
                'query_string' : {
                    'query' : `(ow.activationId: ${activationIds.join(') OR (ow.activationId: ')})`,
                }
            },
            'sort': [{
                'coralogix.timestamp': {
                    'order': 'desc'
                }
            }],
            'size': 200
        }, token, logger)

        hits.forEach((hit) => {
            const s = hit._source
            if (s.message) {
                //only add to log entries with messages

                const activationId = hit._source.ow.activationId
                // get corresponding span
                const span = spans.filter((span) => span.activationId === activationId)[0]
                
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

                span.logs = span.logs || []
                // only source is useful
                span.logs.push(logEntry)
            }
        })

        // sort the logs
        spans.forEach((span) => {
            if (span.logs) {
                span.logs = span.logs.sort((a,b) => {
                    if (a.timestamp < b.timestamp) return -1
                    if (a.timestamp > b.timestamp) return 1
                    return 0
                })
            }
        })
    }
    return spans
}

async function findCDNRequestId(id, token, logger) {
    if (isCDNRequestId(id)) {
        return id
    }

    let query
    if (isURL(id)) {
        const href = new URL(id).href
        let query = `(cdn.url.keyword: "${href}")`
        if (href.length > 70) {
            // keyword is limited to 70 characters, prefer standard search then but might lead to uncertain results
            query = `(cdn.url: "${href}")`
        }
        query += ' AND (coralogix.metadata.applicationName: fastly) AND (cdn.request.method: GET)'

        const hits = await runQuery({
            'query':{
                'query_string':{
                    query
                }
            },
            'sort': [{
                'coralogix.timestamp': {
                    'order': 'desc'
                }
            }],
            'size': 1
        }, token, logger);
    
        if (hits.length > 0) {
            const s = hits[0]._source;
            if (s.cdn && s.cdn.request) {
                return s.cdn.request.id
            }
        }
    } else {
        let query = `("${id}") AND (_exists_: ow.transactionId)`
        let hits = await runQuery({
            'query':{
                'query_string':{
                    query
                }
            },
            'sort': [{
                'coralogix.timestamp': {
                    'order': 'desc'
                }
            }],
            'size': 1
        }, token, logger);
    
        if (hits.length > 0) {
            const s = hits[0]._source;
            if (s.ow && s.ow.transactionId) {
                query = `((ow.transactionId: "${s.ow.transactionId}") AND (_exists_: actionOptions.params.__ow_headers.x-cdn-request-id)) OR ((ow.activationId: "${s.ow.activationId}") AND (_exists_: cdn.request.id))`
                hits = await runQuery({
                    'query':{
                        'query_string':{
                            query
                        }
                    },
                    'sort': [{
                        'coralogix.timestamp': {
                            'order': 'desc'
                        }
                    }],
                    'size': 1
                }, token, logger);
            
                if (hits.length > 0) {
                    const s = hits[0]._source;
                    if (s.actionOptions && s.actionOptions.params && s.actionOptions.params.__ow_headers && s.actionOptions.params.__ow_headers['x-cdn-request-id']) {
                        return s.actionOptions.params.__ow_headers['x-cdn-request-id']
                    } else {
                        return (s.cdn && s.cdn.request && s.cdn.request.id) ? s.cdn.request.id : null;
                    }
                }
            }
        }
    }

    return null
}

async function getRootSpan(id, token, logger) {
    const requestId = await findCDNRequestId(id, token, logger)

    if (!requestId) return null;

    // should give 2 types of results: the fastly entry and the dispatch activation logs
    const query = `(cdn.request.id.keyword: "${requestId}") OR ((actionOptions.params.__ow_headers.x-cdn-request-id: "${requestId}") AND (ow.actionName: "/helix/helix-services/dispatch*"))`

    const hits = await runQuery({
            'query':{
                'query_string':{
                    query
                }
            },
            'sort': [{
                'coralogix.timestamp': {
                    'order': 'desc'
                }
            }],
            'size': 100
    }, token, logger)

    if (hits.length > 0) {
        let pivotActivationId;
        let root;
        let name;

        hits.forEach((hit) => {
            const s = hit._source;
            if (s.coralogix.metadata.applicationName === 'fastly') {
                // found fastly entry
                root = s;
                if (hits.length === 1 ) {
                    // only a fastly entry with maybe an activation id
                    if (s.ow && s.ow.activationId) {
                        pivotActivationId = s.ow.activationId;
                    }
                }
                name = root.cdn.url
            } else {
                // use pivot activationId from non fastly log, i.e the dispatch log
                pivotActivationId = s.ow.activationId;
            }
        })

        if (!root) {
            // no fastly log entry, take the last entry in the hits
            return {
                pivotActivationId,
                empty: true
            }
        }

        return {
            pivotActivationId, 
            duration: root.cdn.time.elapsed,
            // error: span.error,
            activationId: root.ow.activationId !== '(null)' ? root.ow.activationId : null,
            name: name || root.coralogix.metadata.applicationName,
            // operation: span.operation_name,
            // spanId: span.span_id,
            timestamp: root.cdn.time.start_msec,
            date: root.cdn.time.start,
            // params: span.tags.params,
            path: root.cdn.request.url,
            response: root.cdn.response,
            // parentSpanId: span.references.length > 0 ? span.references[0].spanID : null,
            status: root.cdn.response.status,
            url: root.cdn.url,
            data: root
        }
    }

    return null
} 

module.exports = {
    decorateSpans,
    getRootSpan
}