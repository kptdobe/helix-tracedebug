/*
* <license header>
*/

import React from 'react'
import PropTypes from 'prop-types'
import ErrorBoundary from 'react-error-boundary'

import moment from 'moment'

import { Button, ActionButton } from '@react-spectrum/button'
import { Heading } from '@react-spectrum/text'
import { Link } from '@react-spectrum/link'
import { Table, Row, Cell, TableBody, TableHeader, Column } from '@react-spectrum/Table'
import { TextField } from '@react-spectrum/textfield'
import { Form } from '@react-spectrum/form'
import { ProgressCircle } from '@react-spectrum/progress'
import { Well } from '@react-spectrum/well'
import { DialogTrigger, Dialog } from '@react-spectrum/dialog'

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
    this.handleKeyDown = this.handleKeyDown.bind(this)
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
    const u = new URL(window.location.href)
    u.hash = value
    window.location.href = u.href
  }

  handleKeyDown(evt) {
    if (evt.keyCode === 13) {
      // enter key pressed
      this.search()
    }
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

  createIndent(level) {
    const indent = [];
    for(let i=0;i<level;i++) {
      indent.push(<span key={i} className="indentBox"></span>)
    }
    return indent;
  }

  render () {
    return (
      // ErrorBoundary wraps child components to handle eventual rendering errors
      <ErrorBoundary onError={ this.onError } FallbackComponent={ this.fallbackComponent } >
        <div className="page-content">
          <div className="main">
            <Heading>Helix, trace and debug</Heading>
            <p>Welcome to "Helix, trace and debug" which helps you to trace your activations.</p>

            <Heading variant="subtitle1">Enter a activation id, an already requested url or a CDN request id</Heading>
            <Form maxWidth="size-3600">
              <TextField label="Activation ID or URL or CDN-Request-Id" id="id" name="id" value={this.state.id} onChange={this.handleIdChange} onKeyDown={this.handleKeyDown}/>
              <Button onClick={ this.search.bind(this) } variant="primary">Search</Button>
              { this.state.errorMsg &&
                <Well UNSAFE_className="error">
                  Failure! See the error in your browser console.
                </Well>
              }

              { !this.state.errorMsg && this.state.response && this.state.spans && this.state.spans.length > 0 &&
                <Well UNSAFE_className="success">
                  We found some info for you.
                </Well>
              }

              { !this.state.errorMsg && this.state.response && (!this.state.spans || this.state.spans.length === 0) &&
                <Well UNSAFE_className="info">
                  We did not find anything for activation {this.state.id}.
                </Well>
              }
            </Form>

            <p>Notes:</p>
            <ul>
              <li>the search is limited to the last 7 days</li>
              <li>URL longer than 70 characters cannot be searched by strict equality, they are then searched by "starts with url" - you may have unexpected results</li>
            </ul>


            {
              this.state.loading && 
                <ProgressCircle aria-label="Loading…" size="L" isIndeterminate />
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
                  <br/>
                  <span><b>URL:</b> <Link variant="primary"><a href={this.state.spans[0].url}>{this.state.spans[0].url}</a></Link></span>
                </p>
                <Table>
                  <TableHeader>
                    <Column>Time (UTC)</Column>
                    <Column>Action</Column>
                    <Column>Activation ID</Column>
                    <Column>Path</Column>
                    <Column>Status</Column>
                    <Column><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></Column>
                    <Column><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></Column>
                    <Column>Response</Column>
                    <Column>Logs</Column>
                    <Column>Replay</Column>
                    <Column>Data</Column>
                  </TableHeader>
                  <TableBody>
                    { this.state.spans.map((span, index) => {
                      if (span.invisible) return;
                      const espagonLink = `https://dashboard.epsagon.com/spans/${span.spanId}`
                      const coralogixLink = `https://helix.coralogix.com/#/query/logs?query=${span.activationId || this.state.id}`

                      const hasData = span.data && Object.keys(span.data).length > 0
                      const dataButtonLabel = `Data`

                      const hasResponse = !!span.response

                      const hasLogs = span.logs && span.logs.length > 0
                      const logsButtonLabel = `${hasLogs ? span.logs.length : ''} logs`

                      const errorClassName = span.error || span.status >= 500 ? 'error' : ''

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
                      return <Row key={index} className={errorClassName}>
                        <Cell>{this.viewUTCTime(span.date)}</Cell>
                        <Cell className="spanNameCell">
                          <span className="indentOffset">{this.createIndent(span.level)}</span>
                          <span className="spanName">{span.invokedName || span.name}</span>
                        </Cell>
                        <Cell>{span.activationId}</Cell>
                        <Cell className="pathCell" title={span.path}>{span.path}</Cell>
                        <Cell>{span.status}</Cell>
                        <Cell>  { span.spanId &&
                          <a href={espagonLink} target="_new"><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></a>
                        }
                        </Cell>
                        <Cell><a href={coralogixLink} target="_new"><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></a></Cell>
                        <Cell> { hasResponse &&
                            <DialogTrigger placement="left">
                              <ActionButton>Response</ActionButton>
                              <Dialog title="Action response" variant="default">
                                { this.getViewResponse(span.response) }
                              </Dialog>
                            </DialogTrigger>
                          }
                        </Cell>
                        <Cell> { hasLogs && 
                          <DialogTrigger placement="left">
                            <ActionButton>{logsButtonLabel}</ActionButton>
                            <Dialog title="Action logs" variant="default">
                              { this.getViewLogs(span.logs) }
                            </Dialog>
                          </DialogTrigger>
                          }
                        </Cell>
                        <Cell> { canReplay && 
                          <Button label="Replay" variant="primary" onClick={() => { window.open(replayURL)} }/>
                        }
                        </Cell>
                        <Cell> { hasData && 
                          <DialogTrigger placement="left">
                            <ActionButton>{dataButtonLabel}</ActionButton>
                            <Dialog title="Entry data" variant="default">
                              { this.getViewParams(span.data) }
                            </Dialog>
                          </DialogTrigger>
                          }
                        </Cell>
                      </Row>
                    })}
                  </TableBody>
                </Table>
                <br/>
                <br/>
              </div>
            }
          </div>
        </div>
      </ErrorBoundary>
    )
  }
}
