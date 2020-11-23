import React from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import { withRouter } from 'react-router-dom';
import { Query, Mutation } from '@apollo/client';
import { withStyles, withTheme } from '@material-ui/core/styles';
import {
  ExpansionPanel, 
  ExpansionPanelDetails,
  ExpansionPanelSummary,
} from '@material-ui/core';
import Typography from '@material-ui/core/Typography';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import { withApi } from '../../../api/ApiProvider';
import { ReactoryApi } from "../../../api/ReactoryApi";

const styles = theme => ({
  root: {
    width: '100%',
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0,
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(15),
    color: theme.palette.text.secondary,
  },
});

class ControlledExpansionPanels extends React.Component {

  propTypes = {
    config: PropTypes.object,
    organizationId: PropTypes.string
  }



  constructor(props, context){
    super(props, context);
    this.state = {
      expanded: null,
    };
    this.handleChange = this.handleChange.bind(this);
    this.componentDefs = props.api.getComponents(['forms.SurveySettingsForm'])
  }

  

  

  handleChange = panel => (event, expanded) => {
    this.setState({
      expanded: expanded ? panel : false,
    });
  };

  render() {
    const { classes } = this.props;
    const { expanded } = this.state;
    const { SurveySettingsForm } = this.componentDefs;

    return (
      <div className={classes.root}>
        <ExpansionPanel expanded={expanded === 'panel1'} onChange={this.handleChange('panel1')}>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>Survey settings</Typography>            
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            <SurveySettingsForm formContext={{organizationId: this.props.organizationId}}/>
          </ExpansionPanelDetails>
        </ExpansionPanel>        
        <ExpansionPanel expanded={expanded === 'panel3'} onChange={this.handleChange('panel3')}>
          <ExpansionPanelSummary expandIcon={<ExpandMoreIcon />}>
            <Typography className={classes.heading}>Advanced settings</Typography>            
          </ExpansionPanelSummary>
          <ExpansionPanelDetails>
            
          </ExpansionPanelDetails>
        </ExpansionPanel>        
      </div>
    );
  }
}

ControlledExpansionPanels.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default compose(withApi, withRouter, withTheme, withStyles(styles))(ControlledExpansionPanels);