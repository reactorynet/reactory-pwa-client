import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TagCloud, { TagItem } from '../TagCloud';

describe('TagCloud', () => {
  it('renders string tags correctly', () => {
    render(<TagCloud tags={['ai', 'react', 'typescript']} />);
    expect(screen.getByText('ai')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  it('renders TagItem objects with labels and counts', () => {
    const items: TagItem[] = [
      { id: 't1', label: 'Docker', count: 5 },
      { id: 't2', label: 'Kubernetes', count: 3 },
    ];
    render(<TagCloud tags={items} showCounts={true} />);
    expect(screen.getByText('Docker (5)')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes (3)')).toBeInTheDocument();
  });

  it('toggles selection and calls onTagSelected in multi-select mode', () => {
    const onTagSelected = jest.fn();
    render(
      <TagCloud
        tags={['python', 'rust', 'go']}
        selectedTags={['python']}
        onTagSelected={onTagSelected}
      />
    );

    // Clicking unselected tag adds it
    fireEvent.click(screen.getByText('rust'));
    expect(onTagSelected).toHaveBeenCalledWith(['python', 'rust']);

    // Clicking selected tag removes it
    fireEvent.click(screen.getByText('python'));
    expect(onTagSelected).toHaveBeenCalledWith([]);
  });

  it('handles single-select mode when multiple is false', () => {
    const onTagSelected = jest.fn();
    render(
      <TagCloud
        tags={['low', 'medium', 'high']}
        selectedTags={['medium']}
        multiple={false}
        onTagSelected={onTagSelected}
      />
    );

    fireEvent.click(screen.getByText('high'));
    expect(onTagSelected).toHaveBeenCalledWith(['high']);

    // Clicking the already selected tag deselects it
    fireEvent.click(screen.getByText('medium'));
    expect(onTagSelected).toHaveBeenCalledWith([]);
  });

  it('renders clear/all button and resets selection', () => {
    const onTagSelected = jest.fn();
    render(
      <TagCloud
        tags={['tag1', 'tag2']}
        selectedTags={['tag1']}
        showClear={true}
        clearLabel="All Tags"
        onTagSelected={onTagSelected}
      />
    );

    const allChip = screen.getByText('All Tags');
    expect(allChip).toBeInTheDocument();
    fireEvent.click(allChip);
    expect(onTagSelected).toHaveBeenCalledWith([]);
  });

  it('supports maxDisplay and expanding/collapsing tags', () => {
    const tags = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    render(<TagCloud tags={tags} maxDisplay={3} />);

    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(screen.queryByText('d')).not.toBeInTheDocument();

    const expandBtn = screen.getByText('+4 more');
    expect(expandBtn).toBeInTheDocument();

    // Click expand
    fireEvent.click(expandBtn);
    expect(screen.getByText('d')).toBeInTheDocument();
    expect(screen.getByText('Show less')).toBeInTheDocument();

    // Click collapse
    fireEvent.click(screen.getByText('Show less'));
    expect(screen.queryByText('d')).not.toBeInTheDocument();
  });

  it('renders label and clear button when label is supplied and tags selected', () => {
    const onTagSelected = jest.fn();
    render(
      <TagCloud
        label="Filter by topic"
        tags={['frontend', 'backend']}
        selectedTags={['frontend']}
        onTagSelected={onTagSelected}
      />
    );

    expect(screen.getByText('Filter by topic')).toBeInTheDocument();
    const clearBtn = screen.getByText('Clear');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(onTagSelected).toHaveBeenCalledWith([]);
  });

  it('returns null when tags array is empty', () => {
    const { container } = render(<TagCloud tags={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
