import { useEffect, useState } from 'react';

import { ApiService } from './api-service';

import { Inversify } from '@/inversify';

const api = Inversify.get(ApiService);

export function useOnline() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    const onOnline = (isOnline: boolean) => setIsOnline(isOnline);
    const unsub = api.liveFeed.onOnline(onOnline);

    setIsOnline(api.liveFeed.isOnline);

    return () => unsub();
  }, []);

  return isOnline;
}
