declare module "@oisasoje/gloo" {
  export function gloo(): any;
  export function span<T>(name: string, fn: () => Promise<T> | T): Promise<T>;
  export function log(msg: any): void;
  export function error(err: any): void;
}
