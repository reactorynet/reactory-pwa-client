import React, { Component,Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withRouter, match  } from 'react-router-dom';
import { Button, Icon, IconButton } from '@material-ui/core';
import { withStyles, withTheme,  } from '@material-ui/core/styles';
import moment, { Moment } from 'moment';
import ReactoryApi, { withApi } from '@reactory/client-core/api';
import FroalaWidget from '@reactory/client-core/components/reactory/widgets/FroalaWidget';

interface ReactoryStaticContentProps {
  api: ReactoryApi,
  classes?: any,
  showTitle: boolean,
  title: string,
  slug: string,
  slugSource?: string,
  slugSourceProps?: any,
  defaultValue?: any,
  placeHolder?: string, 
  propertyBag?: any,
  viewMode?: string,
  formFqn?: string,  
  mode?: string | "edit" | "view",
  templateEngine: 'lodash',
  match: match,
  location: any,
  history: any,  
  editRoles?: string[],
  viewRoles?: string[],
  autoSave?: string[],
  helpTopics?: string[],
  helpTitle?: string,
  throttle?: number,
  showEditIcon?: boolean

}

interface ReactoryStaticContent {
  title: string,
  content: string,
  createdBy?: {
    id: string,
    fullName: string,
  },
  createdAt: Moment,
  topics?: string[],
  published?: boolean,
}

interface ReactoryStaticContentState {
  content: ReactoryStaticContent,
  original: string | null,
  editing: boolean,
  found: boolean,
}


class StaticContent extends Component<ReactoryStaticContentProps, ReactoryStaticContentState> {
  components: any = {};
  static propTypes: any;
  static defaultProps: any;
  static styles: any
  constructor(props, context){
    super(props, context);
    const { api } = props;
    this.state = {
      content: {
        title: `Loading`,
        content: 'Loading',
        createdBy: {
          id: null,
          fullName: 'Loading',
        },
        createdAt: moment(),
        topics: [],
        published: false,
      },
      editing: props.isEditing === true,
      original: null,
      found: false,      
    };

    this.getContent = this.getContent.bind(this);    
    this.components = api.getComponents(['material-ui.MaterialCore']);
  }

  getContent(formData = undefined){
    const that = this;
    const { api } = this.props;

    const getSlug = () => {
      if(that.props.slugSource === 'property') return that.props.slug;

      if(that.props.slugSource === 'route' && typeof that.props.slugSourceProps === 'object') {      
        const { paramId } = that.props.slugSourceProps;
        return that.props.match.params[paramId];
      }
    };


    this.props.api.graphqlQuery(`
    query ReactoryGetContentBySlug($slug: String!) {
      ReactoryGetContentBySlug(slug: $slug) {
        id
        slug
        title
        content
        topics
        published
        createdBy {
          id
          fullName
        }
        createdAt
      }
    }
    `, { slug: this.props.slug }).then((result: any) => {
      if(result.data && result.data.ReactoryGetContentBySlug) {
        const staticContent: ReactoryStaticContent  = result.data.ReactoryGetContentBySlug;

        let $content = staticContent.content;
        
        if(this.props.propertyBag) {
          try {
            $content = api.utils.template($content)({ self: that, props: { ...that.props.propertyBag } });
          } catch (templateError) {            
            $content = `Could not process template ${templateError}`;
          }
        }

        try {
          that.setState({ content: { ...staticContent, content: $content }, found: true, original: staticContent.content });
        } catch (err) {}
        
      } else {
        const user = that.props.api.getUser();

        that.setState({ 
          content: { 
            content: `Content for content: "${this.props.slug}" does not exists, please create it.`, title: "Not Found", createdBy: { id: user.id, fullName: user.fullName}, createdAt: moment() }, found: false });
      }
    }).catch((err) => {
      that.setState({ content: {
        title: 'Error',
        content: `Error Loading Content: ${err.message}`,
        createdBy: {
          id: null,
          fullName: 'Bugsly',
        },
        createdAt: moment()
      } });
    });
  }

  componentDidMount(){
    this.getContent(); 
  }

  componentDidUpdate(nextProps, nextState){
    if(this.props.slug !== nextProps.slug) {
      this.getContent()      
    }
  }

  componentDidCatch(err) {
    this.props.api.log(`StaticContent Handled Error`, {err}, 'error');
  }
    
  render(){
    const containerProps = {};  
    const { api, classes, viewRoles, editRoles = ['DEVELOPER'], formFqn = 'static.ContentCapture', viewMode } = this.props;
    const { getContent } = this;
    const { editing, found, content } = this.state;
    const { defaultValue = "" } = this.props;
    
    let isDeveloper = this.props.api.hasRole(['DEVELOPER']);
    let canEdit = this.props.api.hasRole(editRoles);

    canEdit = canEdit === false && isDeveloper === true ? true  : canEdit;
    const edit = () => {
      this.setState({ editing: !this.state.editing });
    };

    let editWidget = (<IconButton onClick={edit} color="primary" size={'small'} className={classes.editIcon}>
        <Icon>{editing === false ? 'edit' : 'check' }</Icon>
      </IconButton>)
  

    let contentComponent = found === true && content.published === true ? (<div {...containerProps} dangerouslySetInnerHTML={{__html: this.state.content.content}}></div>) : defaultValue;            
    let ContentCaptureComponent = this.props.api.getComponent( formFqn );
    let contentCaptureProps: any = {      
      formData: { slug: this.props.slug, title: this.props.title, published: true, content: this.props.defaultValue },
      mode:"edit", 
      uiSchemaKey: viewMode || 'default',
      onMutateComplete:getContent, 
      helpTopics: this.props.helpTopics,
      helpTitle: this.props.helpTitle,
      placeHolder: this.props.placeHolder,     
    };

    return (
      <div className={`${classes.staticContentContainer} ${isDeveloper ? classes.staticContainerDeveloper: ''}`}>
        {canEdit === true && this.props.showEditIcon === true && editWidget }
        {editing === true ? <ContentCaptureComponent  {...contentCaptureProps} /> : contentComponent }        
      </div>
    )        
  }
}

StaticContent.propTypes = {
  api: PropTypes.instanceOf(ReactoryApi).isRequired,
  showTitle: PropTypes.bool,
  slug: PropTypes.string.isRequired,
  slugSource: PropTypes.string,
  slugSourceProps: PropTypes.any,
  defaultContent: PropTypes.any,
  propertyBag: PropTypes.any,
  showEditIcon: PropTypes.bool,
  history: PropTypes.any,
  match: PropTypes.any,
  location: PropTypes.any,
};

StaticContent.defaultProps = {
  slugSource: 'property', // can be route,
  showEditIcon: true
};

StaticContent.styles = (theme) => {
  const { palette } = theme;

  return {
    editIcon: {
      float: 'right',
    },
    staticContentContainer: {
      padding: theme.spacing(2)
    },
    staticContainerDeveloper: {
      '&:hover': {
        outline: `1px solid ${palette.primary.main}`,
        cursor: 'pointer'
      }
    },
  }    
};

const StaticContentComponent = compose(withApi, withRouter, withTheme, withStyles(StaticContent.styles))(StaticContent);

StaticContentComponent.meta = {
  nameSpace: 'core',
  name: 'StaticContent',
  version: '1.0.0',
  component: StaticContentComponent,
  tags: ['static content', 'html'],
  description: 'A simple html container component',  
};

export default StaticContentComponent;