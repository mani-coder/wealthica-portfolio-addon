import ResizeObserver from 'rc-resize-observer';
import React, { useState } from 'react';

type Size = { width: number; height: number };
export default function AutoReSizer({ children }: { children: (size: Size) => React.ReactElement }) {
  const [size, setSize] = useState<Size>({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  return <ResizeObserver onResize={({ width, height }) => setSize({ width, height })}>{children(size)}</ResizeObserver>;
}
