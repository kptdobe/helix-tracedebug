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

const ViewParameters = (props) => {
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
        <Column width="12%">Path</Column>
        <Column width="5%">Status</Column>
        <Column width="10%">Owner</Column>
        <Column width="10%">Repo</Column>
        <Column width="10%">Branch</Column>
        <Column width="10%">Ref</Column>
        <Column width="6%">Params</Column>
      </TableHeader>
      <TableBody>
        { props.spans.map((span, index) => {
          if (span.invisible) return;
          const hasParams = span.params && Object.keys(span.params).length > 0
          const paramsButtonLabel = `Params`

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
            <Cell><span className="pathCell" title={span.path}>{span.path}</span></Cell>
            <Cell>{span.status}</Cell>
            <Cell>{span.params && span.params.owner ? span.params.owner : ''}</Cell>
            <Cell>{span.params && span.params.repo ? span.params.repo : ''}</Cell>
            <Cell>{span.params && span.params.branch ? span.params.branch : ''}</Cell>
            <Cell>{span.params && span.params.ref ? span.params.ref : ''}</Cell>
            <Cell> 
              { hasParams && 
              <DialogTrigger type="fullscreenTakeover">
                <ActionButton>{paramsButtonLabel}</ActionButton>
                {(close) => (
                  <Dialog>
                    <Heading>Params</Heading>
                    <Divider />
                    <Content>
                      <Flex direction="column">
                        <div>{ getViewParams(span.params) }</div>
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


ViewParameters.propTypes = {
  id: PropTypes.string,
  spans: PropTypes.any
}

export default ViewParameters