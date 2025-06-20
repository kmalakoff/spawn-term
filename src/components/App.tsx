import { Box } from 'ink';
import { useProcesses } from '../state/ProcessContext.js';
import type { ChildProcess as ChildProcessT } from '../types.js';
import ChildProcess from './ChildProcess.js';

export default function App() {
  const processes = useProcesses();

  return (
    <Box flexDirection="column">
      {processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} {...item} />
      ))}
    </Box>
  );
}
