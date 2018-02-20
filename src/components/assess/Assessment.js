import moment from 'moment';
import PropTypes from 'prop-types';
import { isNil } from 'lodash';

const defaultInstance = require("./defaultInstance.json");
const nil = isNil;

export default class Assessment {
    
    get id() { return this.m_id; }
    set id(value) { this.m_id = value; }

    get assessor() { return this.m_assessor; }
    set assessor(value) { this.m_assessor = value;}

    get assessorTitle() { 
        if(nil(this.assessor) === false) {
            return `${this.assessor.firstName} ${this.assessor.lastName}`
        }else{
            return 'NO ASSESSOR SET';
        }
    }

    get delegate() { return this.m_delegate;}
    set delegate(value) { this.m_delegate = value;}

    get delegateTitle() { 
        if(nil(this.delegate) === false) {
            return `${this.delegate.firstName} ${this.delegate.lastName}`
        }else{
            return 'NO DELEGATE SET';
        }
    }    

    get validFrom() { return this.m_validFrom; }
    set validFrom(value) { this.m_validFrom = moment(value); }

    get validTill() { return this.m_validTill; }
    set validTill(value) { this.m_validTill = moment(value); }

    get survey() { return this.m_survey; }
    set survey(value) { this.m_survey = value; }

    get answers() { return this.m_answers; }
    set answers(value) { this.m_answers = value; }

    static propTypes = {
        id: PropTypes.string.isRequired,
        assessor: PropTypes.object,
        delegate: PropTypes.object,
        validFrom: PropTypes.instanceOf(moment).isRequired,
        validTill: PropTypes.instanceOf(moment).isRequired,
        survey: PropTypes.object,
        answers: PropTypes.object
    };

    static defaultProps = { ...defaultInstance };
    
    constructor( props = defaultInstance ){
        this.id = props.id;
        this.assessor = props.assessor;
        this.delegate = props.delegate;
        this.validFrom = moment(props.validFrom);
        this.validTill = moment(props.validTill);
        this.survey = props.survey;
        this.answers = props.answer;
    }
}