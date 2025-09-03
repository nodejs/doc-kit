import { createLogger, format } from 'winston';

export default createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.ms(),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
});
