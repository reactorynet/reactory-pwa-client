import React, { useState } from 'react';
import ReactQuill from 'react-quill';
import { makeStyles } from '@mui/styles';
import 'react-quill/dist/quill.snow.css'; // Import base styles
import 'react-quill/dist/quill.bubble.css'; // Import bubble theme
import { color } from 'd3';
import { borderRadius } from '@mui/system';
import { FormControl, InputLabel } from '@mui/material';

const useStyles = makeStyles((theme: any) => { 
  const { palette } = theme;
  const { mode } = palette;
  const isLight = mode === 'light';
  const isDark = mode === 'dark';

  const backgroundImageBlur = isLight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return ({
    editorContainer: {
      border: '1px solid #ccc',
      borderRadius: theme.borderRadius,
      overflow: 'hidden',
      boxShadow: theme.shadows[1],
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },
    editor: {
      minHeight: '200px',
      fontFamily: theme.typography.fontFamily,
      // padding: theme.spacing(2),
      marginTop: theme.spacing(2),
      zIndex: 1,
      '& .ql-toolbar': {
        backgroundColor: theme.palette.background.paper,
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: theme.palette.text.primary,
        // backgroundImage: `linear-gradient(to bottom, ${backgroundImageBlur}, ${backgroundImageBlur})`,
      },
      '& .ql-toolbar .ql-stroke': { 
        stroke: theme.palette.text.primary,
      },
      '& .ql-toolbar .ql-picker-label': { 
        color: theme.palette.text.primary,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: theme.borderRadius,
      },
      '& .ql-container': {
        border: 'none',
        fontSize: theme.typography.body1.fontSize,
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
        // backgroundImage: `linear-gradient(to bottom, ${backgroundImageBlur}, ${backgroundImageBlur})`,
      },
      '& .ql-editor': {
        minHeight: '150px',
        backgroundColor: theme.palette.background.paper,
        color: theme.palette.text.primary,
      },
      '& .ql-editor.ql-blank::before': {
        color: theme.palette.text.disabled,
      },
    },
  })
});

const RichTextEditor = (props: any) => {
  const [editorContent, setEditorContent] = useState(props.formData);
  const classes = useStyles();

  const handleEditorChange = (content) => {
    setEditorContent(content);
    if (props.onChange) {
      props.onChange(content);
    }
  };

  return (
    <ReactQuill
      id={props.idSchema.$id}
      value={editorContent}
      onChange={handleEditorChange}
      theme="snow"
      placeholder={props.schema.title}
      className={classes.editor}
    />
  );
};

export default RichTextEditor;
