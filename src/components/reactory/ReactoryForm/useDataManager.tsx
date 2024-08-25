import { useState } from "react";
import { v4 } from "uuid";
import { ApolloQueryResult } from '@apollo/client'
import {
  ReactoryFormDataManagerHook,
  ReactoryFormDataManagerHookResult,
  ReactoryFormDataManagerProps,
} from "./types";
import objectMapper from 'object-mapper';
import { diff } from 'deep-object-diff';

import { useReactory } from "@reactory/client-core/api";

const formValidation = ($formData: any, $errors: any, via = 'onChange') => {

  let formfqn = `${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}`;
  reactory.log(`Executing custom validations for ${formfqn}`, { $formData, $errors });
  let validationFunctionKey = `${formfqn}_validate`;
  let validationResult = [];
  let validationFunction = null;
  let selectedKey = validationFunctionKey;

  if (reactory.formValidationMaps && reactory.formValidationMaps[formfqn]) {
    validationFunction = reactory.formValidationMaps[formfqn];
  }

  if (typeof props.validate === 'function') {
    validationFunction = props.validate;
  }

  if (typeof validationFunction === 'function') {
    try {
      validationResult = validationFunction($formData, $errors, getFormReference(), via);
    } catch (ex) {
      reactory.log(`Error While Executing Custom Validation`, { ex });
    }
  }

  return $errors;
};

export const useDataManager: ReactoryFormDataManagerHook<any> = (
  options: ReactoryFormDataManagerProps<any>
): ReactoryFormDataManagerHookResult<any> => {
  const reactory = useReactory();
  const { formContext, initialData } = options;
  const { formDefinition } = formContext;

  const [loading, setIsLoading] = useState<boolean>(false);
  const [dirty, setIsDirty] = useState(false);
  const [queryComplete, setQueryComplete] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [allowRefresh, setAllowRefresh] = useState<boolean>(false);
  const { formData, setFormData } = formContext;
  const [last_query_exec, setLastQueryExecution] = useState(null);
  const [instance] = useState(v4());


  const getActiveGraphDefinitions = (): Reactory.Forms.IFormGraphDefinition => {
    let _grahDefinitions: Reactory.Forms.IFormGraphDefinition = formDefinition?.graphql;


    if (activeUiSchemaMenuItem !== null) {
      if (activeUiSchemaMenuItem.graphql) _grahDefinitions = activeUiSchemaMenuItem.graphql;
    }

    const _uiSchema = uiSchemaActiveMenuItem;
    if (_uiSchema && _uiSchema["ui:graphql"]) {
      _grahDefinitions = _uiSchema["ui:graphql"];
    }

    return _grahDefinitions;
  };

  //get initial data
  const initialData = (_existing: any = null) => {
    if (
      formDefinition === undefined ||
      formDefinition.id === "ReactoryLoadingForm"
    )
      return null;

    if (typeof formDefinition.schema === "object") {
      switch (formDefinition.schema.type) {
        case "string": {
          return `${
            location.search ||
            props.data ||
            props.formData ||
            formDefinition.defaultFormValue
          }`;
        }
        case "number": {
          if (typeof props.data === "number") return props.data;
          if (typeof props.formData === "number") return props.formData;
          if (typeof formDefinition.defaultFormValue === "number")
            return formDefinition.defaultFormValue;

          if (formDefinition.schema.default)
            return formDefinition.schema.default;

          return null;
        }
        case "object": {
          let _obj = {};
          if (typeof formDefinition.schema.default === "object")
            _obj = { ...formDefinition.schema.default };
          if (typeof formDefinition.defaultFormValue === "object")
            _obj = { ..._obj, ...formDefinition.defaultFormValue };
          if (typeof props.data === "object") _obj = { ..._obj, ...props.data };
          if (typeof props.formData === "object")
            _obj = { ..._obj, ...props.formData };
          // if (typeof queryData === 'object') _obj = { ..._obj, ...queryData };

          if (_existing && typeof _existing === "object") {
            _obj = { ..._existing, ..._obj };
          }
          return _obj;
        }
        case "array": {
          if (
            formDefinition.defaultFormValue &&
            Array.isArray(formDefinition.defaultFormValue) === false
          )
            reactory.log(
              `🚨 ${signature} Schema type and Default Form Value do not match.`,
              { formDef: formDefinition }
            );

          if (reactory.utils.lodash.isArray(props.data) === true)
            return props.data;
          if (reactory.utils.lodash.isArray(props.formData) === true)
            return props.formData;
          if (
            reactory.utils.lodash.isArray(formDefinition.defaultFormValue) ===
            true
          )
            return formDefinition.defaultFormValue;
          if (
            reactory.utils.lodash.isArray(formDefinition.schema.default) ===
            true
          )
            return formDefinition.schema.default;

          return [];
        }
        default: {
          return props.data || props.formData || formDefinition.schema.default;
        }
      }
    } else {
      if (typeof formDefinition.schema === "function") {
        return (formDefinition.schema as Reactory.Schema.TClientSchemaResolver)(
          formDefinition,
          reactory
        );
      }
    }
  };

  const onSubmit = (form: any) => {
    reactory.log(`${signature} ↩ onSubmit`, { form });
    let cancel: boolean = false;

    if (props.onSubmit) {
      const _cancel = props.onSubmit(form);
      if (_cancel === true) cancel = true;
      else cancel = false;
    }

    if (cancel === true) return;

    getData(form.formData);
    setQueryComplete(false);
    setVersion(version + 1);

    const _graphql: Reactory.Forms.IFormGraphDefinition =
      getActiveGraphDefinitions();
    if (_graphql) {
      if (_graphql.mutation) {
        let mutation: Reactory.Forms.IReactoryFormMutation =
          _graphql.mutation[mode];

        if (mutation === null || mutation === undefined) {
          //check if we need to rerun the query with the updated formData.
          reactory.log(`No mutations available for configured mode}`, {});
          return;
        }

        const _input_mapping_params = {
          ...form,
          formContext: getFormContext(),
          $route: props.$route,
          reactory,
          api: reactory,
        };

        // TODO: Werner Weber - Add the ability here for variables to be mapped to an async function
        // that will allow the developer to create a custom client side mapping object and resolve async
        // data as part of the input params.
        const _variables = objectMapper(
          _input_mapping_params,
          mutation.variables
        );

        let do_mutation = true;
        let mutation_props: any = {
          variables: reactory.utils.omitDeep({ ..._variables }),
          refetchQueries:
            mutation.options && mutation.options.refetchQueries
              ? mutation.options.refetchQueries
              : [],
        };

        if (props.onBeforeMutation) {
          do_mutation =
            props.onBeforeMutation(mutation_props, form, getFormContext()) !==
            false;
        }

        if (do_mutation) {
          reactory
            .graphqlMutation(
              mutation.text,
              mutation_props.variables,
              mutation_props.refetchQueries
            )
            .then((mutation_result: ApolloQueryResult<any>) => {
              const { data, error, errors = [] } = mutation_result;
              reactory.log(`🧐 Mutation Response ${mutation.name}`, {
                data,
                error,
              });
              if (error) {
                // ADDED: DREW
                // Show message returned from resolver
                if (props.onError) props.onError(error, getFormContext());
                if (error.graphQLErrors && error.graphQLErrors.length > 0) {
                  error.graphQLErrors.forEach((gqlError) => {
                    reactory.createNotification(`${gqlError.message}`, {
                      showInAppNotification: true,
                      type: "error",
                    });
                  });
                } else {
                  reactory.createNotification(`Error ${mutation.name} Failed`, {
                    showInAppNotification: true,
                    type: "error",
                  });
                }
              }
              if (errors && errors.length > 0) {
                if (props.onError) props.onError(errors, getFormContext());
                else {
                  reactory.createNotification(
                    "Could not execute the action.  Server responded with errors",
                    { type: "warning", showInAppNotification: true }
                  );
                }
              }

              if (data && data[mutation.name]) {
                let _formData = DATAMANAGER.fromGraphResult(
                  data,
                  form.formData,
                  mutation
                );

                //validate data against schema
                if (formDefinition.sanitizeSchema) {
                  reactory.utils.inspector.sanitize(
                    formDefinition.sanitizeSchema,
                    _formData
                  );
                }

                if (reactory.utils.deepEquals(_formData, formData) === false) {
                  setFormData(_formData);
                }

                const templateProps = {
                  formData: _formData,
                  formContext: getFormContext(),
                  props: props,
                  mutation_result: data[mutation.name],
                };

                if (typeof mutation.onSuccessUrl === "string") {
                  try {
                    let linkText = template(mutation.onSuccessUrl)(
                      templateProps
                    );
                    setTimeout(() => {
                      navigate(linkText);
                    }, mutation.onSuccessRedirectTimeout || 500);
                  } catch (exception) {
                    reactory.createNotification(
                      "Cannot redirect form, template error",
                      { type: "warning" }
                    );
                    reactory.log(
                      "ReactoryForm Mutation Cannot redirect using redirect method as the template caused an error.",
                      { templateError: exception }
                    );
                  }
                }

                if (
                  mutation.onSuccessMethod === "notification" &&
                  mutation.notification
                ) {
                  const dataObject = {
                    formData,
                    resultData: data[mutation.name],
                    formContext: getFormContext(),
                  };

                  reactory.createNotification(
                    template(mutation.notification.title)(templateProps),
                    {
                      showInAppNotification:
                        mutation.notification.inAppNotification === true,
                      type: "success",
                      props: {
                        ...dataObject,
                        ...((mutation.notification?.props || {}) as Object),
                      },
                    }
                  );
                }

                if (props.onMutateComplete)
                  props.onMutateComplete(
                    data[mutation.name],
                    getFormContext(),
                    mutation_result
                  );

                if (
                  typeof mutation.onSuccessMethod === "string" &&
                  mutation.onSuccessMethod.indexOf("event") >= 0
                ) {
                  if (mutation.onSuccessMethod.indexOf(":") > 0) {
                    let eventName = mutation.onSuccessMethod.split(":")[1];
                    if (typeof props[eventName] === "function") {
                      (props[eventName] as Function)({
                        formData: data[mutation.name],
                      });
                    } else {
                      reactory.amq.raiseFormCommand(eventName, {
                        form: {},
                        result: data[mutation.name],
                      });
                    }
                  } else {
                    if (
                      mutation.onSuccessEvent &&
                      mutation.onSuccessEvent.name
                    ) {
                      if (
                        typeof props[mutation.onSuccessEvent.name] ===
                        "function"
                      ) {
                        (props[mutation.onSuccessEvent.name] as Function)({
                          formData: mutation.onSuccessEvent.dataMap
                            ? reactory.utils.objectMapper(
                                data[mutation.name],
                                mutation.onSuccessEvent.dataMap
                              )
                            : data[mutation.name],
                        });
                      }
                    } else {
                      reactory.amq.raiseFormCommand(
                        mutation.onSuccessEvent.name,
                        {
                          form: {},
                          result: data[mutation.name],
                        }
                      );
                    }
                  }
                }

                // TODO - check if this is acceptable
                if (mutation.onSuccessMethod === "refresh") {
                  getData();
                }
              }

              setQueryComplete(true);
              setVersion(version + 1);
            })
            .catch((mutation_error) => {
              if (mutation.onError) {
                //handle the error with the error handler
              }

              if (props.onError) {
                props.onError(mutation_error, getFormContext(), "mutation");
              }

              reactory.log(
                `Error Executing Mutation ${mutation_error.message}`,
                { mutation_error }
              );
              setError({ error: mutation_error, errorType: "runtime" });
              setQueryComplete(true);
              setVersion(version + 1);
            });
        }
      }
    }
  };

  const onChange = (form: any, errorSchema: any) => {
    const hasDelta = deepEquals(formData, form.formData) === false;

    //@ts-ignore
    //reactory.log(`${signature} => onChange`, { form, errorSchema, hasDelta }, 'debug' );

    //if ((new Date().valueOf() - created) < 777) return;

    const _graphql: Reactory.Forms.IFormGraphDefinition =
      getActiveGraphDefinitions();

    if (
      (isBusy === false &&
        _graphql &&
        _graphql.query &&
        queryComplete === true) ||
      (_graphql && _graphql.mutation)
    ) {
      if (deepEquals(formData, form.formData) === false) {
        //reactory.log(`${formDef.name}[${instance_id}].onChange`, { data: form.formData });

        const $onChange = props.onChange;

        const trigger_onChange = $onChange && typeof $onChange === "function";

        const changed = diff(form.formData, formData);
        const rchanged = diff(formData, form.formData);

        let cancelEvent = false;

        let do_mutation = true;
        const fire = () => {
          if (formDefinition.eventBubbles) {
            formDefinition.eventBubbles.forEach((eventAction) => {
              if (eventAction.eventName === "onChange") {
                if (eventAction.action === "swallow") {
                  cancelEvent = true;
                }
              }
            });
          }

          if (cancelEvent === true) return;

          $onChange(form.formData, form.errorSchema, {
            before: changed,
            after: rchanged,
            self,
          });
        };

        //reactory.log(`${signature} => onChange DELTA =>`, { changed, rchanged });

        if (_graphql && _graphql.mutation && _graphql.mutation["onChange"]) {
          do_mutation = dirty === true;

          if (props.onBeforeMutation && do_mutation === true) {
            do_mutation =
              props.onBeforeMutation({}, form, getFormContext()) !== false;
          }

          if (do_mutation === true) {
            let onChangeMutation: Reactory.Forms.IReactoryFormMutation =
              _graphql.mutation["onChange"];
            let throttleDelay: number =
              _graphql.mutation["onChange"].throttle || 250;
            let variables = reactory.utils.objectMapper(
              {
                eventData: form,
                form: { formData, formContext: getFormContext() },
              },
              onChangeMutation.variables
            );

            //let throttled_call = throttle(() => {
            reactory
              .graphqlMutation(
                onChangeMutation.text,
                variables,
                onChangeMutation.options
              )
              .then((mutationResult) => {
                reactory.log(
                  `${signature} => onChange => onChangeMutation result`,
                  { mutationResult }
                );

                if (props.onMutateComplete)
                  props.onMutateComplete(
                    form.formData,
                    getFormContext(),
                    mutationResult
                  );
              })
              .catch((mutationError) => {
                if (props.onMutateComplete)
                  props.onMutateComplete(
                    form.formData,
                    getFormContext(),
                    null,
                    mutationError
                  );
                reactory.log(
                  `${signature} => onChange => onChangeMutation error`,
                  { mutationError }
                );
              });
          }
        }

        if (
          formDefinition &&
          formDefinition.refresh &&
          formDefinition.refresh.onChange
        ) {
          if (trigger_onChange === true) fire();
        } else {
          setFormData(form.formData);
        }
      }
    } else {
      setFormData(form.formData);
    }

    setIsDirty(hasDelta);
    // if (hasDelta === true) setVersion(version + 1);
  };

  const getData = (defaultInputData?: any) => {
    if (formDefinition === undefined || formDefinition.id === "ReactoryLoadingForm") return null
    reactory.log(`<${fqn} /> getData(defaultInputData?: any)`, { defaultInputData, formData, formDef: formDefinition });
    const _graphql: Reactory.Forms.IFormGraphDefinition = getActiveGraphDefinitions();
    let _formData = null;

    if (typeof formDefinition.schema === "object") {
      switch (formDefinition.schema.type) {
        case "object": {
          _formData = { ...formData };
          if (formData === undefined || formData === null && formDefinition.defaultFormValue) {
            _formData = { ...formDefinition.defaultFormValue as Object };
          }
          if (defaultInputData && typeof defaultInputData === 'object') _formData = { ..._formData, ...defaultInputData }
          break;
        }
        case "array": {
          _formData = [];
          if (formData && Array.isArray(formData) === true) {
            _formData = [...formData];
          }

          if (defaultInputData && Array.isArray(defaultInputData) === true) _formData = [..._formData, ...defaultInputData]
          break;
        }
        default: {
          _formData = formData;
          break;
        }
      }
    }


    if (_graphql) {

      const has = {
        query: isNil(_graphql.query) === false && isString(_graphql.query.text) === true,
      };

      if (has.query === true) {

        const query = _graphql.query;
        const formContext = getFormContext();
        const __staticFormData = query.formData;

        if (typeof formDefinition.schema === "object") {
          switch (formDefinition.schema.type) {
            case "object": {
              _formData = { ...__staticFormData as Object, ..._formData };
              break;
            }
            case "array": {
              _formData = [];
              if (isArray(__staticFormData) === true) _formData = [...__staticFormData as Array<any>, ..._formData];
              if (isArray(formData) === true) _formData = [...formData];
              break;
            }
            default: {
              break;
            }
          }
        }

        // TODO: Werner Weber - Add the ability here for variables to be mapped to an async function
        // that will allow the developer to create a custom client side mapping object and resolve async
        // data as part of the input params.


        const _input_mapping_params: any = {
          formContext,
          formData: _formData,
          $route: props.$route,
          props: query.props ? { ...query.props } : {},
        };

        const _variables: any = reactory.utils.omitDeep(objectMapper(_input_mapping_params, query.variables || {}));
        reactory.log(`Variables for query`, { variables: _variables });

        let $options = query.options ? { ...query.options as Object } : { fetchPolicy: 'network-only' }

        //error handler function
        const handleErrors = (errors) => {

          if (_graphql.query.onError) {
            const componentToCall = reactory.getComponent(_graphql.query.onError.componentRef);
            if (componentToCall && typeof componentToCall === 'function') {
              const componentInstance = componentToCall(props)
              if (typeof componentInstance[_graphql.query.onError.method] === 'function') {
                try {
                  componentInstance[_graphql.query.onError.method](errors);
                } catch (err) {
                  reactory.log(err.message, err);
                }
              }
            }
          }
        };

        //execute query
        //TODO: Updated / fix types so that errors is available on result
        //if (query.autoQuery === false && autoQueryDisabled === false) {
        //  setState({ queryComplete: true, dirty: false, allowRefresh: true, loading: false });
        //} else {

        const executeFormQuery = () => {

          if (props.onBeforeQuery) {
            if (props.onBeforeQuery(_formData, formContext) === false) return;
          }

          reactory.log(`${signature}  executeFormQuery()`)
          const query_start = new Date().valueOf();

          if ($options && $options.fetchPolicy && $options.fetchPolicy.indexOf('${') >= 0) {
            try {
              $options.fetchPolicy = reactory.utils.template($options.fetchPolicy)({ formContext: getFormContext(), query, props });
            } catch (fpterror) {
              $options.fetchPolicy = 'network-only';
            }
          }

          reactory.graphqlQuery(gql(query.text), _variables, $options).then((result: any) => {
            const query_end = new Date().valueOf();

            reactory.stat(`${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}:query_execution_length`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date' });
            const { data, errors } = result;

            if (data && data[query.name]) {
              _formData = DATAMANAGER.fromGraphResult(data, _formData, query);
            }


            try {
              //setState({ formData: _formData, queryComplete: true, dirty: false, allowRefresh: true, queryError: errors, loading, last_query_exec: new Date().valueOf() }, () => {

              if (props.onQueryComplete) {
                props.onQueryComplete({ formData: _formData, formContext: getFormContext(_formData), result, errors });
              }

              //$events.emit('onQueryComplete', { formData: _formData });

              if (errors) {
                reactory.log(`ReactoryComponent => ${formDefinition.nameSpace}${formDefinition.name}@${formDefinition.version} instanceId=${instanceId} => Error executing graphql query`, errors)
                handleErrors(errors);
              }


              setFormData(_formData);
              setQueryComplete(true);
              setIsDirty(false);
              setAllowRefresh(true);
              setError({ errorType: "graphql", error: errors });
              setIsBusy(false);

              //});
            } catch (unhandledErr) {
              reactory.log(`ReactoryComponent -> Error on setting state`, unhandledErr);
            }
          }).catch((queryError) => {

            reactory.log(`Error Executing Form Query`, { queryError });
            const query_end = new Date().valueOf();

            setFormData(_formData);
            setQueryComplete(true);
            setIsDirty(false);
            setAllowRefresh(false);
            setError({
              error: queryError,
              errorType: 'runtime',
            });
            setIsBusy(false);

            if (props.onError) {
              props.onError(queryError, getFormContext(), 'query')
            }

            reactory.stat(`${formDefinition.nameSpace}.${formDefinition.name}@${formDefinition.version}:query_error`, { query_start, query_end, diff: query_end - query_start, unit: 'utc-date', failed: true, error: queryError.message });
          });
        }

        if (_graphql.query.interval) {
          if (refreshInterval === null || refreshInterval === undefined) {
            setRefreshInterval(setInterval(executeFormQuery, _graphql.query.interval));
          }

        }

        if (query.refreshEvents) {
          query.refreshEvents.forEach((eventDefinition) => {
            if (eventDefinition.on === true) {
              // only use on when the use case is explicit for it's use. Otherwise it is recommended
              // to use once 
              reactory.on(eventDefinition.name, (evt) => {
                reactory.log(`🔔 Refresh of query triggred via refresh event`, { eventDefinition, evt, signature });
                setTimeout(getData, query.autoQueryDelay || 500)
              });
            } else {
              reactory.once(eventDefinition.name, (evt) => {
                reactory.log(`🔔 Refresh of query triggred via ONCE refresh event`, { eventDefinition, evt, signature });
                setTimeout(() => {
                  getData();

                }, query.autoQueryDelay || 0)
              });
            }

          });
        }

        setTimeout(executeFormQuery, query.autoQueryDelay || 0);
      } else {

        setFormData(_formData);
        setQueryComplete(true);
      }


    } else {

      setFormData(_formData);
      setQueryComplete(true);
    }

  };

  const reset = () => {
    setFormData(initialData);
  };

  // Refreshes the form data
  const refresh = () => { };

  const validate = () => { };

  const SubmitButton = () => {
    return (
      <button
        onClick={() => onSubmit(formData)}
        disabled={loading}
      >
        Submit
      </button>
    );
  }

  return {
    canReferesh,
    loading,
    formData,
    onChange,
    reset,
    validate,
    refresh,
    SubmitButton
  };
};

/**
 *
 *
 *
 *
 *
 *
 */
