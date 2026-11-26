import React from 'react';
import { act } from '@testing-library/react';
import { renderIntoNode, unmountNode } from '../domRoots';

describe('domRoots', () => {
  let node: HTMLDivElement;

  beforeEach(() => {
    node = document.createElement('div');
    document.body.appendChild(node);
  });

  afterEach(() => {
    act(() => {
      unmountNode(node);
    });
    node.remove();
  });

  it('renders into a node and re-renders into the same root', () => {
    let first: unknown;
    act(() => {
      first = renderIntoNode(node, <span>first</span>);
    });
    expect(node.textContent).toBe('first');

    act(() => {
      expect(renderIntoNode(node, <span>second</span>)).toBe(first);
    });
    expect(node.textContent).toBe('second');
  });

  it('calls the render callback after the element is committed', () => {
    const callback = jest.fn(() => expect(node.textContent).toBe('done'));
    act(() => {
      renderIntoNode(node, <span>done</span>, callback);
    });
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('unmounts by node and reports whether anything was mounted', () => {
    expect(unmountNode(node)).toBe(false);
    act(() => {
      renderIntoNode(node, <span>mounted</span>);
    });
    let result = false;
    act(() => {
      result = unmountNode(node);
    });
    expect(result).toBe(true);
    expect(node.textContent).toBe('');
    expect(unmountNode(node)).toBe(false);
  });
});
