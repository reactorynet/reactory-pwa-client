import { Quill } from 'react-quill';

export const HR_BLOT_NAME = 'hr';
export const HR_CLASS = 'reactory-hr';

let registered = false;

/**
 * Custom BlockEmbed for Horizontal Rule (`<hr>`).
 */
export const registerHorizontalRuleBlot = (): void => {
  if (registered || !Quill) return;

  try {
    const BlockEmbed: any = Quill.import('blots/block/embed');

    class HorizontalRuleBlot extends BlockEmbed {
      static blotName = HR_BLOT_NAME;
      static tagName = 'HR';
      static className = HR_CLASS;

      static create() {
        const node: HTMLElement = super.create();
        node.setAttribute('contenteditable', 'false');
        return node;
      }
    }

    Quill.register(HorizontalRuleBlot, true);
    registered = true;
  } catch (e) {
    registered = false;
  }
};
