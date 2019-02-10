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
      <ListItemText primary={`${assessor.firstName} ${assessor.lastName}`} secondary={assessor.email} />
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

  constructor(props, context) {
    super(props, context)
    this.state = {

    };
  }


  render() {
    let rows = this.props.assessments.map(e => { return { ...e } });

    return (
      <MaterialTable
        columns={[
          {
            title: 'Avatar', render: (rowData) => {
              return rowData && rowData.assessor ? <Avatar src={this.props.api.getAvatar(rowData.assessor)} /> : 'No Delegate'
            }
          },
          {
            title: 'Assessor', render: (dataRow) => {
              return `${dataRow.assessor.firstName} ${dataRow.assessor.lastName}`
            }
          },
          {
            title: 'Email', render: (dataRow) => {
              return `${dataRow.assessor.email}`
            }
          },
          { title: 'Complete', render: (dataRow) => {
              return dataRow.complete === true ? 'Yes' : 'No';
          } }
        ]}
        data={rows}
        actions={[
          (dataRow) => {
            return {
              icon: 'delete_outline',
              tooltip: 'Click to remove assessment for delegate',
              onClick: (event, rowData) => {
                console.log('Delete assessment', rowData);
              }
            }
          },          
        ]}
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

  constructor(props, context) {
    super(props, context)
    this.state = {

    };

    this.getNewAssessmentWidget = this.getNewAssessmentWidget.bind(this)
    this.getEmptyListItem = this.getEmptyListItem.bind(this)
  }

  getNewAssessmentWidget() {
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

  getEmptyListItem() {
    return (
      <ListItem key={0} dense={true}>
        <ListItemText primary={'There are no assessments available'} />
        <ListItemSecondaryAction>
          <Icon>add</Icon>
        </ListItemSecondaryAction>
      </ListItem>
    );
  }

  render() {

    return (
      <List>
        {this.props.assessments.map((assessment, ids) => {
          return <AssessmentListItem assessment={assessment} key={ids} onClick={this.props.onItemClick} />
        })}
        {this.getNewAssessmentWidget()}
      </List>
    );
  }
}

export default compose(withTheme(), withStyles(AssessmentList.styles))(AssessmentList)