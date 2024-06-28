import * as Crypto from 'crypto';

export function assetHash(filename: string): string {
  return Crypto.createHash('md5').update(filename).digest('hex');
}
