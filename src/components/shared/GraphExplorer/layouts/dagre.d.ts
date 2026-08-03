/**
 * dagre ships no type declarations and @types/dagre is not a project
 * dependency — a shorthand declaration keeps TS strict happy. The layout
 * wrapper (hierarchicalLayout.ts) confines the untyped surface to one file.
 */
declare module 'dagre';
