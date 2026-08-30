import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { compose } from 'redux';
import { useParams } from 'react-router';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  Drawer,
  Fade,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import { withReactory } from '@reactory/client-core/api/ApiProvider';
import { useContentRender } from '@reactory/client-core/components/shared/hooks/useContentRender';
import { ContentRenderer } from '@reactory/client-core/components/shared/ContentRenderer';
import { Comments } from '@reactory/client-core/components/shared/Comments/Comments';

import InlineContentEditor from './editor/InlineContentEditor';
import useStaticContent, { toDraft } from './hooks/useStaticContent';
import {
  ContentDraft,
  ContentTranslation,
  ReactoryStaticContent as StaticContentRecord,
  ReactoryStaticContentProps,
} from './types';

export * from './types';

/**
 * Expands `${...}` template expressions in the body.
 *
 * Component tags are deliberately NOT handled here. They are lifted out by the
 * shared renderer, which turns them into real React elements regardless of
 * whether the surrounding body is markdown, HTML or plain text. Substituting a
 * placeholder element here only worked for pipelines that emit raw HTML —
 * markdown escapes it, so the placeholder never reached the DOM.
 *
 * Pure by design: it performs no state updates so it can be called during a
 * render pass without risking a loop.
 */
const expandTemplate = (
  template: string,
  propertyBag: any,
  reactory: Reactory.Client.ReactorySDK
): string => {
  let content: string = template || '';

  if (propertyBag && content && content.indexOf('${') >= 0) {
    try {
      content = reactory.utils.template(content)({ props: { ...propertyBag, reactory } });
    } catch (templateError) {
      content = `Could not process template ${templateError}\n${content}`;
    }
  }

  return content;
};

/**
 * Renders managed content, and — for users who may edit it — turns that same
 * surface into the editor.
 *
 * The component works at two scales: a small widget embedded in a form, and a
 * whole page assembled from `<reactory />` tags. Both use the same inline
 * editing model, so there is one thing to learn either way.
 */
const StaticContent: React.FC<ReactoryStaticContentProps> = (props) => {
  const { reactory } = props;
  const params = useParams();
  const { renderContent } = useContentRender(reactory);

  const {
    editRoles = ['DEVELOPER'],
    editDisplayMode = 'inline',
    editLink = '/Forms/ContentCapture/edit/',
    slug,
    title,
    slugSource,
    slugSourceProps,
    defaultSlug,
    propertyBag = {},
    defaultValue = '',
    useExpanded = false,
    container = 'Box',
    containerProps = {},
    locale,
    aipersona,
    onSaved,
    enableComments = false,
    commentLayout = 'bottom',
    commentsProps = {},
  } = props;

  /**
   * Resolves the slug, which may come from the route rather than a prop.
   */
  const activeSlug = useMemo(() => {
    if (slugSource === 'route' && typeof slugSourceProps === 'object' && params) {
      const { paramId, slugPrefix = '' } = slugSourceProps;
      const routeValue = params[paramId];
      if (routeValue) return `${slugPrefix}${routeValue}`;
      if (defaultSlug) return `${slugPrefix}${defaultSlug}`;
    }
    return slug;
  }, [slug, slugSource, slugSourceProps, defaultSlug, params]);

  // Development mode toggles editing affordances, so the component must
  // re-evaluate permissions when it changes.
  const [permissionVersion, setPermissionVersion] = useState(0);

  const isDeveloper = useMemo(
    () => reactory.hasRole(['DEVELOPER']) && reactory.isDevelopmentMode() === true,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactory, permissionVersion]
  );

  const canEdit = useMemo(
    () => reactory.hasRole(editRoles) || isDeveloper,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reactory, editRoles, isDeveloper, permissionVersion]
  );

  useEffect(() => {
    const onDevelopmentModeChanged = () => setPermissionVersion((v) => v + 1);
    reactory.on('onReactoryDevelopmentModeChanged', onDevelopmentModeChanged);
    return () => {
      reactory.removeListener('onReactoryDevelopmentModeChanged', onDevelopmentModeChanged);
    };
  }, [reactory]);

  const defaultContent = typeof defaultValue === 'string' ? defaultValue : '';

  const {
    loadState,
    error,
    record,
    viewContent,
    draftSeed,
    translations,
    reload,
    saveContent,
    saveTranslation,
    deleteTranslation,
  } = useStaticContent({
    reactory,
    slug: activeSlug,
    basePath: slugSourceProps?.basePath,
    locale,
    canEdit,
    fallbackTitle: title,
    fallbackContent: defaultContent,
  });

  const resolvedCommentsProps = useMemo(() => ({
    ...(record?.commentsProps || {}),
    ...commentsProps,
  }), [record?.commentsProps, commentsProps]);

  const resolvedCommentLayout = record?.commentLayout || commentLayout || 'bottom';

  const [editing, setEditing] = useState(props.isEditing === true);
  // Height of the rendered body, captured as the editor opens so the writing
  // surface can start out the same size as the content it replaces.
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState<number | undefined>(undefined);
  const viewBodyRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(props.expanded !== undefined ? props.expanded : !useExpanded);
  const [hovering, setHovering] = useState(false);

  const propertyBagKey = useMemo(() => {
    try {
      return JSON.stringify(propertyBag || {});
    } catch (e) {
      return '';
    }
  }, [propertyBag]);

  /**
   * The body to display, after template expansion. Component tags are left in
   * place for the renderer to lift out.
   */
  const displayBody = useMemo(() => {
    const raw = viewContent?.content ?? '';
    if (!raw) return '';
    return expandTemplate(raw, propertyBag, reactory);
    // propertyBagKey stands in for propertyBag so an equal-but-new object does
    // not force a re-parse on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewContent?.content, propertyBagKey, reactory]);

  /**
   * Renders a body for the editor's preview pane.
   *
   * Runs the identical path as the live view so that what an author previews
   * is what readers get, including how component tags are mounted.
   */
  const renderPreview = useCallback(
    (body: string) => renderContent(expandTemplate(body, propertyBag, reactory)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propertyBagKey, reactory, renderContent]
  );

  const handleSaveSource = useCallback(
    async (draft: ContentDraft) => {
      const saved = await saveContent(draft);
      onSaved?.(saved as StaticContentRecord);
      return saved;
    },
    [saveContent, onSaved]
  );

  const handleSaveTranslation = useCallback(
    async (translation: ContentTranslation) => saveTranslation(translation),
    [saveTranslation]
  );

  /**
   * Opens the editor. Legacy display modes are honoured, but `inline` — editing
   * on the surface itself — is the default.
   */
  const openEditor = useCallback(() => {
    if (editDisplayMode === 'link') {
      window.open(
        `${editLink}?slug=${activeSlug}&title=${encodeURIComponent(record?.title || title || '')}`,
        '_blank'
      );
      return;
    }
    // Measure before the view unmounts. Only meaningful for inline editing,
    // where the editor takes the place of the content it is replacing.
    if (editDisplayMode === 'inline' || editDisplayMode === 'splitPreview') {
      setMeasuredBodyHeight(viewBodyRef.current?.offsetHeight || undefined);
    }
    setEditing(true);
  }, [editDisplayMode, editLink, activeSlug, record?.title, title]);

  const closeEditor = useCallback(() => setEditing(false), []);

  // Box and Paper have incompatible prop signatures, so the union is widened to
  // a plain element type for JSX use.
  const Container: React.ElementType = container === 'Paper' ? Paper : Box;

  const editorElement = (
    <InlineContentEditor
      reactory={reactory}
      seed={draftSeed}
      translations={translations}
      slugLocked={Boolean(record?.id)}
      aipersona={aipersona}
      renderPreview={renderPreview}
      minBodyHeight={measuredBodyHeight}
      onSaveSource={handleSaveSource}
      onSaveTranslation={handleSaveTranslation}
      onDeleteTranslation={deleteTranslation}
      onCancel={closeEditor}
    />
  );

  /**
   * The read-only view of the content.
   */
  const renderView = () => {
    if (loadState === 'loading') {
      return (
        <Box>
          <Skeleton variant="text" width="40%" height={28} />
          <Skeleton variant="text" />
          <Skeleton variant="text" />
          <Skeleton variant="text" width="70%" />
        </Box>
      );
    }

    if (loadState === 'error') {
      return (
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2" color="error">
            {error || 'This content could not be loaded.'}
          </Typography>
          <Button size="small" onClick={reload}>
            Try again
          </Button>
        </Stack>
      );
    }

    if (loadState === 'missing') {
      // Authors get an invitation to create the content; everyone else gets the
      // caller's fallback rather than an internal "not found" message.
      if (!canEdit) {
        return defaultContent ? <Typography variant="body1">{defaultContent}</Typography> : null;
      }

      return (
        <Stack spacing={1} alignItems="flex-start">
          <Typography variant="body2" color="text.secondary">
            No content exists for <code>{activeSlug}</code> yet.
          </Typography>
          <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={openEditor}>
            Create it
          </Button>
        </Stack>
      );
    }

    const isCommentsEnabled = Boolean(
      (record?.enableComments !== undefined ? record.enableComments : enableComments) &&
      (record?.id || activeSlug)
    );

    return (
      <>
        <ContentRenderer
          content={displayBody || defaultContent}
          id={(record?.id || activeSlug) as string}
          enableComments={isCommentsEnabled}
          context="StaticContent"
          commentLayout={resolvedCommentLayout}
          commentsProps={{
            title: resolvedCommentsProps.title || 'Comments',
            ...resolvedCommentsProps,
          }}
          reactory={reactory}
        />

        {useExpanded && (
          <Button
            size="small"
            onClick={() => setExpanded((v) => !v)}
            startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            sx={{ mt: 1 }}
          >
            {expanded ? 'Show less' : 'Show more'}
          </Button>
        )}
      </>
    );
  };

  /**
   * The hover affordance that turns the surface into an editor. Deliberately
   * quiet: it only appears on hover, and only for users who can edit.
   */
  const renderEditAffordance = () => {
    if (!canEdit || editing || loadState === 'loading' || loadState === 'missing') return null;

    return (
      <Fade in={hovering}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 4,
            borderRadius: 1,
            backgroundColor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            boxShadow: 2,
            p: 0.25,
          }}
        >
          {record?.published === false && (
            <Chip size="small" color="warning" variant="outlined" label="Draft" sx={{ mr: 0.5 }} />
          )}
          {translations.length > 0 && (
            <Tooltip title={`${translations.length} translation${translations.length === 1 ? '' : 's'}`}>
              <Chip size="small" variant="outlined" label={`${translations.length + 1} langs`} sx={{ mr: 0.5 }} />
            </Tooltip>
          )}
          <Tooltip title="Edit this content">
            <IconButton size="small" onClick={openEditor} aria-label="Edit content">
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Fade>
    );
  };

  // Legacy display modes keep working for forms that ask for them explicitly.
  if (editing && editDisplayMode === 'drawer') {
    return (
      <>
        <Container {...containerProps} sx={{ position: 'relative', ...(containerProps.sx || {}) }}>
          {renderView()}
        </Container>
        <Drawer
          anchor="right"
          open
          onClose={closeEditor}
          ModalProps={{ BackdropProps: { invisible: true } }}
          PaperProps={{ sx: { width: { xs: '100%', sm: 640, md: 760 }, p: 2 } }}
        >
          {editorElement}
        </Drawer>
      </>
    );
  }

  if (editing && editDisplayMode === 'modal') {
    return (
      <>
        <Container {...containerProps} sx={{ position: 'relative', ...(containerProps.sx || {}) }}>
          {renderView()}
        </Container>
        <Dialog fullScreen open onClose={closeEditor}>
          <DialogContent sx={{ p: 3 }}>{editorElement}</DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <Container
      {...containerProps}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      sx={{
        position: 'relative',
        ...(canEdit && !editing
          ? {
              transition: 'box-shadow 120ms ease',
              '&:hover': { boxShadow: (theme) => `0 0 0 1px ${theme.palette.divider}` },
              borderRadius: 1,
            }
          : {}),
        ...(containerProps.sx || {}),
      }}
    >
      {editing ? editorElement : renderView()}
      {renderEditAffordance()}
    </Container>
  );
};

const StaticContentComponent: any = compose(withReactory)(StaticContent);

StaticContentComponent.meta = {
  nameSpace: 'core',
  name: 'StaticContent',
  version: '1.0.0',
  component: StaticContentComponent,
  tags: ['static content', 'html', 'markdown', 'cms', 'editor', 'translations'],
  description:
    'Managed content that renders markdown, HTML or plain text and lets permitted users edit it in place, with metadata, publishing, translations and AI assistance on adjacent surfaces.',
};

export default StaticContentComponent;
