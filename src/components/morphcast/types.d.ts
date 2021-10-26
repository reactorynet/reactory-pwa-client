export interface IMorphCast {
  start: () => void,
  stop: () => void,
  getModule: (t: string) => any,
  termination: () => void,
  stopped: any;
  on: (eventName: string, evt: any) => void,
  [key: string]: any
}


