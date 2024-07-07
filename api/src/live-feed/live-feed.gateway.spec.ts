import { Test, TestingModule } from '@nestjs/testing';

import { LiveFeedGateway } from './live-feed.gateway';

describe('LiveFeedGateway', () => {
  let gateway: LiveFeedGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveFeedGateway]
    }).compile();

    gateway = module.get<LiveFeedGateway>(LiveFeedGateway);
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
