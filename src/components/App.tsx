import { Box } from 'ink';
import { Profiler, useContext } from 'react';
import { useStore } from 'zustand';
import StoreContext from '../contexts/Store.js';
import type { AppState, ChildProcess as ChildProcessT, Store } from '../types.js';
import ChildProcess from './ChildProcess.js';

export default function App() {
  const store = useContext<Store>(StoreContext);
  const appState = useStore(store) as AppState;

  return (
    <Profiler
      id="App"
      onRender={(_id, phase) => {
        if (phase === 'update') store?.onRender();
      }}
    >
      <Box flexDirection="column">
        {appState.processes.map((item: ChildProcessT) => (
          <ChildProcess key={item.id} item={item} />
        ))}
      </Box>
    </Profiler>
  );
}
