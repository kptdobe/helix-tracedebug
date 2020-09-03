/*
* <license header>
*/

import React from 'react'
import ErrorBoundary from 'react-error-boundary'

import { Provider } from '@react-spectrum/provider'
import { theme } from '@react-spectrum/theme-default'

import { ActionGroup, Item } from '@react-spectrum/button'

import Traces from './Traces'
import AccessLogs from './AccessLogs'

import './App.css'

import { Flex } from '@react-spectrum/layout'

import helixLogo from '../resources/helix.png'

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

  showArticle(index) {
    document.querySelectorAll('article').forEach((e, i) => {
      if (i === index && e.classList.contains('hidden')) {
        e.classList.remove('hidden')
      } else {
        e.classList.add('hidden')
      }
    });
  }

  render () {
    return (
      // ErrorBoundary wraps child components to handle eventual rendering errors
      <ErrorBoundary onError={ this.onError } FallbackComponent={ this.fallbackComponent } >
        <Provider theme={theme} colorScheme="dark" scale="medium">
          <nav>
          <Flex direction="row" height="size-200" gap="size-100">
              <img className="helix-logo" src={helixLogo} alt="Helix" title="Helix"/>
              <a href="#" onClick={() => this.showArticle(0) }>Traces</a>
              <a href="#" onClick={() => this.showArticle(1) }>Access Logs</a>
            </Flex>
          </nav>
          <main>
            <article><Traces runtime={ this.props.runtime } ims={ this.props.ims }></Traces></article>
            <article className="hidden"><AccessLogs runtime={ this.props.runtime } ims={ this.props.ims }></AccessLogs></article>
          </main>
        </Provider>
      </ErrorBoundary>
    )
  }
}
