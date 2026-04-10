import { useMemo } from 'react';
import { useReactory } from '@reactory/client-core/api';
import { Breakpoint, useTheme } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';

export interface UseFormContextProps {
  formData: unknown;
  form: Reactory.Forms.IReactoryForm;
  instanceId: string;
  SIGN: string;
  refresh: (args?: unknown) => void;
  reset: () => void;
  setFormData?: (data: unknown) => void;
  getData?: (data?: unknown) => void;
  props: Reactory.Client.IReactoryFormProps<unknown>;
}

const BREAKPOINTS: Breakpoint[] = ['xl', 'lg', 'md', 'sm', 'xs'];

/**
 * Builds the form context object that is passed to SchemaForm
 * and all child widgets/fields. Extracted from the inline
 * getFormContext() that was previously in useFormDefinition.
 */
export const useFormContext = (params: UseFormContextProps): Reactory.Client.IReactoryFormContext<unknown> => {
  const {
    formData,
    form,
    instanceId,
    SIGN,
    refresh,
    reset,
    setFormData,
    getData,
    props,
  } = params;

  const reactory = useReactory();

  // Determine screen breakpoint from MUI theme
  const theme = useTheme();
  const isXl = useMediaQuery(theme.breakpoints.up('xl'));
  const isLg = useMediaQuery(theme.breakpoints.up('lg'));
  const isMd = useMediaQuery(theme.breakpoints.up('md'));
  const isSm = useMediaQuery(theme.breakpoints.up('sm'));

  const screenBreakPoint: Breakpoint = isXl ? 'xl' : isLg ? 'lg' : isMd ? 'md' : isSm ? 'sm' : 'xs';

  const context = useMemo<Reactory.Client.IReactoryFormContext<unknown>>(() => {
    return {
      $ref: {
        props: props || {},
      },
      formData,
      formDef: form,
      formInstanceId: instanceId,
      getData: getData || (async () => formData),
      graphql: form?.graphql,
      query: null,
      refresh,
      reset,
      screenBreakPoint,
      setFormData: setFormData || (async () => {}),
      signature: SIGN,
      version: 0,
      reactory,
      props,
      i18n: reactory.i18n,
    };
  }, [formData, form, instanceId, SIGN, refresh, reset, setFormData, getData, screenBreakPoint, reactory, props]);

  return context;
};

/**
 * Legacy export matching the ReactoryFormContextHook type signature.
 * @deprecated Use useFormContext instead for the new props-based API.
 */
export const useContext = useFormContext as any;
