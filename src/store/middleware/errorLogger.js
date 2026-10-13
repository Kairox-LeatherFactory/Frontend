import { isRejected } from '@reduxjs/toolkit';
import { log } from '@/lib/logger';

// Sends every rejected thunk / RTK Query request to Better Stack.
// Only the action type, error message and status are logged — never the
// request args, which can contain credentials.
export const errorLogger = () => (next) => (action) => {
  // `condition` rejections are thunks that chose not to run, not failures.
  if (isRejected(action) && !action.meta?.condition) {
    log.error('Redux action rejected', {
      type: action.type,
      endpoint: action.meta?.arg?.endpointName,
      status: action.payload?.status,
      message: action.error?.message,
    });
  }
  return next(action);
};
