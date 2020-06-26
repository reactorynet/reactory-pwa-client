import React, { Component,Fragment } from 'react';
import PropTypes from 'prop-types';
import { compose } from 'recompose';
import { withRouter, match  } from 'react-router-dom';
import { Button, Icon, IconButton } from '@material-ui/core';
import { withStyles, withTheme,  } from '@material-ui/core/styles';
import moment, { Moment } from 'moment';
import ReactoryApi, { withApi } from '@reactory/client-core/api';

interface ReactoryStaticContentProps {
  api: ReactoryApi,
  classes?: any,
  showTitle: boolean,
  slug: string,
  slugSource?: string,
  slugSourceProps?: any,
  defaultValue?: any,
  propertyBag?: any,  
  templateEngine: 'lodash',
  match: match,
  location: any,
  history: any
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
      editing: false,
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

        that.setState({ content: { ...staticContent, content: $content }, found: true, original: staticContent.content });

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
    
  render(){
    const containerProps = {};  
    const { api, classes } = this.props;
    const { getContent } = this;
    let isDeveloper = this.props.api.hasRole(['DEVELOPER']);
    
    const edit = () => {
      if(isDeveloper === true) this.setState({ editing: !this.state.editing });
    };

    const { editing, found, content } = this.state;
    const { defaultValue = "" } = this.props;
    const ContentCapture = this.props.api.getComponent('static.ContentCapture');
    const contentComponent = found === true && content.published === true ? (<div {...containerProps} dangerouslySetInnerHTML={{__html: this.state.content.content}}></div>) : defaultValue;    

      return (
        <div className={`${classes.staticContentContainer} ${isDeveloper ? classes.staticContainerDeveloper: ''}`}>
          {isDeveloper === true ? 
          <div className={classes.developerTools}>            
            <IconButton onClick={edit} color="primary" size={'small'}>
              <Icon>{editing === false ? 'edit' : 'check' }</Icon>
            </IconButton>
          </div> : null }
          {editing === true ? 
            <ContentCapture slug={this.props.slug} formData={{ slug: this.props.slug }} mode="edit" onMutateComplete={getContent} /> : 
            contentComponent                        
          }
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
  history: PropTypes.any,
  match: PropTypes.any,
  location: PropTypes.any,
};

StaticContent.defaultProps = {
  slugSource: 'property' // can be route
};

StaticContent.styles = (theme) => {
  const { palette } = theme;

  return {
    developerTools: {
      float: 'right',
    },
    staticContentContainer: {
  
    },
    staticContainerDeveloper: {
      '&:hover': {
        outline: `1px dotted ${palette.primary.main}`,
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