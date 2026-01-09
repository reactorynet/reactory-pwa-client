import React, { useEffect, useState } from 'react';
import { styled, useTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import ReactQuill from 'react-quill';
// @ts-ignore - CSS imports don't have type declarations
import 'react-quill/dist/quill.snow.css'; // Import base styles
// @ts-ignore - CSS imports don't have type declarations
import 'react-quill/dist/quill.bubble.css'; // Import bubble theme
import { useReactory } from '@reactory/client-core/api';

const PREFIX = 'RichTextEditor';

const classes = {
  editorContainer: `${PREFIX}-editorContainer`,
  editor: `${PREFIX}-editor`
};

const StyledEditorContainer = styled(Box)(({ theme }) => { 
  const { palette } = theme;
  const { mode } = palette;
  const isLight = mode === 'light';
  const isDark = mode === 'dark';

  const backgroundImageBlur = isLight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return {
    [`&.${classes.editorContainer}`]: {
      border: '1px solid #ccc',
      borderRadius: theme.shape.borderRadius,
      overflow: 'hidden',
      boxShadow: theme.shadows[1],
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },

    [`& .${classes.editor}`]: {
      minHeight: '200px',
      fontFamily: theme.typography?.fontFamily || 'inherit',
      marginTop: theme.spacing(2),
      zIndex: 1,
    },

    // Quill toolbar styling
    '& .ql-toolbar': {
      backgroundColor: theme.palette.background.paper,
      borderBottom: `1px solid ${theme.palette.divider}`,
      color: theme.palette.text.primary,
      borderTop: 'none',
      borderLeft: 'none',
      borderRight: 'none',
    },

    // Toolbar button icons
    '& .ql-toolbar .ql-stroke': { 
      stroke: theme.palette.text.primary,
    },
    '& .ql-toolbar .ql-fill': { 
      fill: theme.palette.text.primary,
    },
    '& .ql-toolbar button:hover .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button:hover .ql-fill': {
      fill: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-stroke': {
      stroke: theme.palette.primary.main,
    },
    '& .ql-toolbar button.ql-active .ql-fill': {
      fill: theme.palette.primary.main,
    },

    // Toolbar picker labels
    '& .ql-toolbar .ql-picker-label': { 
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
    },
    '& .ql-toolbar .ql-picker-label:hover': {
      color: theme.palette.primary.main,
    },

    // Picker options dropdown
    '& .ql-toolbar .ql-picker-options': {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: theme.shape.borderRadius,
      boxShadow: theme.shadows[2],
    },
    '& .ql-toolbar .ql-picker-item': {
      color: theme.palette.text.primary,
    },
    '& .ql-toolbar .ql-picker-item:hover': {
      color: theme.palette.primary.main,
      backgroundColor: theme.palette.action.hover,
    },

    // Quill editor container
    '& .ql-container': {
      border: 'none',
      fontSize: theme.typography?.body1?.fontSize,
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },

    // Quill editor content area
    '& .ql-editor': {
      minHeight: '150px',
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      padding: theme.spacing(2),
    },

    // Placeholder text
    '& .ql-editor.ql-blank::before': {
      color: theme.palette.text.disabled,
      fontStyle: 'italic',
    },

    // Selected text background
    '& .ql-editor ::selection': {
      backgroundColor: theme.palette.action.selected,
    },
  };
});

const RichTextEditor = (props: any) => {
  const [content, setContent] = useState();

  const reactory = useReactory();

  useEffect(() => { 
    if (props.formData && props.formData !== content) {
      setContent(props.formData);
    }
  }, [props.formData]);

  useEffect(() => { 
    if (props.onChange) {
      if (content && content !== props.formData) {
        props.onChange(content);
      }
    }
  }, [content]);

  const handleEditorChange = (content) => {    
    setContent(content);
  };

  let modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline','strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'image'],
      ['clean']
    ],
  };

  let formats = [
    'header',
    'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent',
    'link', 'image'
  ];
  
  return (
    <StyledEditorContainer className={classes.editorContainer}>
      <ReactQuill
        id={props?.idSchema?.$id || 'rich-editor'}
        value={content}
        onChange={handleEditorChange}
        theme="snow"
        placeholder={props?.placeholder || props?.schema?.title || props?.uiSchema?.['ui:placeholder']}
        className={classes.editor}
        modules={modules}
        formats={formats}
      />
    </StyledEditorContainer>
  );
};

export default RichTextEditor;
