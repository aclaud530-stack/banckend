import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { config } from '@config/index.js';

const isProduction = config.server.nodeEnv === 'production';
const logsDir = path.dirname(config.logging.file);

// Garantir que a pasta de logs existe (apenas em dev)
if (!isProduction && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const errorStr = stack ? `\n${stack}` : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}${errorStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports: winston.transport[] = [];

// Console
transports.push(
  new winston.transports.Console({
    format: isProduction
      ? jsonFormat
      : winston.format.combine(
          winston.format.colorize(),
          customFormat
        ),
  })
);

// Arquivos (apenas dev)
if (!isProduction) {
  transports.push(
    new winston.transports.File({
      filename: config.logging.file,
      maxsize: 10485760,
      maxFiles: 5,
      format: customFormat,
    })
  );

  transports.push(
    new winston.transports.File({
      filename: path.join(path.dirname(config.logging.file), 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
      format: customFormat,
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: customFormat,
  transports,
  exceptionHandlers: [
    new winston.transports.Console({
      format: isProduction
        ? jsonFormat
        : winston.format.combine(
            winston.format.colorize(),
            customFormat
          ),
    }),
  ],
});

export default logger;
