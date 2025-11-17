import React, { Component } from 'react';
import ReactoryApi, { useReactory } from '@reactory/client-core/api//ApiProvider';

// TODO: Move this interface to @reactory/reactory-core/types/index.d.ts
interface NotFoundProps {
  message?: string,
  waitingFor?: string,
  wait?: number,
  args?: any,
  link?: string,
  theme?: any,
  location?: any
  onFound?: () => void;
};

const NotFound: React.FunctionComponent<NotFoundProps> = (props: NotFoundProps) => {

  const reactory = useReactory();

  const [found, setFound] = React.useState<boolean>(false);
  const [loadedAt] = React.useState<number>(new Date().valueOf());    
  const [unavailable, setUnavailable] = React.useState<boolean>(false);
  const [showCreate, setShowCreateComponent] = React.useState<boolean>(false);  

  const checkComponentLoaded = () => {
    if(props.waitingFor) {
      const $ComponentToMount = reactory.getComponent(props.waitingFor)
      if ($ComponentToMount === null || $ComponentToMount === undefined) {
        if((new Date().valueOf() - loadedAt) / 1000 < 5) {
          setTimeout(checkComponentLoaded, 1000);
        } else {
          setUnavailable(true);
        }
      } else {
        //this.setState({ found: true, mustCheck: false })    
        setFound(true);
        if(props.onFound) {
          props.onFound();
        }
      }
    }
  }

  React.useEffect(() => { checkComponentLoaded() }, [])
  

  if(unavailable === true) {
    if(reactory.isDevelopmentMode() === true && reactory.hasRole(["DEVELOPER"]) === true) {
      

      if(showCreate === true) {
        const {
          FormEditor
        } = reactory.getComponents<any>(["reactory.FormEditor"])
        
        const { name, nameSpace, version } = reactory.utils.componentPartsFromFqn(props.waitingFor)

        return <FormEditor formData={{ name, nameSpace, version }} />
      } else {
        const {
          Material
        } = reactory.getComponents<{ Material: Reactory.Client.Web.IMaterialModule }>(["material-ui.Material"]);
        
        return (
          <Material.MaterialCore.Typography variant='body1'>Component not found, click <Material.MaterialCore.Button onClick={() => { setShowCreateComponent(true) }}>here to create a component</Material.MaterialCore.Button></Material.MaterialCore.Typography>
        )
      }

    }
  }

  if (found === false) {
    let msg = `Waiting for application components to finish loading... ${process.env.NODE_ENV !== 'production' ? props.waitingFor : ''}`;
    return (<>{msg}</>)
  } else {

    if(props.waitingFor) {
      const ComponentToMount = reactory.getComponent<any>(props.waitingFor)
      return (<ComponentToMount {...props.args} />)
    }

    return (<>No component data available</>)
  }

};

export default NotFound
