import { 
  ReactoryFormContextHook
} from './types';

export const useContext: ReactoryFormContextHook<any> = (props: unknown) => { 

  // const setState = ($state: any, callback = () => { }) => {

    //   let _$state = { ...$state };
    //   delete _$state.formData;
    //   if (Object.keys(_$state).length > 0) {
    //     let _customState = {};
    //     Object.keys(_$state).forEach((stateKey) => {
    //       switch (stateKey) {
    //         case "componentDefs": {
    //           setComponents(_$state[stateKey]);
    //           break;
    //         }
    //         case "":
    //         case "formData": {
    //           //do nothing, already handled or not permitted.
    //           break;
    //         }
    //         default: {
    //           _customState[stateKey] = _$state[stateKey];
    //         }
    //       }
    //     });

    //     if (Object.keys(_customState).length > 0) {
    //       setCustomState(_customState);
    //     }
    //   }

    //   if ($state.formData) getData($state.formData);

    //   callback();

    // };

    const getFormContext = (nextData?: any) => {
      const cloned_props = { ...props };
      let inputContext = {}
      if (cloned_props.formContext) {
        inputContext = cloned_props.formContext;
        delete cloned_props.formContext;
      }
      let _context = {
        ...cloned_props,
        signature,
        version,
        formDef: { ...formDefinition },
        formData: nextData || formData,
        $formData: nextData || formData,
        $formState: {
          formData: nextData || formData,
          showReportModal,
          formDef: formDefinition
        },
        query: { ...props.query },
        formInstanceId: instanceId,
        $ref: getFormReference(),
        refresh: (args = { autoQueryDisabled: true }) => {
          setAutoQueryDisabled(args.autoQueryDisabled);
          getData(formData);
        },
        setFormData: (formData: any, callback = () => { }) => {
          setFormData(formData);
          callback();
        },
        graphql: getActiveGraphDefinitions(),
        getData,
        reset,
        screenBreakPoint: getScreenSize(),
        i18n: reactory.i18n,
        reactory,
        setState: setCustomState,
        state: customState,
        ...inputContext,
      }

      // reactory.log(`<${formDef.nameSpace}.${formDef.name}@${formDef.version} /> -> getFormContext()`, { _context });
      return _context;
    }

    const getState = () => {
      return {
        formData,
        queryComplete,
        dirty,
        _instance_id: instanceId,
        ...customState
      }
    }

  const cloned_props = { ...props };
    let inputContext = {}
    if (cloned_props.formContext) {
      inputContext = cloned_props.formContext;
      delete cloned_props.formContext;
    }
    let _context = {
      ...cloned_props,
      signature,
      version,
      formDef: { ...formDef },
      formData: nextData || formData,
      $formData: nextData || formData,
      $formState: {
        formData: nextData || formData,
        showReportModal,
        formDef
      },
      query: { ...props.query },
      formInstanceId: instance_id,
      //$ref: getFormReference(),
      refresh: (args = { autoQueryDisabled: true }) => {
        setAutoQueryDisabled(args.autoQueryDisabled);
        getData(formData);
      },
      setFormData: (formData: any, callback = () => { }) => {
        setFormData(formData);
        callback();
      },
      graphql: getActiveGraphDefinitions(),
      getData,
      reset,
      screenBreakPoint: getScreenSize(),
      i18n: reactory.i18n,
      reactory,
      setState: setCustomState,
      state: customState,
      ...inputContext,
    }

    // reactory.log(`<${formDef.nameSpace}.${formDef.name}@${formDef.version} /> -> getFormContext()`, { _context });
    return _context;
  };

  return formContext;
};