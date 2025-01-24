import React from 'react';
// @ts-ignore
import * as ink from '../../../assets/ink.cjs';
import type { ChildProcess as ChildProcessT } from '../types';
import ChildProcess from './ChildProcess';

const { Box } = ink.default || ink;

export interface AppProps {
  list: ChildProcessT[];
}

export default function App({ list }: AppProps) {
  const running = list.filter((x) => ['running'].indexOf(x.state) >= 0);
  const done = list.filter((x) => ['error', 'success'].indexOf(x.state) >= 0);

  return (
    <>
      <Box flexDirection="column">
        {running.map((item: ChildProcessT) => (
          <ChildProcess key={item.id} {...item} />
        ))}
      </Box>
      <Box flexDirection="column" borderStyle="single" borderColor="black" borderBottom={true} borderTop={false} borderLeft={false} borderRight={false} />
      <Box flexDirection="column">
        {done.map((item: ChildProcessT) => (
          <ChildProcess key={item.id} {...item} />
        ))}
      </Box>
    </>
  );
}
