import { EventEmitter } from 'events';
import type { ChildProcess, ChildProcessUpdate } from '../types.js';

export default class ProcessStore extends EventEmitter {
  processes: ChildProcess[] = [];

  add(process: ChildProcess): ChildProcess {
    this.processes.push(process);
    this.emit('added', process);
    return process;
  }

  update(id: string, update: ChildProcessUpdate): void {
    const found = this.processes.find((x) => x.id === id);
    if (!found) {
      console.log(`Process ${id} not found`);
      return;
    }
    Object.assign(found, update);
    this.emit('changed', found);
  }
}
