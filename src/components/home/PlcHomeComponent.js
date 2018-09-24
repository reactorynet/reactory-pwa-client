import React, { Component } from 'react';
import Paper from '@material-ui/core/Paper';
//import muiThemeable from '@material-ui/core/styles/muiThemeable';
import Menu, { MenuItem } from '@material-ui/core/Menu';
import Button from '@material-ui/core/Button';
import { Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle } from '@material-ui/core/Toolbar';
import PlcLogo from '../../themes/plc/images/logo.png';

class PlcHomeComponent extends Component {
    constructor(props, context){
        super(props, context);
        this.state = {
            value: 1
        }
        this.handleChange = this.handleChange.bind(this);
    }

    handleChange( evt ){
        let valueChange = evt.target.value;
        if(isNaN(valueChange) === true) return;

        this.setState({value: valueChange * 1})
    }

    render() {
        const { muiTheme } = this.props;
        console.log('Theme component', muiTheme)
        return (
            <div>
                <Toolbar>
                    <ToolbarGroup firstChild={true}>
                        <Menu value={this.state.value} onChange={this.handleChange}>
                            <MenuItem value={1} primaryText="All Assessments" />
                            <MenuItem value={2} primaryText="All Peers" />
                            <MenuItem value={3} primaryText="All Tasks" />                            
                        </Menu>
                    </ToolbarGroup>
                    <ToolbarGroup>                        
                        <Button label="Create Broadcast" primary={true} />
                    </ToolbarGroup>
                </Toolbar>                                            
            </div>
        );
    }
}

export default PlcHomeComponent;