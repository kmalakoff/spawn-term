import type { ChildProcess } from '../types.js';

export type RenderFunction = () => void;

export default class Store {
  processes: ChildProcess[];
  onRender: RenderFunction;

  constructor(onRender: RenderFunction) {
    if (!onRender) throw new Error('missing on render');
    this.processes = [];
    this.onRender = onRender;
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
