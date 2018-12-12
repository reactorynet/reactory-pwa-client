import React, { Component } from 'react';


export default class Assessment extends Component {
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

//export default withTheme()(Assessment);