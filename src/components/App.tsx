import { Box } from 'ink';
import type Store from '../state/Store.ts';
import type { ChildProcess as ChildProcessT } from '../types.ts';
import ChildProcess from './ChildProcess.ts';

export interface AppProps {
  store: Store;
}

export default function App({ store }: AppProps): React.JSX.Element {
  return (
    <Box flexDirection="column">
      {store.processes.map((item: ChildProcessT) => (
        <ChildProcess key={item.id} item={item} />
      ))}
    </Box>
  );
}
