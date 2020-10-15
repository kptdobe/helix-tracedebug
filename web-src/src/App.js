/*
* <license header>
*/

import React from 'react'
import PropTypes from 'prop-types'
import ErrorBoundary from 'react-error-boundary'

import moment from 'moment'

import {
  Button,
  Content,
  defaultTheme as theme,
  Heading,
  IllustratedMessage, 
  Link,
  ProgressCircle,
  Provider,
  Radio,
  RadioGroup,
  TextField,
  View,
  Well 
} from '@adobe/react-spectrum'

import './App.css'

import NotFound from '@spectrum-icons/illustrations/NotFound';
import Error from '@spectrum-icons/illustrations/Error';

import ViewRequests from './ViewRequests'
import ViewParameters from './ViewParameters'

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
    this.handleViewChange = this.handleViewChange.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    this.componentDidMount = this.componentDidMount.bind(this)
    
    const url = new URL(window.location.href)
    let id = url.searchParams.get('id')
    if (id) {
      url.searchParams.delete('id')
      url.hash = id
      window.location.href = url.href
    } else {
      id = url.hash.slice(1)
    }

    this.state = {
      id,
      view: 'requests'
      // view: 'params'
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
    const u = new URL(window.location.href)
    u.hash = value
    window.location.href = u.href
  }

  handleViewChange(value) {
    this.setState({'view': value})
  }

  handleKeyDown(evt) {
    if (evt.keyCode === 13) {
      // enter key pressed
      this.search()
    }
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
                <TextField width="size-6000" id="id" name="id" aria-label="Enter an Activation ID, an already requested URL or a CDN-Request-Id" value={this.state.id} onChange={this.handleIdChange} onKeyDown={this.handleKeyDown}/>
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

                  <RadioGroup label="View" orientation="horizontal" value={this.state.view} onChange={this.handleViewChange} >
                    <Radio value="requests">Requests</Radio>
                    <Radio value="params">Parameters</Radio>
                  </RadioGroup>
                  {
                    this.state.view === 'requests' &&
                      <ViewRequests id={this.state.id} spans={this.state.spans}/>
                  }
                  {
                    this.state.view === 'params' &&
                      <ViewParameters id={this.state.id} spans={this.state.spans}/>
                  }
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
