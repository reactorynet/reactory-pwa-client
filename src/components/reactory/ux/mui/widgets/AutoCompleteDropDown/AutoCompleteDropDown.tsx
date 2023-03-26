import Reactory from '@reactory/reactory-core';
import { useReactory } from '@reactory/client-core/api/ApiProvider';
import { Chip } from '@mui/material';

'use strict';
const dependencies = ['react.React', 'material-ui.MaterialCore', 'material-ui.MaterialLab'];

/**
 * A Material-UI Autocomplete component that fetches a list of options from a GraphQL API
 * @param props 
 * @returns 
 */
function AutoCompleteDropDown<
    TData extends unknown | unknown[],
    TSchema extends Reactory.Schema.AnySchema,
    TUISchema,
    TContext extends Reactory.Client.IReactoryFormContext<unknown>>(props: Reactory.Schema.IAutoCompleteWidgetProps<TData, TSchema, TUISchema, TContext>) {

    const reactory = useReactory();

    const DefaultUIOptions = {
        // multiSelect
    };

    let FormQuery: Reactory.Forms.IReactoryFormQuery = {
        name: null,
        text: null,
        props: null,
        variables: null,
        resultMap: null
    };

    const DefaultUISchema: { [key: string]: unknown } = {
        'ui:options': DefaultUIOptions,
        'ui:graphql': FormQuery,
        'ui:props': {
            multiSelect: false
        }
    };

    const {
        formData, uiSchema = DefaultUISchema, schema = {
            type: 'array',
            title: 'Auto Complete',
        }
    } = props;

    const $props = uiSchema['ui:props'] || {};

    let user = reactory.$user;

    FormQuery = uiSchema["ui:graphql"];

    const { React, MaterialCore, MaterialLab } = reactory.getComponents<{
        React: Reactory.React;
        MaterialCore: Reactory.Client.Web.MaterialCore;
        MaterialLab: Reactory.Client.Web.MaterialLabs;
    }>(dependencies);

    const { TextField } = MaterialCore;
    const { Autocomplete } = MaterialLab;

    const [options, setOptions] = React.useState<TData[]>([]);
    const [filter, setFilter] = React.useState(null);
    const [available, setAvailable] = React.useState<TData[]>([]);

    let $formData: any | any[] = $props.multiSelect === false ? formData || null : formData || [];

    const GetItems = () => {

        if (FormQuery && FormQuery.text) {
            const variables = reactory.utils.objectMapper(props, FormQuery.variables || {});
            reactory.graphqlQuery(FormQuery.text, variables, { fetchPolicy: 'network-only' }).then(({ errors = [], data }) => {
                if (data && data[FormQuery.name]) {
                    let _result_data = data[FormQuery.name];
                    if (FormQuery.resultMap) {
                        _result_data = reactory.utils.objectMapper(data[FormQuery.name], FormQuery.resultMap);
                    }

                    setOptions(_result_data || []);
                    setAvailable(_result_data || []);
                }
            }).catch((err) => {
                reactory.log(`Error Getting Items for ${schema.title}`, { err }, 'error');
                setOptions([]);
            });
        }

    };

    /**
     * @param {*} evt: The event source of the callback.
     * @param {*} value: The new value of the component.
     * @param {*} reason: One of "create-option", "select-option", "remove-option", "blur" or "clear".
     */
    const onChange = (evt, value, reason) => {
        reactory.log(`Selection Changed AutoComplete`, { value, reason }, 'debug');
        let multiSelect = $props.multiSelect === true ? true : false;
        if (props.onChange && reason === "select-option") {
            if (value === null || value === undefined) {
                props.onChange(value);
                return;
            }

            if (value !== null && value !== undefined && multiSelect === true) {
                if (value.length && value.length === 0) {
                    props.onChange([] as any);
                    return;
                }
                else {
                    let $items = $props.onChangePropsMap ? reactory.utils.objectMapper(value, $props.onChangePropsMap) : value;
                    props.onChange($items);
                }
            } else {

                if ($props.onChangePropsMap) {
                    const mapped = reactory.utils.objectMapper(value, $props.onChangePropsMap);
                    props.onChange(mapped);
                    return;
                }
                else {

                    if (schema.type === 'string' && typeof value === 'object') {
                        props.onChange(value.value);
                        return;
                    }

                    props.onChange(value);

                }
            }

            setFilter(null);
            setOptions(available);
        }

        if (props.onChange && reason === "clear") {
            if (schema.type === "array")
                props.onChange([] as any);
            else {
                props.onChange($props.nullValue);
            }
        }
    };

    React.useEffect(() => {
        GetItems();
    }, []);

    React.useEffect(() => {
        GetItems();
    }, [user]);


    let $labelText = schema.title;

    return (
        <Autocomplete
            id={props.idSchema.$id}
            options={options || []}
            multiple={$props.multiSelect === true}
            autoHighlight
            autoSelect={true}
            getOptionLabel={(option) => {
                return option[$props.labelField || "label" || "name"];
            }}
            value={$formData}
            onChange={onChange}
            inputValue={filter}
            isOptionEqualToValue={(opt) => {

                try {
                    if ($props.multiSelect === true) {
                        if ((schema as Reactory.Schema.IArraySchema).items.type === 'object') {
                            let matched = false;
                            $formData.forEach(entry => {
                                matched = opt[$props.keyField || "key"] === entry[$props.matchField || "id"];
                                if (matched === true) {
                                    return true;
                                }
                            });
                        }

                        if ((schema as Reactory.Schema.IArraySchema).items.type === 'string') {
                            let matched = false;
                            $formData.forEach(entry => {
                                matched = opt[$props.keyField || "key"] === entry;
                                if (matched === true) {
                                    return true;
                                }
                            });
                        }
                    } else {
                        if (schema.type === 'object') {
                            return opt[$props.keyField || "key"] === $formData[$props.matchField || "id"];
                        }

                        if (schema.type === 'string') {
                            return opt[$props.keyField || "key"] === $formData;
                        }

                    }
                } catch (err) {

                    return false;
                }


            }}
            onInputChange={(event, newInputValue) => {
                setFilter(newInputValue);
            }}
            renderOption={(option) => (

                <React.Fragment>
                    <span>{option[$props.labelField || "label" || "name" || "title"]}</span>
                </React.Fragment>
            )}
            renderTags={(value, getTagProps) => {
                return value.map((option, index) => {
                    const onDeleteItem = () => {
                        let newArray: TData[] = [];
                        for (const elem of (formData as TData[])) {
                            if (elem[$props.matchField || "id"] !== option.id)
                                newArray.push(elem);
                        }
                        props.onChange(newArray as any);
                    };
                    return (<Chip variant="outlined" size="small" label={option[$props.labelField]} {...getTagProps({ index })} onDelete={onDeleteItem} />);
                });
            }}
            filterSelectedOptions={$props.filterSelectedOptions === true}

            renderInput={(params) => {

                let displayText: string = filter;

                if ((displayText === null || displayText === undefined || displayText === "") && $formData) {
                    if ($props.multiSelect !== true) {
                        if (schema.type === 'object') {
                            displayText = $formData[$props.displayField] || $formData["name"] || $formData["title"];
                        }

                        if (schema.type === 'string') {
                            displayText = $formData;
                        }
                    }

                }

                let inputLabelProps = {
                    shrink: true,
                };


                if (formData) {

                    switch (schema.type) {
                        case "array": {
                            inputLabelProps.shrink = (formData as TData[]).length > 0;
                            break;
                        }
                        case "object": {
                            let hasData = false;
                            if (formData) {
                                hasData = true;
                                let idFieldData = formData[$props.matchField || "id"];
                                if (idFieldData === null || idFieldData === undefined) {
                                    hasData = false;
                                } else {
                                    if (`${idFieldData}`.trim() === "")
                                        hasData = false;
                                }
                            }
                            inputLabelProps.shrink = hasData === true;
                            break;
                        }
                        default: {
                            inputLabelProps.shrink = true;
                        }
                    }
                }

                return (<TextField
                    {...params}
                    InputLabelProps={inputLabelProps}
                    label={reactory.utils.template(schema.title || $props.title)({ ...props, reactory, })}
                    inputProps={{
                        ...params.inputProps,
                        // autoComplete: 'new-password', // disable autocomplete and autofill
                        value: filter && filter.length > 0 ? filter : displayText
                    }} />);
            }} />
    );
}

export default AutoCompleteDropDown;

