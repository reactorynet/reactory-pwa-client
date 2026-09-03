export const processTemplateStrings = (
  obj: unknown,
  reactory: Reactory.Client.ReactorySDK,
  context: Record<string, unknown>,
): unknown => {
  if (typeof obj === 'string' && obj.includes('${')) {
    try {
      if (obj.includes('::')) {
        const [_value, transform] = obj.split('::');
        let processed: unknown = reactory.utils.template(_value)(context);
        if (transform) {
          switch (transform) {
            case 'toInt':
              processed = parseInt(String(processed), 10);
              break;
            case 'toString':
              processed = String(processed);
              break;
            case 'toDate':
              processed = new Date(String(processed));
              break;
            case 'toBoolean':
              processed = Boolean(processed);
              break;
            default:
              break;
          }
        }
        return processed;
      }
      return reactory.utils.template(obj)(context);
    } catch (error) {
      reactory.warning(`Error processing template ${obj}:`, error);
      return obj;
    }
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => processTemplateStrings(item, reactory, context));
  }

  if (obj !== null && typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    Object.keys(obj as Record<string, unknown>).forEach((key) => {
      result[key] = processTemplateStrings(
        (obj as Record<string, unknown>)[key],
        reactory,
        context,
      );
    });
    return result;
  }

  return obj;
};
