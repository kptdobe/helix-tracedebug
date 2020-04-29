/*
* <license header>
*/

import React from 'react'
import PropTypes from 'prop-types'
import ErrorBoundary from 'react-error-boundary'

import moment from 'moment'

import Button from '@react/react-spectrum/Button'
import Heading from '@react/react-spectrum/Heading'
import InputGroup from '@react/react-spectrum/InputGroup'
import Label from '@react/react-spectrum/Label'
import Link from '@react/react-spectrum/Link'
import OverlayTrigger from '@react/react-spectrum/OverlayTrigger'
import Popover from '@react/react-spectrum/Popover'
import {Table, TR, TD, TH, THead, TBody} from '@react/react-spectrum/Table'
import Textfield from '@react/react-spectrum/Textfield'
import Tooltip from '@react/react-spectrum/Tooltip'
import Wait from '@react/react-spectrum/Wait'

// import ReactJson from 'react-json-view'

import './App.css'

import espagonLogo from '../resources/epsagon.svg'
import coralogixLogo from '../resources/coralogix.png'

import { actionWebInvoke } from './utils'
import actions from './config.json'

/* Here is your entry point React Component, this class has access to the Adobe Experience Cloud Shell runtime object */

export default class App extends React.Component {
  constructor (props) {
    super(props)

    // error handler on UI rendering failure
    this.onError = (e, componentStack) => {}

    // component to show if UI fails rendering
    this.fallbackComponent = ({ componentStack, error }) => (
      <React.Fragment>
        <h1 style={{ textAlign: 'center', marginTop: '20px' }}>Something went wrong :(</h1>
        <pre>{ componentStack + '\n' + error.message }</pre>
      </React.Fragment>
    )

    this.handleIdChange = this.handleIdChange.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)

    this.state = {
      id: new URL(window.location.href).hash.slice(1)
    }

    console.debug('runtime object:', this.props.runtime)
    console.debug('ims object:', this.props.ims)
  
  }

  static get propTypes () {
    return {
      runtime: PropTypes.any,
      ims: PropTypes.any
    }
  }

  async invoke (action, params) {
    this.setState({ loading: true })
    // set the authorization header and org from the ims props object
    const headers = {}
    if (this.props.ims.token) {
      headers.authorization = 'Bearer ' + this.props.ims.token
    }
    if (this.props.ims.org) {
      headers['x-org-id'] = this.props.ims.org
    }
    try {
      // invoke backend action
      const response = await actionWebInvoke(action, headers, params)
      console.log(`Response from ${action}:`, response)

      this.setState({ loading: false })

      // store the response
      this.setState({ response , errorMsg: '' })

      let spans = response.spans

      this.setState({ spans })

    } catch (e) {
      this.setState({ loading: false })
      // log and store any error message
      console.error(e)
      this.setState({ response: null, errorMsg: e.message, spans: null })
    }
  }

  handleIdChange(value) {
    this.setState({'id': value})
    const u = new URL(window.location.href);
    u.hash = value;
    window.location.href = u.href;
  }

  getViewParams(params) {
    if (params) {
      const list = Object.keys(params).map((k) => {
        const v = params[k]
        if (!(v instanceof Object)) {
          return (
            <li key={k}>{`${k}: ${v}`}</li>
          )
        } else {
          return (
            <li key={k}>{`${k}:`}{this.getViewParams(v)}</li>
          )
        }
        
      })
      return <ul>{list}</ul>
    }
    return <span>No data</span>
  }

  getViewResponse(response) {
    if (response) {
      const list = Object.keys(response).map((k) => {
        const v = response[k]
        if (!(v instanceof Object)) {
          return (
            <li key={k}>{`${k}: ${v}`}</li>
          )
        } else {
          return (
            <li key={k}>{`${k}:`}{this.getViewResponse(v)}</li>
          )
        }
        
      })
      return <ul>{list}</ul>
    }
    return <span>No data</span>
  }

  getViewLogs(logs) {
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

  search() {
    this.invoke('tracedebug', { 'id': this.state.id})
  }

  componentDidMount() {
    console.log('componentDidMount', this.state.id)
    if (this.state.id) {
      this.search()
    }
  }

  viewLocaleTime(date) {
    return moment(date).format('HH:mm:ss.SSS')
  }

  viewLocaleDate(date) {
    return moment(date).format('LL')
  }

  viewUTCTime(date) {
    return moment(date).utc().format('HH:mm:ss.SSS')
  }

  render () {
    return (
      // ErrorBoundary wraps child components to handle eventual rendering errors
      <ErrorBoundary onError={ this.onError } FallbackComponent={ this.fallbackComponent } >
        <div className="page-content">
          <div className="main">
            <Heading>Helix, trace and debug</Heading>
            <p>Welcome to "Helix, trace and debug" which helps you to trace your activations.</p>

            <Heading variant="subtitle1">Enter a activation id or an already requested url</Heading>
            <InputGroup>
              <Label>Activation ID or URL or CDN-Request-Id</Label>
              <Textfield id="id" name="id" value={this.state.id} onChange={v => this.handleIdChange(v)}/>
              <Button onClick={ this.search.bind(this) }>Search</Button>
            </InputGroup>
              { this.state.errorMsg &&
                <Tooltip variant="error">
                  Failure! See the error in your browser console.
                </Tooltip>
              }

              { !this.state.errorMsg && this.state.response && this.state.spans && this.state.spans.length > 0 &&
                <Tooltip variant="success">
                  We found some info for you.
                </Tooltip>
              }

              { !this.state.errorMsg && this.state.response && (!this.state.spans || this.state.spans.length === 0) &&
                <Tooltip variant="info">
                  We did not find anything for activation {this.state.id}.
                </Tooltip>
              }
              <p>Notes:</p>
              <ul>
                <li>the search is limited to the last 7 days</li>
                <li>URL longer than 70 characters cannot be searched by strict equality, they are then searched by "starts with url" - you may have unexpected results</li>
              </ul>

            {
              this.state.loading && 
                <Wait centered size="L" />
            }

            {
              this.state.spans && this.state.spans.length > 0 &&
              <div>
                <br/>
                <p>
                  <span><b>Trace start date (local):</b> {this.viewLocaleDate(this.state.spans[0].date)}</span>
                  <br/>
                  <span><b>Trace start time (local):</b> {this.viewLocaleTime(this.state.spans[0].date)}</span>
                  <br/>
                  <span><b>Total duration:</b> {(this.state.spans[0].duration / 1000000).toFixed(2)}s</span>
                </p>
                <Table>
                  <THead>
                    <TH>Time (UTC)</TH>
                    <TH>Action</TH>
                    <TH>Activation ID</TH>
                    <TH>URL</TH>
                    <TH>Path</TH>
                    <TH>Status</TH>
                    <TH><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></TH>
                    <TH><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></TH>
                    <TH>Params</TH>
                    <TH>Response</TH>
                    <TH>Logs</TH>
                    <TH>Data</TH>
                    <TH>Replay</TH>
                  </THead>
                  <TBody>
                    { this.state.spans.map((span, index) => {
                      if (span.invisible) return;
                      const indentClassName = `indent${span.level}`
                      const espagonLink = `https://dashboard.epsagon.com/spans/${span.spanId}`
                      const coralogixLink = `https://helix.coralogix.com/#/query/logs?query=${span.activationId || this.state.id}`
                      const hasParams = span.params && Object.keys(span.params).length > 0
                      const paramsButtonLabel = `${span.params ? Object.keys(span.params).length : ''} params`

                      const hasData = span.data && Object.keys(span.data).length > 0
                      const dataButtonLabel = `Data`

                      const hasResponse = !!span.response

                      const hasLogs = span.logs && span.logs.length > 0
                      const logsButtonLabel = `${hasLogs ? span.logs.length : ''} logs`

                      const errorClassName = span.status >= 500 ? 'error' : ''

                      let replayURL = ''
                      let canReplay = false
                      if (span.params) {
                        canReplay = true
                        const u = new URL(`https://adobeioruntime.net/api/v1/web${span.name}`)
                        for(let p in span.params) {
                          u.searchParams.append(p, span.params[p]);
                        }
                        replayURL = u.toString();
                      } else {
                        if (span.name === 'fastly') {
                          canReplay = true
                          replayURL = span.url
                        }
                      }
                      return <TR key={index} className={errorClassName}>
                        <TD>{this.viewUTCTime(span.date)}</TD>
                        <TD className={indentClassName}>{span.name}</TD>
                        <TD>{span.activationId}</TD>
                        <TD><Link href={span.url}>{span.url}</Link></TD>
                        <TD>{span.path}</TD>
                        <TD>{span.status}</TD>
                        <TD>  { span.spanId &&
                          <a href={espagonLink} target="_new"><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></a>
                        }
                        </TD>
                        <TD><a href={coralogixLink} target="_new"><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></a></TD>
                        <TD> { hasParams &&
                            <OverlayTrigger placement="left">
                              <Button label={paramsButtonLabel} variant="primary" />
                              <Popover title="Action parameters" variant="default">
                                { this.getViewParams(span.params) }
                              </Popover>
                            </OverlayTrigger>
                          }
                        </TD>
                        <TD> { hasResponse &&
                            <OverlayTrigger placement="left">
                              <Button label="Response" variant="primary" />
                              <Popover title="Action response" variant="default">
                                { this.getViewResponse(span.response) }
                              </Popover>
                            </OverlayTrigger>
                          }
                        </TD>
                        <TD> { hasLogs && 
                          <OverlayTrigger placement="left">
                            <Button label={logsButtonLabel} variant="primary" />
                            <Popover title="Action logs" variant="default">
                              { this.getViewLogs(span.logs) }
                            </Popover>
                          </OverlayTrigger>
                          }
                        </TD>
                        <TD> { hasData && 
                          <OverlayTrigger placement="left">
                            <Button label={dataButtonLabel} variant="primary" />
                            <Popover title="Entry data" variant="default">
                              { this.getViewParams(span.data) }
                            </Popover>
                          </OverlayTrigger>
                          }
                        </TD>
                        <TD> { canReplay && 
                          <Button label="Replay" variant="primary" onClick={() => { console.log('button clicked!!'); window.open(replayURL)} }/>
                        }
                        </TD>
                      </TR>
                    })}
                  </TBody>
                </Table>
                <br/>
                <br/>
                {/* <ReactJson src={this.state.response.spans} /> */}
              </div>
            }
          </div>
        </div>
      </ErrorBoundary>
    )
  }
}
