import React, { Component } from 'react';
import RaisedButton from 'material-ui/RaisedButton';
import Dialog from 'material-ui/Dialog';
import { deepOrange500 } from 'material-ui/styles/colors';
import FlatButton from 'material-ui/FlatButton';
import Paper from 'material-ui/Paper';
import {GridList, GridTile} from 'material-ui/GridList';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import { BasicContainer, CenteredContainer, textStyle, paperStyles } from '../util'; 
import {PieChart} from 'react-easy-chart';


const muiTheme = getMuiTheme({
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
        return (
            <CenteredContainer>
                <BasicContainer>
                <Paper styles={{...paperStyles, maxWidth:'350px'}}>
                    <PieChart
                        size={200}
                        innerHoleSize={170}
                        data={[
                        { key: 'A', value: 100, color: '#aaac84' },
                        { key: 'B', value: 200, color: '#dce7c5' },
                        { key: 'C', value: 50, color: '#e3a51a' }
                        ]}/>                    
                </Paper>
                
                <Paper styles={{...paperStyles, maxWidth:'350px'}}>
                    <PieChart
                        size={200}
                        innerHoleSize={170}
                        data={[
                        { key: 'A', value: 154, color: '#aaac84' },
                        { key: 'B', value: 654, color: '#dce7c5' },
                        { key: 'C', value: 320, color: '#e3a51a' }
                        ]}/> 
                </Paper>
                </BasicContainer>
            </CenteredContainer>
        )
    }
}

export default Main;