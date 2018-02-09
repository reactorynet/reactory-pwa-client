import React, { Component } from 'react';
import { deepOrange500 } from 'material-ui/colors';
import { createMuiTheme } from 'material-ui/styles';
import { withTheme } from 'material-ui/styles';
//import muiThemeable from 'material-ui/styles/muiThemeable';

const muiTheme = createMuiTheme({
    palette: {
        accent1Color: deepOrange500,
    },
});



class Main extends Component {
    constructor(props, context) {
        super(props, context);

        this.handleRequestClose = this.handleRequestClose.bind(this);
        this.handleTouchTap = this.handleTouchTap.bind(this);

        this.state = {
            open: false,
        };
    }

    handleRequestClose() {
        this.setState({
            open: false,
        });
    }

    handleTouchTap() {
        this.setState({
            open: true,
        });
    }

    render() {
        const { theme } = this.props;
        let DashboardComponent = theme.content.dashboardComponent;
        
        return (
            <DashboardComponent muiTheme={theme}/>                
        )
    }
}

export default withTheme()(Main);