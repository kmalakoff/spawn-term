import React, { useState, useEffect } from 'react';
// @ts-ignore
import * as ink from '../../../assets/ink.cjs';

const { Text } = ink.default || ink;

export type SpinnerProps = {
  interval: number;
  frames: string[];
};

export default function Spinner({ interval, frames }: SpinnerProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((index) => (index === frames.length - 1 ? 0 : index + 1));
    }, interval);
    return () => {
      clearInterval(timer);
    };
  }, [interval, frames]);

  return <Text>{frames[index]}</Text>;
}
