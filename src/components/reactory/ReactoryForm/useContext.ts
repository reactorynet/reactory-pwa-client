import { 
  ReactoryFormContextHook
} from './types';

export const useContext: ReactoryFormContextHook<any> = (props: unknown) => { 

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