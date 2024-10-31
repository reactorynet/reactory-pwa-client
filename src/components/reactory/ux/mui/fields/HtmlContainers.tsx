import React from 'react';

export const Div = ({ children, ...props }) => { 
  return (
    <div {...props}>
      {children}
    </div>
  )
}

export const Section = ({ children, ...props }) => { 
  return (
    <section {...props}>
      {children}
    </section>
  )
}

export const Article = ({ children, ...props }) => { 
  return (
    <article {...props}>
      {children}
    </article>
  )
}

export const Paragraph = ({ children, ...props }) => { 
  return (
    <p {...props}>
      {children}
    </p>
  )
}