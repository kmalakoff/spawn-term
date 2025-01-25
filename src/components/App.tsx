import React, { useContext } from 'react';
import { useStore } from 'zustand';
import StoreContext from '../contexts/Store';
import { Box } from '../ink.mjs';
import type { AppState, ChildProcess as ChildProcessT } from '../types';
import ChildProcess from './ChildProcess';

export default function App() {
  const store = useContext(StoreContext);
  const appState = useStore(store) as AppState;
  const running = appState.processes.filter((x) => ['running'].indexOf(x.state) >= 0);
  const done = appState.processes.filter((x) => ['error', 'success'].indexOf(x.state) >= 0);

  return (
    <>
      <Box flexDirection="column">
        {running.map((item: ChildProcessT) => (
          <ChildProcess key={item.id} id={item.id} />
        ))}
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="black" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false} />
      <Box flexDirection="column">
        {done.map((item: ChildProcessT) => (
          <ChildProcess key={item.id} id={item.id} />
        ))}
      </Box>
    </>
  );
}
