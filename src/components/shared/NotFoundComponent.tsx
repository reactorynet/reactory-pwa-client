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
};

const NotFound: React.FunctionComponent<NotFoundProps> = (props: NotFoundProps) => {

  const reactory = useReactory();

  const [found, setFound] = React.useState<boolean>(false);  


  const checkComponentLoaded = () => {
    if(props.waitingFor) {
      const $ComponentToMount = reactory.getComponent(props.waitingFor)
      if ($ComponentToMount === null || $ComponentToMount === undefined) {
        setTimeout(checkComponentLoaded, 1000);
      } else {
        //this.setState({ found: true, mustCheck: false })    
        setFound(true);
      }
    }
  }

  React.useEffect(() => { checkComponentLoaded() }, [])
  
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
