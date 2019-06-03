import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { withRouter } from 'react-router';
import { compose } from 'redux';
import { Query } from 'react-apollo';
import { Survey } from './Assessment';
import { Typography } from '@material-ui/core';
import { withStyles, withTheme} from '@material-ui/core/styles';
import { ReactoryApi, withApi } from '../../api/ApiProvider';
import { nil } from '../util';


const InvalidSurveyTypeComponent = (props, context) => {
    return <Typography>The survey type {props.survey.surveyType} is not supported</Typography>
};

class AssessmentWrapper extends Component {
    constructor(props, context) {
        super(props, context);
        this.state = {
            open: false,
            assessment: props.assessment || null
        };

        this.renderQuery = this.renderQuery.bind(this);

        this.componentDefs = props.api.getComponents([
            'towerstone.OwlyListItem',
            'towerstone.TowerStone360Assessment', 
            'towerstone.TowerStone180Assessment', 
            'plc.PlcDefaultAssessment',
            'core.Loading',
        ]);
    }
    static propTypes = {
        api: PropTypes.instanceOf(ReactoryApi).isRequired,
        survey: PropTypes.object,
        assessment: PropTypes.object,
        theme: PropTypes.object,        
    }

    static defaultProps = {
        api: null,        
        theme: null,
        assessment: null,
        survey: null
    }

    static styles = theme => {
        return {}
    }
    
    renderQuery() {
        const { match, api } = this.props;
        const self = this;
        const { Loading } = this.componentDefs;
        
        if(match.params.length === 0) return <p>No Assesment Id</p>
        const assessmentId = match.params[0];                    
        return (
        <Query query={api.queries.Assessments.assessmentWithId} variables={{ id: assessmentId }} >
            {({ loading, error, data}) => {                
                debugger;
                if(loading === true) return (<Loading title="Loading assessment data, please wait"/>);
                if(nil(error) === false) return (<p>Error while loading assessment ${error.message}</p>);
                if(data && data.assessmentWithId) {
                    const assessment = { ...data.assessmentWithId };                                                
                    const { TowerStone180Assessment, TowerStone360Assessment, PlcDefaultAssessment } = this.componentDefs;
                    let AssessmentComponent = null;                
                    switch(assessment.survey.surveyType){
                        case Survey.SurveyTypes.TowerStone180: {
                            AssessmentComponent = TowerStone180Assessment;
                            break;                                
                        }
                        case Survey.SurveyTypes.TowerStone360: {
                            AssessmentComponent = TowerStone360Assessment;
                            break;
                        }
                        case Survey.SurveyTypes.PLCDefault: {
                            AssessmentComponent = PlcDefaultAssessment;
                            break;
                        }
                        default: {
                            AssessmentComponent = InvalidSurveyTypeComponent;
                            break;
                        }
                    }
                    return <AssessmentComponent survey={assessment.survey} assessment={assessment} />                                                         
                } else {
                    return (<Typography>Could not load assessment</Typography>);
                } 
            }}
        </Query>);                                       
    }

    render(){

        try {
            return this.renderQuery();
        } catch (exc) {
            return <Typography>{ exc.message }</Typography>
        }
        

        
    }
}

const AssessmentWrapperComponent = compose(
    withApi,
    withRouter,
    withStyles(AssessmentWrapper.styles),
    withTheme
  )(AssessmentWrapper);

  export default AssessmentWrapperComponent;