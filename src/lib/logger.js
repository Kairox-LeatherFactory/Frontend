import { log as baseLog } from '@logtail/next';

// Shared Better Stack logger. Every entry carries `env` so local, staging
// and production logs can be filtered apart in Better Stack.
// Never pass tokens, passwords or full user records as fields.
export const log = baseLog.with({ env: process.env.NEXT_PUBLIC_APP_ENV || 'local' });
