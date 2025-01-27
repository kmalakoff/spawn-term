import React, { useContext } from 'react';
import { useStore } from 'zustand';
import StoreContext from '../contexts/Store';
import { Box } from '../ink.mjs';
import type { AppState, ChildProcess as ChildProcessT } from '../types';
import ChildProcess from './ChildProcess';

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
