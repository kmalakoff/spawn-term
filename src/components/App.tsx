import { useContext } from 'react';
import { useStore } from 'zustand';
import StoreContext from '../contexts/Store.js';
import { Box } from '../ink.js';
import type { AppState, ChildProcess as ChildProcessT } from '../types.js';
import ChildProcess from './ChildProcess.js';

export default function App() {
  const store = useContext(StoreContext);
  const appState = useStore(store) as AppState;

  return (
    <Box flexDirection="column">
      {appState.processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} item={item} />
      ))}
    </Box>
  );
}
