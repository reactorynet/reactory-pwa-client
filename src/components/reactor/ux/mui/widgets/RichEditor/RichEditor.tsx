import React, { useEffect, useState } from 'react';
import { styled } from '@mui/material/styles';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css'; // Import base styles
import 'react-quill/dist/quill.bubble.css'; // Import bubble theme
import { useReactory } from '@reactory/client-core/api/ApiProvider';

const PREFIX = 'RichTextEditor';

const classes = {
  editorContainer: `${PREFIX}-editorContainer`,
  editor: `${PREFIX}-editor`
};

const StyledReactQuill = styled(ReactQuill)(({ theme }) => { 
  const { palette } = theme;
  const { mode } = palette;
  const isLight = mode === 'light';
  const isDark = mode === 'dark';

  const backgroundImageBlur = isLight ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return {
    [`& .${classes.editorContainer}`]: {
      border: '1px solid #ccc',
      borderRadius: theme.shape.borderRadius,
      overflow: 'hidden',
      boxShadow: theme.shadows[1],
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },

    [`& .${classes.editor}`]: {
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
        borderRadius: theme.shape.borderRadius,
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
    }
  };
});

const RichTextEditor = (props: any) => {
  const [content, setContent] = useState();

  const reactor = useReactory();

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
    <StyledReactQuill
      id={props.idSchema.$id}
      value={content}
      onChange={handleEditorChange}      
      placeholder={props.schema.title}
      className={classes.editor}
      modules={modules}
      formats={formats}
    />
  );
};

export default RichTextEditor;
