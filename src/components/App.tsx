import { Box } from 'ink';
import type { ChildProcess as ChildProcessT } from '../types.js';
import ChildProcess from './ChildProcess.js';

export default function App({ store }) {
  return (
    <Box flexDirection="column">
      {store.processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} item={item} />
      ))}
    </Box>
  );
}
