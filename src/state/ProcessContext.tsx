import { createContext, useContext, useReducer } from 'react';

const ProcessContext = createContext(null);
const ProcessDispatchContext = createContext(null);

export function ProcessProvider({ children, store }) {
  const [Process, dispatch] = useReducer(ProcessReducer, []);

  store.on('added', (process) => dispatch({ type: 'added', process }));
  store.on('changed', (process) => dispatch({ type: 'changed', process }));

  return (
    <ProcessContext value={Process}>
      <ProcessDispatchContext value={dispatch}>{children}</ProcessDispatchContext>
    </ProcessContext>
  );
}

export function useProcesses() {
  return useContext(ProcessContext);
}

export function useProcessDispatch() {
  return useContext(ProcessDispatchContext);
}

function ProcessReducer(processes, action) {
  switch (action.type) {
    case 'added': {
      if (processes.find((x) => x.id === action.process.id)) {
        console.log(`${action.process.id} process added a second time`);
        return processes;
      }
      return [...processes, action.process];
    }
    case 'changed': {
      return processes.map((x) => (x.id === action.process.id ? action.process : x));
    }
    default: {
      throw Error(`Unknown action: ${action.type}`);
    }
  }
}
