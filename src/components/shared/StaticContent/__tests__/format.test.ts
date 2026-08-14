import {
  coerceFormat,
  contentStats,
  convertContent,
  detectFormat,
  htmlToMarkdown,
  htmlToText,
  isLossyConversion,
  markdownToHtml,
  textToHtml,
} from '../format';

describe('static content format conversion', () => {
  describe('markdownToHtml', () => {
    it('converts headings, emphasis and links', () => {
      const html = markdownToHtml('# Title\n\nSome **bold** and a [link](https://reactory.net).');
      expect(html).toContain('<h1>Title</h1>');
      expect(html).toContain('<strong>bold</strong>');
      expect(html).toContain('href="https://reactory.net"');
    });

    it('converts gfm tables', () => {
      const html = markdownToHtml('| A | B |\n| --- | --- |\n| 1 | 2 |');
      expect(html).toContain('<table>');
      expect(html).toContain('<th>A</th>');
      expect(html).toContain('<td>2</td>');
    });
  });

  describe('htmlToMarkdown', () => {
    it('converts headings, emphasis and links', () => {
      const markdown = htmlToMarkdown(
        '<h2>Title</h2><p>Some <strong>bold</strong> and a <a href="https://reactory.net">link</a>.</p>'
      );
      expect(markdown).toContain('## Title');
      expect(markdown).toContain('**bold**');
      expect(markdown).toContain('[link](https://reactory.net)');
    });

    it('converts lists using dash bullets', () => {
      const markdown = htmlToMarkdown('<ul><li>one</li><li>two</li></ul>');
      // turndown pads the marker out to a fixed indent, so match the bullet
      // rather than an exact single space.
      expect(markdown).toMatch(/^-\s+one$/m);
      expect(markdown).toMatch(/^-\s+two$/m);
    });

    it('converts tables into markdown tables rather than flattening them', () => {
      const markdown = htmlToMarkdown(
        '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>'
      );
      expect(markdown).toContain('| A | B |');
      expect(markdown).toContain('| --- | --- |');
      expect(markdown).toContain('| 1 | 2 |');
    });
  });

  describe('reactory component tags', () => {
    const selfClosing = '<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" />';

    it('survives a markdown to html conversion untouched', () => {
      const html = markdownToHtml(`# Heading\n\n${selfClosing}\n\nTrailing text.`);
      expect(html).toContain(selfClosing);
    });

    it('survives an html to markdown conversion untouched', () => {
      const markdown = htmlToMarkdown(`<h1>Heading</h1>${selfClosing}<p>Trailing text.</p>`);
      expect(markdown).toContain(selfClosing);
    });

    it('survives a full markdown to html and back round trip', () => {
      const source = `## Section\n\n${selfClosing}\n\nSome **text**.`;
      const roundTripped = htmlToMarkdown(markdownToHtml(source));
      expect(roundTripped).toContain(selfClosing);
      expect(roundTripped).toContain('## Section');
      expect(roundTripped).toContain('**text**');
    });

    it('handles paired tags with children', () => {
      const paired = '<reactory reactory-component="core.Panel@1.0.0">inner</reactory>';
      expect(markdownToHtml(`Before\n\n${paired}\n\nAfter`)).toContain(paired);
    });

    it('preserves multiple distinct tags in order', () => {
      const first = '<reactory reactory-component="core.A@1.0.0" />';
      const second = '<reactory reactory-component="core.B@1.0.0" />';
      const html = markdownToHtml(`${first}\n\ntext\n\n${second}`);
      expect(html.indexOf(first)).toBeGreaterThanOrEqual(0);
      expect(html.indexOf(second)).toBeGreaterThan(html.indexOf(first));
    });
  });

  describe('htmlToText', () => {
    it('strips markup while keeping block breaks', () => {
      const text = htmlToText('<h1>Title</h1><p>First</p><p>Second</p>');
      expect(text).toContain('Title');
      expect(text).toContain('First');
      expect(text).toContain('Second');
      expect(text).not.toContain('<');
    });

    it('turns list items into dashes', () => {
      expect(htmlToText('<ul><li>one</li><li>two</li></ul>')).toContain('- one');
    });
  });

  describe('textToHtml', () => {
    it('escapes markup so text is never interpreted as html', () => {
      const html = textToHtml('5 < 6 & <script>alert(1)</script>');
      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });

    it('splits blank-line separated blocks into paragraphs', () => {
      const html = textToHtml('First\n\nSecond');
      expect(html).toContain('<p>First</p>');
      expect(html).toContain('<p>Second</p>');
    });
  });

  describe('convertContent', () => {
    it('returns the input unchanged when the format does not change', () => {
      expect(convertContent('# Same', 'markdown', 'markdown')).toBe('# Same');
    });

    it('handles empty content for every pairing', () => {
      expect(convertContent('', 'html', 'markdown')).toBe('');
      expect(convertContent(null as unknown as string, 'markdown', 'html')).toBe('');
    });

    it('keeps markdown source verbatim when downgrading to text', () => {
      const source = '# Heading\n\n- item';
      expect(convertContent(source, 'markdown', 'text')).toBe(source);
    });
  });

  describe('isLossyConversion', () => {
    it('treats markdown and text as interchangeable', () => {
      expect(isLossyConversion('markdown', 'text')).toBe(false);
      expect(isLossyConversion('text', 'markdown')).toBe(false);
    });

    it('flags anything involving html as lossy', () => {
      expect(isLossyConversion('html', 'markdown')).toBe(true);
      expect(isLossyConversion('markdown', 'html')).toBe(true);
      expect(isLossyConversion('html', 'text')).toBe(true);
    });

    it('is never lossy for a no-op', () => {
      expect(isLossyConversion('html', 'html')).toBe(false);
    });
  });

  describe('detectFormat', () => {
    it('detects html from block markup', () => {
      expect(detectFormat('<p>Hello</p>')).toBe('html');
      expect(detectFormat('<div><h1>Hi</h1></div>')).toBe('html');
    });

    it('detects markdown from its syntax', () => {
      expect(detectFormat('# Heading')).toBe('markdown');
      expect(detectFormat('- one\n- two')).toBe('markdown');
      expect(detectFormat('See [docs](https://reactory.net)')).toBe('markdown');
    });

    it('detects plain prose as text', () => {
      expect(detectFormat('Just a sentence with no markup at all.')).toBe('text');
    });

    it('does not let a reactory tag alone make content look like html', () => {
      expect(detectFormat('<reactory reactory-component="core.A@1.0.0" />\n\n# Heading')).toBe(
        'markdown'
      );
    });

    it('falls back to the default for empty content', () => {
      expect(detectFormat('')).toBe('html');
      expect(detectFormat('   ')).toBe('html');
    });
  });

  describe('coerceFormat', () => {
    it('accepts a known stored format regardless of case', () => {
      expect(coerceFormat('markdown')).toBe('markdown');
      expect(coerceFormat('HTML')).toBe('html');
    });

    it('infers from the body when the record has no format', () => {
      expect(coerceFormat(null, '# Heading')).toBe('markdown');
      expect(coerceFormat(undefined, '<p>Hi</p>')).toBe('html');
    });

    it('falls back to the default when there is nothing to infer from', () => {
      expect(coerceFormat(undefined)).toBe('html');
      expect(coerceFormat('nonsense-format')).toBe('html');
    });
  });

  describe('contentStats', () => {
    it('counts words in plain and markdown bodies', () => {
      expect(contentStats('one two three', 'text').words).toBe(3);
    });

    it('ignores markup when counting words in html', () => {
      expect(contentStats('<p>one two</p><p>three</p>', 'html').words).toBe(3);
    });

    it('reports zero words for an empty body', () => {
      expect(contentStats('', 'markdown').words).toBe(0);
    });

    it('always reports at least a one minute read', () => {
      expect(contentStats('short', 'text').readingMinutes).toBe(1);
    });
  });
});
