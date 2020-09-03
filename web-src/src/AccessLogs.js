/*
* <license header>
*/

import React from 'react'
import PropTypes from 'prop-types'

import { Heading } from '@react-spectrum/text'
import { View, Content } from '@react-spectrum/view'
import { TextField } from '@react-spectrum/textfield'
import { Button } from '@react-spectrum/button'

/* Here is your entry point React Component, this class has access to the Adobe Experience Cloud Shell runtime object */

export default class AccessLogs extends React.Component {
  constructor (props) {
    super(props)

    this.handleIdChange = this.handleIdChange.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)
    
    this.state = {
      id: 'https://theblog--adobe.hlx.page/'
    }
  }

  static get propTypes () {
    return {
      runtime: PropTypes.any,
      ims: PropTypes.any
    }
  }

  handleIdChange(value) {
    this.setState({'id': value})
  }

  handleKeyDown(evt) {
    if (evt.keyCode === 13) {
      // enter key pressed
      this.search()
    }
  }

  search() {
    this.invoke('accesslogs', { 'id': this.state.id})
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

  render () {
    return (
      <div>
        <Heading level={1}>Access Logs</Heading>
        <View>
          <Content>Enter an Helix hostname:</Content>
          <TextField width="size-3600" id="id" name="id" aria-label="Enter an Helix hostname" value={this.state.id} onChange={this.handleIdChange} onKeyDown={this.handleKeyDown}/>
          <Button marginStart="size-150" maxWidth="size-1000" onClick={ this.search.bind(this) } variant="cta">Search</Button>
        </View>
      </div>
    )
  }
}
