import { Box } from 'ink';
import { useContext } from 'react';
import { Context, type Store } from '../store/index.js';
import type { ChildProcess as ChildProcessT } from '../types.js';
import ChildProcess from './ChildProcess.js';

export default function App() {
  const store = useContext<Store>(Context);

  return (
    <Box flexDirection="column">
      {store.processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} item={item} />
      ))}
    </Box>
  );
}
