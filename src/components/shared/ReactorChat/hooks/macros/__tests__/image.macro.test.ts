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

  it('returns a validation error when no src is provided', async () => {
    const result = await imageMacro({}, {} as any, reactory);

    expect(result.__typename).toBe('ReactorChatMessage');
    expect(result.role).toBe('assistant');
    expect(result.content).toContain('required');
    expect(result.component).toBeUndefined();
  });

  it('renders image with core.ImageComponent@1.0.0 and correct props', async () => {
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

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.__typename).toBe('ReactorChatMessage');
    expect(result.role).toBe('assistant');
    expect(result.component).toBe('core.ImageComponent@1.0.0');
    expect(result.props.value).toBe('https://example.com/photo.png');
    expect(result.props.src).toBe('https://example.com/photo.png');
    expect(result.props.alt).toBe('Sample Photo');
    expect(result.props.variant).toBe('avatar');
    expect(result.props.avatarVariant).toBe('circular');
    expect(result.props.style).toEqual({ width: 100, height: 100 });
    expect(result.content).toContain('![Sample Photo](https://example.com/photo.png)');
    expect(result.content).toContain('A scenic photo');
  });

  it('supports options passed as JSON string from LLM', async () => {
    const args = {
      src: 'https://example.com/diagram.png',
      alt: 'Architecture Diagram',
      options: JSON.stringify({
        variant: 'img',
        maxWidth: '80%',
      }),
    };

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.component).toBe('core.ImageComponent@1.0.0');
    expect(result.props.value).toBe('https://example.com/diagram.png');
    expect(result.props.variant).toBe('img');
    expect(result.props.style).toEqual({ maxWidth: '80%' });
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

  it('resolves local disk paths under reactory-data to CDN URLs', async () => {
    const args = {
      src: '/Users/wweber/Source/reactory/reactory-data/profiles/reactor/personas/reactor/avatar.png',
      alt: 'Reactor Avatar',
    };

    const result = await imageMacro(args, {} as any, reactory);

    expect(result.props.value).toBe('https://cdn.example.com/profiles/reactor/personas/reactor/avatar.png');
    expect(result.props.src).toBe('https://cdn.example.com/profiles/reactor/personas/reactor/avatar.png');
    expect(result.content).toContain('https://cdn.example.com/profiles/reactor/personas/reactor/avatar.png');
  });
});
