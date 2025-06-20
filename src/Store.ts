import type { ChildProcess } from './types.ts';

export type RenderFunction = () => void;
export type StoreData = ChildProcess[];

export default class Store {
  processes: ChildProcess[];
  onRender: RenderFunction;

  constructor(onRender: RenderFunction) {
    if (!onRender) throw new Error('missing on render');
    this.processes = [];
    this.onRender = onRender;
  }

  data(): StoreData {
    return this.processes;
  }

  addProcess(process: ChildProcess): void {
    this.processes.push(process);
    this.onRender();
  }

  updateProcess(process: ChildProcess): void {
    this.processes = this.processes.map((x) => (x.id === process.id ? process : x));
    this.onRender();
  }
}
