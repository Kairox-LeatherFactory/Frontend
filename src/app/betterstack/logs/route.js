// Forwards browser logs to Better Stack; always answers 204 so ingest outages never surface as app errors.
export { POST } from '@logtail/next/proxy';
