import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'redux';
import lodash from 'lodash';
import {
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemSecondaryAction,
  ListItemText,
  Icon,
} from '@material-ui/core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { Typography } from '@material-ui/core';
import MaterialTable from 'material-table';
import { withApi, ReactoryApi } from '../../api/ApiProvider';
import gql from 'graphql-tag';
import moment from 'moment';

const AssessmentItemStyles = (theme) => {
  return {

  }
}

const AssessmentListItem = compose(withApi, withStyles(AssessmentItemStyles), withTheme)((props) => {

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
      assessments: lodash.cloneDeep(props.assessments || []),
      deleteIndex: -1
    };

    this.deleteAssessment = this.deleteAssessment.bind(this);
    this.sendReminder = this.sendReminder.bind(this);
  }

  sendReminder(assessment){
    //console.log(`Must send a reminder to ${assessment.assessor.firstName}`, assessment);

    return;

    /* 
    if(assessment.complete === false){
      const { api } = this.props;
      api.graphqlMutation(gql``,{ }).then(result => {

      }).catch(exception => {

      })
    }
    */
  }

  deleteAssessment(assessment, confirmed = false){
    //console.log('Must delete assessment', { assessment, confirmed });
    const that = this;
    if(confirmed === true) {
      const { api } = this.props;
      const { deleteIndex, assessments } = this.state;
      if(that.deleteIndexTimeout) clearTimeout(that.deleteIndexTimeout)

      api.graphqlMutation(gql`mutation DeleteAssessment($id: String!, $remove: Boolean) {
        deleteAssessment(id: $id, remove: $remove)
      }`, { 
        id: assessment.id,
        remove: true,
      }).then(result => {
        if(result.error){
          console.error('Error Deleting Assessment', result.error)
        }

        if(result.data) {
          const newAssessmentsState = lodash.cloneDeep(assessments);
          if(result.data.deleted === true && result.data.removed !== true) {
            //soft delete            
            newAssessmentsState[deleteIndex].deleted = true;
          } else {
            //ripped it from the database and all eternity
            lodash.remove(newAssessmentsState, { id: assessment.id })
          }

          that.setState({ assessments: newAssessmentsState, deleteIndex: -1 })
        }
      }).catch(exception => {
        console.error(`Some serious problems running graphql`, exception)
      });
    } else {
      //not confirmed
      if(assessment.tableData.id) {
        this.setState({ deleteIndex: assessment.tableData.id }, ()=>{
          that.deleteIndexTimeout = setTimeout(()=>{
            that.setState({ deleteIndex: -1 })
          },  2750)
        });
      }      
    }
  }

  render() {
    let rows = lodash.cloneDeep(this.state.assessments);
    const that = this;
    const { theme } = this.props;
    return (
      <MaterialTable
        columns={[
          {
            title: 'Info', render: (rowData) => {
              if(rowData.tableData.id === that.state.deleteIndex) {
                return <Typography>Are you sure you want to delete this survey?</Typography>
              }              
              if(rowData.updatedAt) return <Typography variant="body1">Last modified {moment(rowData.updatedAt).format('DD MM YYYY')}</Typography>
              if(rowData.createdAt) return <Typography variant="body1">Created {moment(rowData.createdAt).format('DD MM YYYY')}</Typography>
            }
          },
          {
            title: 'Avatar', render: (rowData) => {
              return rowData && rowData.assessor ? <Avatar src={that.props.api.getAvatar(rowData.assessor)} /> : 'No Delegate'
            }
          },
          {
            title: 'Assessor', render: (dataRow) => {
              return <Typography>{dataRow.assessor.firstName} {dataRow.assessor.lastName}</Typography>
            }
          },          
          { title: 'Complete', render: (dataRow) => {
              return dataRow.complete === true ? <Icon>favorite</Icon> : <Icon>hourglass_empty</Icon>;
          } }
        ]}
        data={rows}
        actions={[
          (dataRow) => {            
            if(this.state.deleteIndex === -1) {
              return {
                icon: 'delete_outline',
                tooltip: `Click to remove assessment input from delegate ${dataRow.assessor.firstName}`,
                onClick: (event) => {
                  that.deleteAssessment(dataRow, false)
                }
              }
            } else {
              if(dataRow.tableData.id === this.state.deleteIndex){
                return {
                  icon: 'delete_forever',
                  tooltip: `Click again to confirm removal assessment input from delegate ${dataRow.assessor.firstName}`,
                  onClick: (event) => {
                    that.deleteAssessment(dataRow, true)
                  },
                  iconProps: {
                    color: theme.palette.primary.dark
                  }
                }
              }
            }              
          },
          (dataRow) => {
            if(dataRow.complete === false){
              return {
                icon: 'alarm',
                tooltip: `Click to send a reminder to ${dataRow.assessor.firstName} ${dataRow.assessor.lastName}`,
                onClick: (event) => {
                  that.sendReminder(dataRow, false)
                },
                iconProps: {
                  color: theme.palette.primary.dark
                }
              }
            } else {
              return null;
            }
          }          
        ]}
        title="Assessments"
      />
    )
  }
}

export const AssessmentTableComponent = compose(withApi, withTheme, withStyles(AssessmentTable.styles))(AssessmentTable)

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

export default compose(withTheme, withStyles(AssessmentList.styles))(AssessmentList)