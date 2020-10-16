/*
* <license header>
*/

import React, { useState } from 'react'
import PropTypes from 'prop-types'

import moment from 'moment'

import {
  ActionButton,
  Button,
  Content,
  Dialog,
  DialogTrigger,
  Divider,
  Flex,
  Heading
} from '@adobe/react-spectrum'
import { 
  Cell,
  Column,
  Row,
  Table,
  TableBody,
  TableHeader
} from '@react-spectrum/table'

import './App.css'

import espagonLogo from '../resources/epsagon.svg'
import coralogixLogo from '../resources/coralogix.png'

/* Here is your entry point React Component, this class has access to the Adobe Experience Cloud Shell runtime object */

const ViewRequests = (props) => {
  const [state, setState] = useState({
    actionSelected: null,
    actionResponse: null,
    actionResponseError: null,
    actionHeaders: null,
    actionHeadersValid: null,
    actionParams: null,
    actionParamsValid: null,
    actionInvokeInProgress: false,
    actionResult: ''
  })

  function getViewParams(params) {
    if (params) {
      const list = Object.keys(params).map((k) => {
        const v = params[k]
        if (!(v instanceof Object)) {
          return (
            <li key={k}>{`${k}: ${v}`}</li>
          )
        } else {
          return (
            <li key={k}>{`${k}:`}{getViewParams(v)}</li>
          )
        }
        
      })
      return <ul>{list}</ul>
    }
    return <span>No data</span>
  }

  function getViewResponse(response) {
    if (response) {
      const list = Object.keys(response).map((k) => {
        const v = response[k]
        if (!(v instanceof Object)) {
          return (
            <li key={k}>{`${k}: ${v}`}</li>
          )
        } else {
          return (
            <li key={k}>{`${k}:`}{getViewResponse(v)}</li>
          )
        }
        
      })
      return <ul>{list}</ul>
    }
    return <span>No data</span>
  }

  function getViewLogs(logs) {
    if (logs) {
      const list = logs.map((entry, index) => {
        return (
          <li key={index}>{`${entry.date}: ${entry.message}`}</li>
        )
      })
      return <ul>{list}</ul>
    }
    return <span>No logs</span>
  }

  function viewLocaleTime(date) {
    return moment(date).format('HH:mm:ss.SSS')
  }

  function viewLocaleDate(date) {
    return moment(date).format('LL')
  }

  function viewUTCTime(date) {
    return moment(date).utc().format('HH:mm:ss.SSS')
  }

  function createIndent(level) {
    const indent = [];
    for(let i=0;i<level;i++) {
      indent.push(<span key={i} className="indentBox"></span>)
    }
    return indent;
  }

  return (
    <Table aria-label="Results">
      <TableHeader>
        <Column width="3%"></Column>
        <Column width="7%">Time (UTC)</Column>
        <Column width="25%">Action</Column>
        <Column width="16%">Activation ID</Column>
        <Column width="12%">Path</Column>
        <Column width="4%">Status</Column>
        <Column width="4%"><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></Column>
        <Column width="4%"><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></Column>
        <Column width="7%">Response</Column>
        <Column width="6%">Logs</Column>
        <Column width="6%">Replay</Column>
        <Column width="6%">Data</Column>
      </TableHeader>
      <TableBody>
        { props.spans.map((span, index) => {
          if (span.invisible) return;
          const espagonLink = `https://dashboard.epsagon.com/spans/${span.spanId}`
          const coralogixLink = `https://helix.coralogix.com/#/query/logs?query=${span.activationId || props.id}`

          const hasData = span.data && Object.keys(span.data).length > 0
          const dataButtonLabel = `Data`

          const hasResponse = !!span.response

          const hasLogs = span.logs && span.logs.length > 0
          const logsButtonLabel = `${hasLogs ? span.logs.length : ''} logs`

          const rowClassName = span.error || span.status >= 500 ? 'error' : span.status >= 200 && span.status < 300 ? 'success' : ''

          let replayURL = ''
          let canReplay = false
          if (span.host) {
            if (span.invokedName) {
              canReplay = true
              const u = new URL(`${span.host}/api/v1/web${span.invokedName}`)
              if (span.params) {
                for(let p in span.params) {
                  u.searchParams.append(p, span.params[p]);
                }
              }
              replayURL = u.toString();
            } else {
              if (span.path) {
                canReplay = true
                const u = new URL(`${span.host.indexOf('https') === 0 ? span.host : 'https://' + span.host}${span.path}`)
                if (span.params) {
                  for(let p in span.params) {
                    u.searchParams.append(p, span.params[p]);
                  }
                }
                replayURL = u.toString();
              }
            }
          } else {
            if (span.name === 'fastly') {
              canReplay = true
              replayURL = span.url
            }
          }
          return <Row key={index} UNSAFE_className={rowClassName}>
            <Cell>{index}</Cell>
            <Cell>{viewUTCTime(span.date)}</Cell>
            <Cell>
              <span className="indentOffset">{createIndent(span.level)}</span>
              <span className="spanName" title={span.invokedName || span.name}>{span.invokedName || span.name}</span>
            </Cell>
            <Cell>{span.activationId}</Cell>
            <Cell><span className="pathCell" title={span.path}>{span.path}</span></Cell>
            <Cell>{span.status}</Cell>
            <Cell>  { span.spanId &&
              <a href={espagonLink} target="_new"><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></a>
            }
            </Cell>
            <Cell><a href={coralogixLink} target="_new"><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></a></Cell>
            <Cell> { hasResponse &&
                <DialogTrigger type="fullscreenTakeover">
                  <ActionButton>Response</ActionButton>
                  {(close) => (
                    <Dialog>
                      <Heading>Response</Heading>
                      <Divider />
                      <Content>
                        <Flex direction="column">
                          <div>{ getViewResponse(span.response) }</div>
                          <Button alignSelf="center" variant="cta" onPress={close}>Close</Button>
                        </Flex>
                      </Content>
                    </Dialog>
                  )}
                </DialogTrigger>
            }
            </Cell>
            <Cell> 
              { hasLogs && 
              <DialogTrigger type="fullscreenTakeover">
                <ActionButton>{logsButtonLabel}</ActionButton>
                {(close) => (
                  <Dialog>
                    <Heading>Action logs</Heading>
                    <Divider />
                    <Content>
                      <Flex direction="column">
                        <div>{ getViewLogs(span.logs)}</div>
                        <Button alignSelf="center" variant="cta" onPress={close}>Close</Button>
                      </Flex>
                    </Content>
                  </Dialog>
                )}
              </DialogTrigger>
            }
            </Cell>
            <Cell> { canReplay && 
              <ActionButton onClick={() => { window.open(replayURL)} }>Replay</ActionButton>
            }
            </Cell>
            <Cell> 
              { hasData && 
              <DialogTrigger type="fullscreenTakeover">
                <ActionButton>{dataButtonLabel}</ActionButton>
                {(close) => (
                  <Dialog>
                    <Heading>Data</Heading>
                    <Divider />
                    <Content>
                      <Flex direction="column">
                        <div>{ getViewParams(span.data) }</div>
                        <Button alignSelf="center" variant="cta" onPress={close}>Close</Button>
                      </Flex>
                    </Content>
                  </Dialog>
                )}
              </DialogTrigger>
            }
            </Cell>
          </Row>
        })}
      </TableBody>
    </Table>
  )
}


ViewRequests.propTypes = {
  id: PropTypes.string,
  spans: PropTypes.any
}

export default ViewRequests