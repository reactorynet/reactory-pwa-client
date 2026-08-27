import ImageMacroDefinition from '../image.macro';

const mockUuid = 'test-uuid-1234';
const reactory: any = {
  utils: {
    uuid: () => mockUuid,
    safeCDNUrl: (path: string) => `https://cdn.example.com${path}`,
  },
};

const imageMacro = ImageMacroDefinition.component as any;

describe('image.macro', () => {
  it('has correct definition properties for client-side tool discovery', () => {
    expect(ImageMacroDefinition.name).toBe('ImageMacro');
    expect(ImageMacroDefinition.alias).toBe('image');
    expect(ImageMacroDefinition.runat).toBe('client');
    expect(ImageMacroDefinition.tools).toBeDefined();
    expect(ImageMacroDefinition.tools?.[0]?.function.name).toBe('image');
    expect(ImageMacroDefinition.tools?.[0]?.runat).toBe('client');
    expect(ImageMacroDefinition.tools?.[0]?.safeForAutoExecution).toBe(true);
  });

  it('returns a validation error when no src or images array is provided', async () => {
    const result = await imageMacro({}, {} as any, reactory);

    expect(result.__typename).toBe('ReactorChatMessage');
    expect(result.role).toBe('assistant');
    expect(result.content).toContain('required');
    expect(result.component).toBeUndefined();
  });

  it('renders a single image with core.ImageComponent@1.0.0 and correct props', async () => {
    const args = {
      src: 'https://example.com/photo.png',
      alt: 'Sample Photo',
      caption: 'A scenic photo',
      options: {
        variant: 'avatar',
        avatarVariant: 'circular',
        width: 100,
        height: 100,
      },
    };

    const result = await imageMacro(args, { id: 'chat-123' } as any, reactory);

    expect(result.__typename).toBe('ReactorChatMessage');
    expect(result.role).toBe('assistant');
    expect(result.component).toBe('core.ImageComponent@1.0.0');
    expect(result.props.value).toBe('https://example.com/photo.png');
    expect(result.props.src).toBe('https://example.com/photo.png');
    expect(result.props.images).toHaveLength(1);
    expect(result.props.alt).toBe('Sample Photo');
    expect(result.props.variant).toBe('avatar');
    expect(result.props.avatarVariant).toBe('circular');
    expect(result.props.style).toEqual({ width: 100, height: 100 });
    expect(result.content).toContain('![Sample Photo](https://example.com/photo.png)');
    expect(result.content).toContain('A scenic photo');
    expect(result.props.chatSessionId).toBe('chat-123');
  });

  it('supports options and images passed as JSON strings from LLM', async () => {
    const args = {
      images: JSON.stringify([
        { id: 'img-1', src: 'https://example.com/item1.png', title: 'Card 1', caption: 'First item' },
        { id: 'img-2', src: 'https://example.com/item2.png', title: 'Card 2', caption: 'Second item' },
      ]),
      options: JSON.stringify({
        variant: 'grid',
        columns: 2,
        selectable: true,
        eventChannel: 'custom.channel',
        eventId: 'custom.image.selected',
      }),
    };

    const result = await imageMacro(args, { id: 'chat-456' } as any, reactory);

    expect(result.component).toBe('core.ImageComponent@1.0.0');
    expect(result.props.images).toHaveLength(2);
    expect(result.props.images[0].src).toBe('https://example.com/item1.png');
    expect(result.props.images[0].title).toBe('Card 1');
    expect(result.props.variant).toBe('grid');
    expect(result.props.options.selectable).toBe(true);
    expect(result.props.options.eventChannel).toBe('custom.channel');
    expect(result.props.options.eventId).toBe('custom.image.selected');
    expect(result.content).toContain('![Card 1](https://example.com/item1.png)');
    expect(result.content).toContain('![Card 2](https://example.com/item2.png)');
  });

  it('supports an array of image URL strings', async () => {
    const args = {
      images: [
        'https://example.com/pic1.jpg',
        'https://example.com/pic2.jpg',
      ],
      alt: 'Gallery Item',
    };

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.props.images).toHaveLength(2);
    expect(result.props.images[0].src).toBe('https://example.com/pic1.jpg');
    expect(result.props.images[1].src).toBe('https://example.com/pic2.jpg');
    expect(result.props.variant).toBe('grid');
  });

  it('resolves relative CDN image paths', async () => {
    const args = {
      src: '/images/logo.png',
      alt: 'Company Logo',
    };

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.props.value).toBe('https://cdn.example.com/images/logo.png');
    expect(result.props.src).toBe('https://cdn.example.com/images/logo.png');
    expect(result.content).toContain('https://cdn.example.com/images/logo.png');
  });

  it('resolves local disk paths under reactory-data to CDN URLs in multi-image mode', async () => {
    const args = {
      images: [
        {
          src: '/Users/wweber/Source/reactory/reactory-data/profiles/reactor/personas/reactor/avatar.png',
          title: 'Reactor Persona',
        },
      ],
    };

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.props.images[0].src).toBe('https://cdn.example.com/profiles/reactor/personas/reactor/avatar.png');
  });
});
