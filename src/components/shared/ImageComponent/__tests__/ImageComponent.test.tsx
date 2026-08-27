import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageComponent } from '../ImageComponent';
import { ImageItem } from '../types';

describe('ImageComponent', () => {
  let mockPubDef: jest.Mock;
  let mockReactory: any;

  beforeEach(() => {
    mockPubDef = jest.fn();
    mockReactory = {
      muiTheme: {
        spacing: (val: number) => `${val * 8}px`,
        palette: {
          primary: { main: '#1976d2' },
          divider: '#e0e0e0',
          grey: { 100: '#f5f5f5', 200: '#eeeeee', 300: '#e0e0e0', 400: '#bdbdbd', 500: '#9e9e9e' },
          text: { secondary: '#757575' },
        },
        shape: { borderRadius: 4 },
        shadows: Array(25).fill('none'),
      },
      amq: {
        $pub: {
          def: mockPubDef,
        },
      },
      utils: {
        safeCDNUrl: (url: string) => url,
      },
      getComponent: () => () => null,
    };
  });

  it('renders a single image correctly', () => {
    render(
      <ImageComponent
        src="https://example.com/single.png"
        alt="Single Test"
        reactory={mockReactory}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/single.png');
    expect(img).toHaveAttribute('alt', 'Single Test');
  });

  it('renders a responsive grid when multiple images are provided', () => {
    const images: ImageItem[] = [
      { id: '1', src: 'https://example.com/1.png', title: 'Image 1', caption: 'Caption 1' },
      { id: '2', src: 'https://example.com/2.png', title: 'Image 2', caption: 'Caption 2' },
      { id: '3', src: 'https://example.com/3.png', title: 'Image 3', caption: 'Caption 3' },
    ];

    render(
      <ImageComponent
        images={images}
        variant="grid"
        options={{ columns: 3, showTitles: true, showCaptions: true }}
        reactory={mockReactory}
      />
    );

    expect(screen.getByText('Image 1')).toBeInTheDocument();
    expect(screen.getByText('Image 2')).toBeInTheDocument();
    expect(screen.getByText('Image 3')).toBeInTheDocument();
    expect(screen.getByText('Caption 1')).toBeInTheDocument();
    expect(screen.getByText('Caption 2')).toBeInTheDocument();
    expect(screen.getByText('Caption 3')).toBeInTheDocument();
  });

  it('publishes an AMQ event when an image is clicked in selectable mode', () => {
    const images: ImageItem[] = [
      { id: 'img-a', src: 'https://example.com/a.png', title: 'Option A' },
      { id: 'img-b', src: 'https://example.com/b.png', title: 'Option B' },
    ];
    const onSelect = jest.fn();

    render(
      <ImageComponent
        images={images}
        onSelect={onSelect}
        options={{
          selectable: true,
          eventChannel: 'test.channel',
          eventId: 'custom.select',
          chatSessionId: 'session-xyz',
        }}
        reactory={mockReactory}
      />
    );

    const firstCard = screen.getByText('Option A');
    fireEvent.click(firstCard);

    expect(mockPubDef).toHaveBeenCalledTimes(1);
    expect(mockPubDef).toHaveBeenCalledWith(
      'custom.select',
      expect.objectContaining({
        selected: expect.objectContaining({ id: 'img-a', src: 'https://example.com/a.png' }),
        selectedImages: expect.arrayContaining([
          expect.objectContaining({ id: 'img-a' }),
        ]),
        chatSessionId: 'session-xyz',
      }),
      'test.channel'
    );

    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'img-a' }),
      expect.arrayContaining([expect.objectContaining({ id: 'img-a' })])
    );
  });

  it('supports multi-selection when multiSelect is true', () => {
    const images: ImageItem[] = [
      { id: 'img-1', src: 'https://example.com/1.png', title: 'First' },
      { id: 'img-2', src: 'https://example.com/2.png', title: 'Second' },
    ];
    const onSelect = jest.fn();

    render(
      <ImageComponent
        images={images}
        onSelect={onSelect}
        options={{
          selectable: true,
          multiSelect: true,
        }}
        reactory={mockReactory}
      />
    );

    fireEvent.click(screen.getByText('First'));
    fireEvent.click(screen.getByText('Second'));

    expect(mockPubDef).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenLastCalledWith(
      expect.objectContaining({ id: 'img-2' }),
      expect.arrayContaining([
        expect.objectContaining({ id: 'img-1' }),
        expect.objectContaining({ id: 'img-2' }),
      ])
    );
  });

  it('renders a placeholder when no image source is provided', () => {
    render(
      <ImageComponent
        placeholder="Custom placeholder"
        reactory={mockReactory}
      />
    );

    expect(screen.getByText('Custom placeholder')).toBeInTheDocument();
  });
});
