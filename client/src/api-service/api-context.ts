import { createContext, useContext } from 'react';

import { ApiService } from './api-service';

export const ApiContext = createContext<ApiService | null>(null);

export const useApiService = () => useContext(ApiContext)!;
