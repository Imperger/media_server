import { useEffect, useState } from 'react';

import { useApiService } from './api-context';

export function useOnline() {
  const api = useApiService();
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const onOnline = (isOnline: boolean) => setIsOnline(isOnline);
    const unsub = api.liveFeed.onOnline(onOnline);

    setIsOnline(api.liveFeed.isOnline);

    return () => unsub();
  }, []);

  return isOnline;
}
