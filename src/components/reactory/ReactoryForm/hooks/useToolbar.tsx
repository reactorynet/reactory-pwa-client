import { Button, Icon, Toolbar, Tooltip } from "@mui/material";
import { useReactory } from "@reactory/client-core/api";
import { template } from "lodash";
import React, { useCallback } from "react";
import { ReactoryFormToolbarHook } from "../types";
import { useNavigate } from "react-router";

/**
 *
 * @param props
 */
export const useToolbar: ReactoryFormToolbarHook = (props) => {
  const {
    formDefinition,    
    uiOptions,
    onSubmit,
    SubmitButton,
    formData,
    errorSchema,
    errors,
    SchemaSelector,
    refresh,
    toggleHelp,
  } = props;

  const reactory = useReactory();
  const navigate = useNavigate();

  let icon = "save";

  // BACKWARDS COMPATIBLE SCHEMA OBJECTS
  if (typeof formDefinition.uiSchema === "object") {
    if (formDefinition.uiSchema && formDefinition.uiSchema.submitIcon) {
      if (typeof formDefinition.uiSchema.submitIcon === "string") {
        icon = formDefinition.uiSchema.submitIcon;
      }
    }

    if (
      formDefinition.uiSchema &&
      formDefinition.uiSchema["ui:options"] !== null &&
      typeof formDefinition.uiSchema["ui:options"] === "object"
    ) {
      if ((formDefinition.uiSchema["ui:options"] as any).submitIcon) {
        icon = (formDefinition.uiSchema["ui:options"] as any).submitIcon;
      }
    }

    if (
      formDefinition.uiSchema &&
      formDefinition.uiSchema["ui:form"] !== null &&
      typeof formDefinition.uiSchema["ui:form"] === "object"
    ) {
      if ((formDefinition.uiSchema["ui:form"] as any).submitIcon) {
        icon = (formDefinition.uiSchema["ui:form"] as any).submitIcon;
      }
    }
  }
  
  if (uiOptions?.submitIcon) icon = uiOptions.submitIcon;
  let iconProps = uiOptions?.submitIconProps || {};
  let iconWidget =
    icon === "$none" ? null : React.createElement(Icon, iconProps, icon);
  let showSubmit = true;
  let showRefresh = true;
  let showHelp = true;
  let submitButton = null;

  let submitTooltip = "Click to submit the form";

  const { submitProps, buttons } = uiOptions;
  if (typeof submitProps === "object" && showSubmit === true) {
    const {
      variant = "fab",
      iconAlign = "left",
      tooltip = submitTooltip,
    } = submitProps;
    const _props = { ...submitProps };
    delete _props.iconAlign;
    _props.onClick = useCallback(() => {
      onSubmit(formData);
    }, [onSubmit, formData, errorSchema, errors]);

    submitTooltip = reactory.utils.template(tooltip as string)({
      props: props,
      state: { formData },
    });

    if (variant && typeof variant === "string" && showSubmit === true) {
      switch (variant) {
        case "fab": {
          delete _props.variant;
          //@ts-ignore
          submitButton = <Fab {..._props}>{iconWidget}</Fab>;
          break;
        }
        default: {
          //@ts-ignore
          submitButton = (
            <Button
              {..._props}
              variant={
                ["text", "contained", "outlined"].includes(
                  _props.variant as string
                )
                  ? (_props.variant as "text" | "contained" | "outlined")
                  : undefined
              }
              href={typeof _props.href === "string" ? _props.href : undefined}
            >
              {iconAlign === "left" && iconWidget}
              {typeof _props.text === "string" &&
                template(_props.text)({
                  props: props,
                  formData,
                  formDef: formDefinition,
                  reactory,
                })}
              {iconAlign === "right" && iconWidget}
            </Button>
          );
          break;
        }
      }
    }
  }

  if (
    uiOptions &&
    reactory.utils.lodash.isNil(uiOptions.showSubmit) === false
  ) {
    showSubmit = uiOptions.showSubmit === true;
  }

  if (uiOptions && reactory.utils.lodash.isNil(uiOptions.showHelp) === false) {
    showHelp = uiOptions.showHelp === true;
  }

  if (
    uiOptions &&
    reactory.utils.lodash.isNil(uiOptions.showRefresh) === false
  ) {
    showRefresh = uiOptions.showRefresh === true;
  }

  let additionalButtons = [];
  if (buttons?.length > 0) {
    
    additionalButtons = buttons.map((
      button: Reactory.Schema.UIFieldToolbarButton & {[key: string]: any}, 
      buttonIndex: number) => {

      const {                 
        tooltip,
        icon: buttonIconName,
        iconOptions = {},
        color,
        className,
        component,
        command,
        id,
        handler = "onClick",
        sx,
        buttonProps
      } = button;

    
      if (component && typeof component === "function") return component;

      const onButtonClicked = () => {
        reactory.log(`OnClickButtonFor Additional Buttons`);
        if (props[handler] && typeof props[handler] === "function") {
          (props[handler] as Function)({ reactoryForm: this, button });
          return;
        } 
        
        if(command) {
          if (command.startsWith("nav://")) {
            let path = command.replace("nav://", "/");
            if(path.includes("${")) {
              path = reactory.utils.template(path)({
                ...props,
                reactory,
              });
            }
            navigate(path);
            return;
          }          
        }
        
        reactory.createNotification(
          `No handler '${handler}' for ${buttonProps.title} button`,
          { showInAppNotification: true, type: "error" }
        );
        
      };

      let buttonIcon = null;
      if (iconProps && icon) {
        // @ts-ignore
        buttonIcon = <Icon {...iconOptions}>{buttonIconName}</Icon>;
      }

      return (
        <Button {...buttonProps} key={buttonIndex} onClick={onButtonClicked}>
          {iconOptions?.position === "left" && buttonIcon}
          {reactory.i18n.t(buttonProps?.title) ||
            reactory.i18n.t(buttonProps?.text) || ""}
          {iconOptions?.position === "right" && buttonIcon}
        </Button>
      );
    });
  }

  const RefreshButton = () => {
    if (showRefresh === true) {
      return (
        <Button
          onClick={() => {
            refresh();
          }}
          variant="text"
          color="primary"
        >
          <Icon>refresh</Icon>
        </Button>
      );
    }

    return null;
  };

  const FormToolbar = () => (
    <Toolbar style={uiOptions.toolbarStyle || {}}>
      {uiOptions.showSchemaSelectorInToolbar &&
      !uiOptions.showSchemaSelectorInToolbar === false &&
      SchemaSelector ? (
        <SchemaSelector />
      ) : null}
      {showSubmit === true && SubmitButton ? (
        <Tooltip title={submitTooltip}>
          <SubmitButton />
        </Tooltip>
      ) : null}
      {additionalButtons}
      {<RefreshButton />}
      {formDefinition.backButton && (
        <Button
          variant="text"
          onClick={() => {
            history.back();
          }}
          color="primary"
        >
          BACK <Icon>keyboard_arrow_left</Icon>
        </Button>
      )}
      {formDefinition.helpTopics && showHelp === true && (
        <Button
          variant="text"
          onClick={() => {
            toggleHelp();
          }}
          color="primary"
        >
          <Icon>help</Icon>
        </Button>
      )}
    </Toolbar>
  );

  let toolbarPosition = uiOptions.toolbarPosition || "bottom";

  return {
    Toolbar: FormToolbar,
    toolbarPosition,
  };
};
