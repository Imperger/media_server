import { useEffect, useState } from 'react';

import { ApiService } from './api-service';

import { Inversify } from '@/inversify';

const api = Inversify.get(ApiService);

export function useOnline() {
  const [isOnline, setIsOnline] = useState(api.liveFeed.isOnline);

  useEffect(
    () => api.liveFeed.onOnline((isOnline: boolean) => setIsOnline(isOnline)),
    []
  );

  return isOnline;
}
