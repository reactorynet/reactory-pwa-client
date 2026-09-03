import React from 'react';

export type RouteComponentStatus =
  | 'resolving'
  | 'ready'
  | 'timeout'
  | 'missing'
  | 'error';

export type RouteFailureKind =
  | 'missing'
  | 'timeout'
  | 'error'
  | 'empty-catalog'
  | 'forbidden'
  | 'not-found';

export interface RouteResolutionMeta {
  status: RouteComponentStatus;
  elapsedMs: number;
  nearbyFqns: string[];
  lastPluginEvent: unknown;
  error: Error | null;
}

export interface RouteComponentWrapperProps {
  routeDef: Reactory.Routing.IReactoryRoute;
  componentArgs: Record<string, unknown>;
  defaultHeader?: React.ReactNode;
  defaultFooter?: React.ReactNode;
}

export interface RouteGuardProps {
  routeDef: Reactory.Routing.IReactoryRoute;
  authenticating: boolean;
  authValidated: boolean;
  children: React.ReactNode;
}

export interface MappedSlotConfig {
  show?: boolean;
  title?: string;
  componentFqn?: string;
  props?: { [key: string]: unknown };
  propsMap?: { [key: string]: unknown };
}
