
import React, { Component } from 'react';
import Iframe from 'react-iframe'

const defaultProps = {
  url: 'http://localhost:3001/',
  width: '100%',
  height: '100%',
  className: null,
  display: 'initial',
  position: 'relative'
};

class FramedWindow extends Component {

  static defaultProps = defaultProps;

  render(){
    return (<Iframe { ...this.props } />)
  }
}

export default FramedWindow;
