import { useState } from "react";
import { v4 } from "uuid";
import {
  ReactoryFormDataManagerHook,
  ReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerProps,
} from "./types";

export const useDataManager: ReactoryFormDataManagerHook<any> = (
  options: ReactoryFormDataManagerProps<any>
): ReactoryFormDataManagerHookResult<any> => {
  const { formContext, initialData } = options;

  const [loading, setIsLoading] = useState<boolean>(false);
  const { formData, setFormData } = formContext;
  const [instance] = useState(v4());

  const onChange = (data: any) => {
    setFormData(data);
  };

  const reset = () => {
    setFormData(initialData);
  };

  return {
    loading,
    formData,
    onChange,
    reset,
  };
};
