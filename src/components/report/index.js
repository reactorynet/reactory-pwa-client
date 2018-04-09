import React, { Component } from 'react';
import ReportDashboard from './ReportDashboard';
import {    
    Route,    
  } from 'react-router-dom';

export default class ReportRouterComponent extends Component {

    render(){
        return (
            <Route path='/reports' component={ReportDashboard} />
        )
    }
}