import { LogLevel } from '@nestjs/common';

export const getLogLevels = (nodeEnv: string): LogLevel[] => {
  const isProduction = nodeEnv === 'production';

  if (isProduction) {
    return ['error', 'warn', 'log'];
  }

  return ['error', 'warn', 'log', 'debug', 'verbose'];
};

export const loggerConfig = {
  getLogLevels,
};
