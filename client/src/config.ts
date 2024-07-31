import { injectable } from 'inversify';

import { Inversify } from './inversify';

@injectable()
export class ConfigService {
  public readonly apiEntry = '/api';
}

Inversify.bind(ConfigService).toSelf().inSingletonScope();
