import React, { Component } from 'react';
import ReactoryApi, { useReactory } from '@reactory/client-core/api//ApiProvider';

// TODO: Move this interface to @reactorynet/reactory-core/types/index.d.ts
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

const DEFAULT_WAIT_SECONDS = 5;

const NotFound: React.FunctionComponent<NotFoundProps> = (props: NotFoundProps) => {

  const reactory = useReactory();
  const [found, setFound] = React.useState<boolean>(false);
  const [loadedAt] = React.useState<number>(new Date().valueOf());
  const [unavailable, setUnavailable] = React.useState<boolean>(!props.waitingFor);
  const [showCreate, setShowCreateComponent] = React.useState<boolean>(false);
  const waitSeconds = typeof props.wait === 'number' ? props.wait / 1000 : DEFAULT_WAIT_SECONDS;

  const checkComponentLoaded = React.useCallback(() => {
    if (!props.waitingFor) {
      setUnavailable(true);
      return;
    }

    const $ComponentToMount = reactory.getComponent(props.waitingFor);
    if ($ComponentToMount === null || $ComponentToMount === undefined) {
      if ((new Date().valueOf() - loadedAt) / 1000 < waitSeconds) {
        setTimeout(checkComponentLoaded, 1000);
      } else {
        setUnavailable(true);
      }
    } else {
      setFound(true);
      if (props.onFound) {
        props.onFound();
      }
    }
  }, [loadedAt, props, reactory, waitSeconds]);

  React.useEffect(() => { checkComponentLoaded(); }, [checkComponentLoaded]);

  if (unavailable === true) {
    if (reactory.isDevelopmentMode() === true && reactory.hasRole(["DEVELOPER"]) === true && props.waitingFor) {
      if (showCreate === true) {
        const { FormEditor } = reactory.getComponents<any>(["reactory.FormEditor"]);
        const { name, nameSpace, version } = reactory.utils.componentPartsFromFqn(props.waitingFor);
        return <FormEditor formData={{ name, nameSpace, version }} />;
      }

      return (
        <div>
          Component not found ({props.waitingFor}).
          <button type="button" onClick={() => { setShowCreateComponent(true); }}>
            Create component
          </button>
        </div>
      );
    }

    return (
      <>
        {props.message || `No component data available${props.waitingFor ? ` for ${props.waitingFor}` : ''}`}
      </>
    );
  }

  if (found === false) {
    const msg = `Waiting for application components to finish loading... ${process.env.NODE_ENV !== 'production' ? props.waitingFor : ''}`;
    return (<>{msg}</>);
  }

  if (props.waitingFor) {
    const ComponentToMount = reactory.getComponent<any>(props.waitingFor);
    if (!ComponentToMount) {
      return (<>{props.message || 'No component data available'}</>);
    }
    return (<ComponentToMount {...props.args} />);
  }

  return (<>No component data available</>);
};

export default NotFound
