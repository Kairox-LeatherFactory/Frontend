'use client';

import { Provider } from 'react-redux';
import { Global } from 'recharts';
import { store } from './store';

// Recharts gives every chart its own Redux store wired to Redux DevTools and
// dispatches raw mouse events into it. DevTools then serializes the event's
// React fiber up to the page, enumerating Next's params/searchParams promises
// and spamming "sync-dynamic-apis" console errors. Keep charts out of DevTools.
Global.devToolsEnabled = false;

export default function ReduxProvider({ children }) {
  return <Provider store={store}>{children}</Provider>;
}
