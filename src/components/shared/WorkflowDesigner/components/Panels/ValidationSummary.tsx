import { useReactory } from "@reactory/client-core/api";
import { ValidationSummaryProps } from '../../types';

export default function ValidationSummary(props: ValidationSummaryProps) {
  const {
    validationResult,
    selectedSteps,
    selectedConnections,
    onValidate
  } = props;

  const reactory = useReactory();
  const {
    React,
    Material
  } = reactory.getComponents<{
    React: Reactory.React,
    Material: Reactory.Client.Web.IMaterialModule
  }>(["react.React", "material-ui.Material"]);

  const { useMemo: useMemoReact, useCallback: useCallbackReact } = React;

  // Filter validation results
  const { allErrors, allWarnings, selectedErrors, selectedWarnings, globalErrors } = useMemoReact(() => {
    const allErrors = validationResult.errors || [];
    const allWarnings = validationResult.warnings || [];
    
    // Errors/warnings for currently selected items
    const selectedStepIds = new Set(selectedSteps.map(s => s.id));
    const selectedConnectionIds = new Set(selectedConnections.map(c => c.id));
    
    const selectedErrors = allErrors.filter(error => 
      (error.stepId && selectedStepIds.has(error.stepId)) ||
      (error.connectionId && selectedConnectionIds.has(error.connectionId))
    );
    
    const selectedWarnings = allWarnings.filter(warning => 
      (warning.stepId && selectedStepIds.has(warning.stepId)) ||
      (warning.connectionId && selectedConnectionIds.has(warning.connectionId))
    );
    
    // Global/workflow-level errors (no specific step/connection)
    const globalErrors = allErrors.filter(error => !error.stepId && !error.connectionId);

    return {
      allErrors,
      allWarnings,
      selectedErrors,
      selectedWarnings,
      globalErrors
    };
  }, [validationResult, selectedSteps, selectedConnections]);

  // Handle revalidation
  const handleRevalidate = useCallbackReact(() => {
    onValidate();
  }, [onValidate]);

  // Get severity icon
  const getSeverityIcon = useCallbackReact((severity: string) => {
    switch (severity) {
      case 'error':
        return <Error />;
      case 'warning':
        return <Warning />;
      case 'info':
        return <Info />;
      default:
        return <Info />;
    }
  }, []);

  // Get severity color
  const getSeverityColor = useCallbackReact((severity: string) => {
    switch (severity) {
      case 'error':
        return 'error.main';
      case 'warning':
        return 'warning.main';
      case 'info':
        return 'info.main';
      default:
        return 'text.secondary';
    }
  }, []);

  const {
    Box,
    Typography,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Button,
    Chip,
    Alert,
    Divider
  } = Material.MaterialCore;

  const {
    ExpandMore,
    Error,
    Warning,
    Info,
    Refresh,
    CheckCircle
  } = Material.MaterialIcons;

  return (
    <Box sx={{ p: 2 }}>
      {/* Summary Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">
          Validation Results
        </Typography>
        <Button
          size="small"
          startIcon={<Refresh />}
          onClick={handleRevalidate}
        >
          Re-validate
        </Button>
      </Box>

      {/* Overall Status */}
      <Box sx={{ mb: 2 }}>
        {allErrors.length === 0 && allWarnings.length === 0 ? (
          <Alert severity="success" icon={<CheckCircle />}>
            <Typography variant="body2">
              No validation issues found. Your workflow is ready to run!
            </Typography>
          </Alert>
        ) : (
          <Alert 
            severity={allErrors.length > 0 ? "error" : "warning"}
            icon={allErrors.length > 0 ? <Error /> : <Warning />}
          >
            <Typography variant="body2">
              Found {allErrors.length} error{allErrors.length !== 1 ? 's' : ''} 
              {allWarnings.length > 0 && ` and ${allWarnings.length} warning${allWarnings.length !== 1 ? 's' : ''}`}
              {allErrors.length > 0 && '. Fix errors before running the workflow.'}
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Quick Stats */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`${allErrors.length} Errors`}
          color={allErrors.length > 0 ? "error" : "default"}
          size="small"
          icon={<Error />}
        />
        <Chip
          label={`${allWarnings.length} Warnings`}
          color={allWarnings.length > 0 ? "warning" : "default"}
          size="small"
          icon={<Warning />}
        />
        {globalErrors.length > 0 && (
          <Chip
            label={`${globalErrors.length} Workflow-level`}
            color="error"
            size="small"
            variant="outlined"
          />
        )}
      </Box>

      {/* Selected Items Issues */}
      {(selectedErrors.length > 0 || selectedWarnings.length > 0) && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              Selected Items Issues
              <Chip
                label={selectedErrors.length + selectedWarnings.length}
                color={selectedErrors.length > 0 ? "error" : "warning"}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            <List dense>
              {selectedErrors.map((error, index) => (
                <ListItem key={`error-${index}`} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon('error')}
                  </ListItemIcon>
                  <ListItemText
                    primary={error.message}
                    secondary={
                      <Box component="span">
                        {error.stepId && `Step: ${error.stepId}`}
                        {error.connectionId && `Connection: ${error.connectionId}`}
                        {error.path && ` | Path: ${error.path}`}
                      </Box>
                    }
                    primaryTypographyProps={{
                      sx: { color: getSeverityColor('error') }
                    }}
                  />
                </ListItem>
              ))}
              {selectedWarnings.map((warning, index) => (
                <ListItem key={`warning-${index}`} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon('warning')}
                  </ListItemIcon>
                  <ListItemText
                    primary={warning.message}
                    secondary={
                      <Box component="span">
                        {warning.stepId && `Step: ${warning.stepId}`}
                        {warning.connectionId && `Connection: ${warning.connectionId}`}
                        {warning.path && ` | Path: ${warning.path}`}
                      </Box>
                    }
                    primaryTypographyProps={{
                      sx: { color: getSeverityColor('warning') }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* All Issues */}
      {(allErrors.length > 0 || allWarnings.length > 0) && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
              All Issues
              <Chip
                label={allErrors.length + allWarnings.length}
                color={allErrors.length > 0 ? "error" : "warning"}
                size="small"
                sx={{ ml: 1 }}
              />
            </Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ pt: 0 }}>
            {/* Global/Workflow-level errors */}
            {globalErrors.length > 0 && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mt: 1, mb: 1 }}>
                  Workflow Issues
                </Typography>
                <List dense>
                  {globalErrors.map((error, index) => (
                    <ListItem key={`global-${index}`} alignItems="flex-start">
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {getSeverityIcon('error')}
                      </ListItemIcon>
                      <ListItemText
                        primary={error.message}
                        primaryTypographyProps={{
                          sx: { color: getSeverityColor('error') }
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
                <Divider sx={{ my: 2 }} />
              </>
            )}

            {/* All other issues */}
            <List dense>
              {allErrors.filter(e => e.stepId || e.connectionId).map((error, index) => (
                <ListItem key={`all-error-${index}`} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon('error')}
                  </ListItemIcon>
                  <ListItemText
                    primary={error.message}
                    secondary={
                      <Box component="span">
                        {error.stepId && `Step: ${error.stepId}`}
                        {error.connectionId && `Connection: ${error.connectionId}`}
                        {error.path && ` | Path: ${error.path}`}
                      </Box>
                    }
                    primaryTypographyProps={{
                      sx: { color: getSeverityColor('error') }
                    }}
                  />
                </ListItem>
              ))}
              {allWarnings.map((warning, index) => (
                <ListItem key={`all-warning-${index}`} alignItems="flex-start">
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    {getSeverityIcon('warning')}
                  </ListItemIcon>
                  <ListItemText
                    primary={warning.message}
                    secondary={
                      <Box component="span">
                        {warning.stepId && `Step: ${warning.stepId}`}
                        {warning.connectionId && `Connection: ${warning.connectionId}`}
                        {warning.path && ` | Path: ${warning.path}`}
                      </Box>
                    }
                    primaryTypographyProps={{
                      sx: { color: getSeverityColor('warning') }
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Empty State */}
      {allErrors.length === 0 && allWarnings.length === 0 && (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'text.secondary',
            textAlign: 'center'
          }}
        >
          <CheckCircle sx={{ fontSize: 48, mb: 2, color: 'success.main', opacity: 0.7 }} />
          <Typography variant="h6" gutterBottom>
            All Good!
          </Typography>
          <Typography variant="body2">
            No validation issues found in your workflow.
          </Typography>
        </Box>
      )}
    </Box>
  );
}
