import type { ChildProcess, ChildProcessUpdate } from '../types.js';

export type RenderFunction = () => void;
export type StoreData = ChildProcess[];

export default class ProcessStore {
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

  add(process: ChildProcess): void {
    this.processes.push(process);
    this.onRender();
  }

  update(id: string, update: ChildProcessUpdate): void {
    const found = this.processes.find((x) => x.id === id);
    if (!found) {
      console.log(`Process ${id} not found`);
      return;
    }
    Object.assign(found, update);
    this.onRender();
  }
}
