import { useEffect, useState } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

export function useResize(): WindowSize {
  const [size, setSize] = useState<WindowSize>({ width: 0, height: 0 });

  useEffect(() => {
    const getSize = () =>
      setSize({ width: window.innerWidth, height: window.innerHeight });

    getSize();

    window.addEventListener('resize', getSize);

    return () => window.removeEventListener('resize', getSize);
  }, []);

  return size;
}
