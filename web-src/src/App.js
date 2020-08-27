/*
* <license header>
*/

import React from 'react'
import ErrorBoundary from 'react-error-boundary'

import { Provider } from '@react-spectrum/provider'
import { theme } from '@react-spectrum/theme-default'

import Traces from './Traces'

import './App.css'

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

    console.debug('runtime object:', this.props.runtime)
    console.debug('ims object:', this.props.ims)
  
  }

  render () {
    return (
      // ErrorBoundary wraps child components to handle eventual rendering errors
      <ErrorBoundary onError={ this.onError } FallbackComponent={ this.fallbackComponent } >
        <Provider theme={theme} colorScheme="dark" scale="medium">
          <main>
            <Traces runtime={ this.props.runtime } ims={ this.props.ims }></Traces>
          </main>
        </Provider>
      </ErrorBoundary>
    )
  }
}
