// react-markdown and remark-gfm pull in the ESM-only unified/micromark tree.
// The smoke harness checks that plugins mount, not how markdown renders, so
// the children are rendered as plain text.
import React from 'react';

const Markdown = ({ children }: { children?: React.ReactNode }) => <div data-testid="markdown-stub">{children}</div>;

export const uriTransformer = (uri: string): string => uri;
export default Markdown;
