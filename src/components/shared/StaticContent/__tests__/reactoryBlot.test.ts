import Quill from 'quill';
import {
  REACTORY_EMBED_CLASS,
  registerReactoryBlot,
  toContentHtml,
  toEditorHtml,
} from '../editor/reactoryBlot';

/**
 * Quill only preserves markup it has a blot for. Without a registered embed it
 * matched `<reactory />` against nothing, found no blot, and dropped it — so
 * "Insert Reactory Component" in the rich text surface appeared to work while
 * silently discarding the component. These tests hold the round trip:
 * stored tag → editor embed → stored tag.
 */

const TAG = '<reactory reactory-component="core.Label@1.0.0" reactory-props-text="Hi" />';

describe('reactory Quill embed', () => {
  describe('toEditorHtml', () => {
    it('converts a stored tag into embed markup', () => {
      const html = toEditorHtml(`<p>Before</p>${TAG}<p>After</p>`);
      expect(html).toContain(REACTORY_EMBED_CLASS);
      expect(html).toContain('data-reactory-fqn="core.Label@1.0.0"');
    });

    it('leaves content without tags untouched', () => {
      expect(toEditorHtml('<p>Nothing here</p>')).toBe('<p>Nothing here</p>');
      expect(toEditorHtml('')).toBe('');
    });
  });

  describe('toContentHtml', () => {
    it('converts embed markup back into the stored tag', () => {
      const restored = toContentHtml(toEditorHtml(`<p>Before</p>${TAG}<p>After</p>`));
      expect(restored).toContain('<reactory');
      expect(restored).toContain('reactory-component="core.Label@1.0.0"');
      expect(restored).toContain('reactory-props-text="Hi"');
    });

    it('preserves the surrounding markup', () => {
      const restored = toContentHtml(toEditorHtml(`<p>Before</p>${TAG}<p>After</p>`));
      expect(restored).toContain('<p>Before</p>');
      expect(restored).toContain('<p>After</p>');
    });

    it('is a faithful round trip', () => {
      const original = `<p>Before</p>${TAG}<p>After</p>`;
      expect(toContentHtml(toEditorHtml(original))).toContain(TAG);
    });

    it('leaves content without embeds untouched', () => {
      expect(toContentHtml('<p>Plain</p>')).toBe('<p>Plain</p>');
    });
  });

  describe('inside a live Quill editor', () => {
    const mountQuill = () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      registerReactoryBlot();
      return new Quill(el, { theme: undefined as any });
    };

    it('keeps the component when embed markup is pasted', () => {
      const quill = mountQuill();
      quill.clipboard.dangerouslyPasteHTML(
        0,
        toEditorHtml(`<p>Before</p>${TAG}<p>After</p>`),
        'user' as any
      );

      // Without the blot this assertion fails: Quill emitted only the
      // paragraphs and the component was gone.
      expect(quill.root.innerHTML).toContain(REACTORY_EMBED_CLASS);
      expect(quill.root.innerHTML).toContain('core.Label@1.0.0');
    });

    it('round-trips back to the stored tag after editing', () => {
      const quill = mountQuill();
      quill.clipboard.dangerouslyPasteHTML(0, toEditorHtml(TAG), 'user' as any);

      const stored = toContentHtml(quill.root.innerHTML);
      expect(stored).toContain('reactory-component="core.Label@1.0.0"');
      expect(stored).toContain('reactory-props-text="Hi"');
    });

    it('can be registered more than once without throwing', () => {
      // React re-renders call this on every pass.
      expect(() => {
        registerReactoryBlot();
        registerReactoryBlot();
        registerReactoryBlot();
      }).not.toThrow();
    });
  });
});
