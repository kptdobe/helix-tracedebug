/*
* <license header>
*/

import React from 'react'
import PropTypes from 'prop-types'
import ErrorBoundary from 'react-error-boundary'

import moment from 'moment'

import { Provider } from '@react-spectrum/provider'
import { theme } from '@react-spectrum/theme-default'
import { Button, ActionButton, ButtonGroup } from '@react-spectrum/button'
import { Heading } from '@react-spectrum/text'
import { Link } from '@react-spectrum/link'
import { Table, Row, Cell, TableBody, TableHeader, Column } from '@react-spectrum/table'
import { TextField } from '@react-spectrum/textfield'
import { Form } from '@react-spectrum/form'
import { ProgressCircle } from '@react-spectrum/progress'
import { Well } from '@react-spectrum/well'
import { DialogTrigger, Dialog } from '@react-spectrum/dialog'
import { IllustratedMessage } from '@react-spectrum/illustratedmessage'
import { Content, View } from '@react-spectrum/view'
import { Divider } from '@react-spectrum/divider'
import { Flex } from '@react-spectrum/layout'

import './App.css'

import NotFound from '@spectrum-icons/illustrations/NotFound';
import Error from '@spectrum-icons/illustrations/Error';
import espagonLogo from '../resources/epsagon.svg'
import coralogixLogo from '../resources/coralogix.png'

import { actionWebInvoke } from './utils'

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
      id: new URL(window.location).searchParams.get('id')
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
    this.setState({ loading: true, response: null, errorMsg: null, spans: null })
    // set the authorization header and org from the ims props object
    const headers = {}
    // set the authorization header and org from the ims props object
    if (this.props.ims.token && !headers.authorization) {
      headers.authorization = 'Bearer ' + this.props.ims.token
    }
    if (this.props.ims.org && !headers['x-gw-ims-org-id']) {
      headers['x-gw-ims-org-id'] = this.props.ims.org
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
    const params = new URL(window.location.href).searchParams;
    params.set('id', value);
    window.location.search = `?${params.toString()}`;
  }

  handleKeyDown(evt) {
      if (evt.charCode === 13) {
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
        <Provider theme={theme} colorScheme="dark" scale="medium">
          <main>
            <article>
              <Heading level={1}>Helix, trace and debug</Heading>
              <Content>Welcome to "Helix, trace and debug" which helps you to trace your activations.</Content>

              <View>
                <Content>Enter an Activation ID, an already requested URL or a CDN-Request-Id:</Content>
                <TextField width="size-3600" id="id" name="id" aria-label="Enter an Activation ID, an already requested URL or a CDN-Request-Id" value={this.state.id} onChange={this.handleIdChange} onKeyDown={this.handleKeyDown}/>
                <Button marginStart="size-150" maxWidth="size-1000" onClick={ this.search.bind(this) } variant="cta">Search</Button>
              </View>

              <br/>

              {
                !this.state.loading && !this.state.errorMsg && !this.state.response &&
                <Well>
                  Notes:
                  <ul>
                    <li>the search is limited to the last 7 days</li>
                    <li>URL longer than 70 characters cannot be searched by strict equality, they are then searched by "starts with url" - you may have unexpected results</li>
                  </ul>
                </Well>
              }

              {
                this.state.loading && 
                <IllustratedMessage>
                  <ProgressCircle aria-label="Loading…" size="L" isIndeterminate />
                </IllustratedMessage>
              }

              { 
                !this.state.errorMsg && this.state.response && (!this.state.spans || this.state.spans.length === 0) &&
                  <IllustratedMessage>
                    <NotFound />
                    <Heading>No Results</Heading>
                    <Content>Try another search</Content>
                  </IllustratedMessage>
              }

              { this.state.errorMsg &&
                  <IllustratedMessage>
                    <Error />
                    <Heading>Error</Heading>
                    <Content>Failure! See the error in your browser console.</Content>
                </IllustratedMessage>
              }

              {
                this.state.spans && this.state.spans.length > 0 &&
                <div>
                  <Content>
                    <p>
                      <span><b>Trace start date (local):</b> {this.viewLocaleDate(this.state.spans[0].date)}</span>
                      <br/>
                      <span><b>Trace start time (local):</b> {this.viewLocaleTime(this.state.spans[0].date)}</span>
                      <br/>
                      <span><b>Total duration:</b> {(this.state.spans[0].duration / 1000000).toFixed(2)}s</span>
                      <br/>
                      <span><b>URL:</b> <Link variant="primary"><a href={this.state.spans[0].url}>{this.state.spans[0].url}</a></Link></span>
                    </p>
                  </Content>
                  <Table aria-label="Results">
                    <TableHeader>
                      <Column width="7%">Time (UTC)</Column>
                      <Column width="25%">Action</Column>
                      <Column width="16%">Activation ID</Column>
                      <Column width="12%">Path</Column>
                      <Column width="4%">Status</Column>
                      <Column width="4%"><img className="custom-icon" src={espagonLogo} alt="View in Epsagon" title="View in Epsagon"/></Column>
                      <Column width="4%"><img className="custom-icon" src={coralogixLogo} alt="View in Coralogix" title="View in Coralogix"/></Column>
                      <Column width="7%">Response</Column>
                      <Column width="7%">Logs</Column>
                      <Column width="7%">Replay</Column>
                      <Column width="7%">Data</Column>
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
                        return <Row key={index} UNSAFE_className={errorClassName}>
                          <Cell>{this.viewUTCTime(span.date)}</Cell>
                          <Cell>
                            <span className="indentOffset">{this.createIndent(span.level)}</span>
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
                                        <div>{ this.getViewResponse(span.response) }</div>
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
                                      <div>{ this.getViewLogs(span.logs) }</div>
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
                                      <div>{ this.getViewParams(span.data) }</div>
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
                  <br/>
                  <br/>
                </div>
              }
            </article>
          </main>
        </Provider>
      </ErrorBoundary>
    )
  }
}
