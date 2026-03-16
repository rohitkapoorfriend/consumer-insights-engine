import { ThrottlerModuleOptions } from '@nestjs/throttler';

export const throttlerConfig: ThrottlerModuleOptions = {
  throttlers: [
    {
      name: 'short',
      ttl: 1000,
      limit: 10,
    },
    {
      name: 'medium',
      ttl: 60_000,
      limit: 200,
    },
    {
      name: 'long',
      ttl: 3_600_000,
      limit: 2_000,
    },
  ],
};