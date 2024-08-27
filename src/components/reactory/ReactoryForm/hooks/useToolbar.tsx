

// let icon = 'save';

import { ReactoryFormToolbarHook } from "../types";

// // BACKWARDS COMPATIBLE SCHEMA OBJECTS
// if (typeof formDefinition.uiSchema === "object") {
//   if (formDefinition.uiSchema && formDefinition.uiSchema.submitIcon) {
//     if (typeof formDefinition.uiSchema.submitIcon === 'string') {
//       icon = formDefinition.uiSchema.submitIcon
//     }
//   }

//   if (formDefinition.uiSchema && formDefinition.uiSchema['ui:options'] !== null
//     && typeof formDefinition.uiSchema['ui:options'] === 'object') {
//     if ((formDefinition.uiSchema['ui:options'] as any).submitIcon) {
//       icon = (formDefinition.uiSchema['ui:options'] as any).submitIcon
//     }
//   }
// }

// if (uiOptions?.submitIcon) icon = uiOptions.submitIcon;
// let iconProps = uiOptions?.submitIconProps || {};
// let iconWidget = (icon === '$none' ? null : <Icon {...iconProps}>{icon}</Icon>);
// let showSubmit = true;
// let showRefresh = true;
// let showHelp = true;
// let submitButton = null;

// let submitTooltip = 'Click to submit the form';

// const { submitProps, buttons } = uiOptions;
// if (typeof submitProps === 'object' && showSubmit === true) {
//   const { variant = 'fab', iconAlign = 'left', tooltip = submitTooltip } = submitProps;
//   const _props = { ...submitProps };
//   delete _props.iconAlign;
//   _props.onClick = useCallback(() => { onSubmit(formData) }, [onSubmit, formData, errorSchema, errors]);

//   submitTooltip = reactory.utils.template(tooltip as string)({
//     props: props,
//     state: { formData }
//   });


//   if (variant && typeof variant === 'string' && showSubmit === true) {
//     switch (variant) {
//       case 'fab':
//         {
//           delete _props.variant;
//           //@ts-ignore
//           submitButton = (<Fab {..._props}>{iconWidget}</Fab>);
//           break;
//         }
//       default: {
//         //@ts-ignore
//         submitButton = (<Button {..._props}>{iconAlign === 'left' && iconWidget}{template(_props.text)({ props: props, formData, formDef: formDefinition, reactory })}{iconAlign === 'right' && iconWidget}</Button>);
//         break;
//       }
//     }
//   }
// }

// if (uiOptions && isNil(uiOptions.showSubmit) === false) {
//   showSubmit = uiOptions.showSubmit === true;
// }

// if (uiOptions && isNil(uiOptions.showHelp) === false) {
//   showHelp = uiOptions.showHelp === true;
// }

// if (uiOptions && isNil(uiOptions.showRefresh) === false) {
//   showRefresh = uiOptions.showRefresh === true;
// }

// let additionalButtons = [];
// if (buttons && buttons.length) {
//   additionalButtons = buttons.map((button: any, buttonIndex) => {
//     const { buttonProps, iconProps, type, handler, component } = button;

//     if (component && typeof component === "function") return component;

//     const onButtonClicked = () => {
//       reactory.log(`OnClickButtonFor Additional Buttons`);
//       if (props[handler] && typeof props[handler] === 'function') {
//         (props[handler] as Function)({ reactoryForm: this, button })
//       } else {
//         reactory.createNotification(`No handler '${handler}' for ${buttonProps.title} button`, { showInAppNotification: true, type: 'error' })
//       }
//     }

//     let buttonIcon = null;
//     if (iconProps) {
//       buttonIcon = <Icon {...iconProps}>{iconProps.icon}</Icon>
//     }

//     return (
//       <Button {...buttonProps} key={buttonIndex} onClick={onButtonClicked}>{iconProps.placement === 'left' && buttonIcon}{buttonProps.title}{iconProps.placement === 'right' && buttonIcon}</Button>
//     )
//   });
// }

// let formtoolbar = (
//   <Toolbar style={uiOptions.toolbarStyle || {}}>
//     {uiOptions.showSchemaSelectorInToolbar && !uiOptions.showSchemaSelectorInToolbar === false ? uiSchemaSelector : null}
//     {showSubmit === true && submitButton ? (<Tooltip title={submitTooltip}>{submitButton}</Tooltip>) : null}
//     {additionalButtons}
//     {<RefreshButton />}        
//     {formDefinition.backButton && <Button variant="text" onClick={() => { history.back() }} color="primary">BACK <Icon>keyboard_arrow_left</Icon></Button>}
//     {formDefinition.helpTopics && showHelp === true && <Button variant="text" onClick={() => { setShowHelpModal(true) }} color="primary"><Icon>help</Icon></Button>}
//   </Toolbar>
// );

// let toolbarPosition = uiOptions.toolbarPosition || 'bottom'


/**
 * 
 * @param props 
 */
export const useToolbar: ReactoryFormToolbarHook = (props) => { 


  return {
    Toolbar: null,
  }
};