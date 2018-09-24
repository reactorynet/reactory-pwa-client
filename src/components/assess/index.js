import React, { Component } from 'react';
import { deepOrange500 } from '@material-ui/core/colors';
import { createMuiTheme } from '@material-ui/core/styles';
import { withTheme } from '@material-ui/core/styles';
//import muiThemeable from '@material-ui/core/styles/muiThemeable';

const muiTheme = createMuiTheme({
    palette: {
        accent1Color: deepOrange500,
    },
});



class Assessment extends Component {
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
        let AssessmentComponent = theme.content.assessmentComponent;
        
        return (
            <AssessmentComponent muiTheme={theme}/>                
        )
    }
}

export default withTheme()(Assessment);