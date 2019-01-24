import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';

import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemIcon,
  ListItemSecondaryAction,
  ListItemText,
  Icon,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import MaterialTable from 'material-table';
import { withApi, ReactoryApi } from '../../api/ApiProvider';

const AssessmentItemStyles = (theme) => {
  return {

  }
}

const AssessmentListItem = compose(withApi, withStyles(AssessmentItemStyles), withTheme())((props) => {
  
  const { assessment, api } = props;
  const avatarSrc = api.getAvatar(assessment.assessor);
  const { assessor } = assessment;

  return (
    <ListItem key={props.key}>
      <ListItemAvatar>
        <Avatar src={avatarSrc} />
      </ListItemAvatar>
      <ListItemText title={`${assessor.firstName} ${assessor.lastName}`} />
      <ListItemSecondaryAction> 
      </ListItemSecondaryAction>
    </ListItem>
  );
});

class AssessmentTable extends Component {
  static propTypes = {
    assessments: PropTypes.array.isRequired,
    api: PropTypes.instanceOf(ReactoryApi),
    canAdd: PropTypes.bool,
    survey: PropTypes.object
  };

  static defaultProps = {
    assessments: [],
    survey: null,
    canAdd: false
  };

  static styles = (theme) => {
    return {

    }
  };

  constructor(props, context){
    super(props, context)
    this.state = {

    };
  }


  render(){
    const data = []    
    return (
      <MaterialTable
          columns={[
              { title: 'Assessor', field: 'fullName' },              
              { title: 'Email', field: 'email' },
              { title: 'Status', field: 'status' }              
          ]}
          data={data}
          title="Assessments"          
      />
    )
  }
}

export const AssessmentTableComponent = compose(withApi, withTheme(), withStyles(AssessmentTable.styles))(AssessmentTable)

class AssessmentList extends Component {

  static propTypes = {
    assessments: PropTypes.array.isRequired,
    api: PropTypes.instanceOf(ReactoryApi),
    canAdd: PropTypes.bool,
  };

  static defaultProps = {
    assessments: [], 
    canAdd: false,
  };

  static styles = (theme) => {
    return {

    }
  };

  constructor(props, context){
    super(props, context)
    this.state = {

    };

    this.getNewAssessmentWidget = this.getNewAssessmentWidget.bind(this)
    this.getEmptyListItem = this.getEmptyListItem.bind(this)
  }

  getNewAssessmentWidget(){
    return this.props.canAdd && 
    (
      <ListItem key={-1} dense={true}>      
        <ListItemText primary={'Click here to add a new Assessment'} />
        <ListItemSecondaryAction>
          <Icon>add</Icon>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }

  getEmptyListItem(){
    return (
      <ListItem key={0} dense={true}>
        <ListItemText primary={'There are no assessments available'} />
        <ListItemSecondaryAction>
          <Icon>add</Icon>
        </ListItemSecondaryAction>
      </ListItem>
  );
  }

  render(){

    return (      
      <List>        
        {this.props.assessments.map((assessment, ids) => {
          return <AssessmentListItem assessment={assessment} key={ids} onClick={this.props.onItemClick} />
        })}
        { this.getNewAssessmentWidget() }
      </List>
    );
  }
}

export default compose(withTheme(), withStyles(AssessmentList.styles))(AssessmentList)