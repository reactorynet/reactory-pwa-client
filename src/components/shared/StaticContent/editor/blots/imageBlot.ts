import { Quill } from 'react-quill';

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: string;
  height?: string;
  style?: string;
  className?: string;
}

const ATTRIBUTES = ['alt', 'title', 'width', 'height', 'style', 'class'];

let registered = false;

/**
 * Enhanced Image blot for Quill that preserves HTML image attributes:
 * alt, title, width, height, inline style, and classes.
 */
export const registerEnhancedImageBlot = (): void => {
  if (registered || !Quill) return;

  try {
    const Parchment: any = Quill.import('parchment');
    const Embed: any = Quill.import('blots/embed') || Parchment.Embed;

    class EnhancedImage extends Embed {
      static blotName = 'image';
      static tagName = 'IMG';

      static create(value: string | ImageAttributes) {
        const node: HTMLElement = super.create(value);
        if (typeof value === 'string') {
          node.setAttribute('src', value);
        } else if (typeof value === 'object' && value !== null) {
          node.setAttribute('src', value.src || '');
          if (value.alt) node.setAttribute('alt', value.alt);
          if (value.title) node.setAttribute('title', value.title);
          if (value.width) node.setAttribute('width', value.width);
          if (value.height) node.setAttribute('height', value.height);
          if (value.style) node.setAttribute('style', value.style);
          if (value.className) node.setAttribute('class', value.className);
        }
        return node;
      }

      static formats(domNode: HTMLElement): ImageAttributes {
        const formats: any = {
          src: domNode.getAttribute('src') || '',
        };
        ATTRIBUTES.forEach((attr) => {
          if (domNode.hasAttribute(attr)) {
            formats[attr === 'class' ? 'className' : attr] = domNode.getAttribute(attr);
          }
        });
        return formats;
      }

      static value(domNode: HTMLElement): ImageAttributes {
        return EnhancedImage.formats(domNode);
      }

      format(name: string, value: any) {
        if (ATTRIBUTES.includes(name) || name === 'className') {
          const attr = name === 'className' ? 'class' : name;
          if (value) {
            this.domNode.setAttribute(attr, value);
          } else {
            this.domNode.removeAttribute(attr);
          }
        } else {
          super.format(name, value);
        }
      }
    }

    Quill.register(EnhancedImage, true);
    registered = true;
  } catch (e) {
    registered = false;
  }
};
