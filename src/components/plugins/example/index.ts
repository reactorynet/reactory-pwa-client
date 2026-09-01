import Reactory from '@reactorynet/reactory-core';
import HelloWorldWidget from './HelloWorldWidget';

export const components: Reactory.Client.IReactoryComponentRegistryEntry<any>[] = [
  {
    nameSpace: 'example',
    name: 'HelloWorldWidget',
    version: '1.0.0',
    component: HelloWorldWidget,
    description: 'A basic example text widget displaying Hello World.',
    tags: ['example', 'widget', 'text', 'hello-world'],
  },
];

export default components;
