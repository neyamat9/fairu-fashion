import { SetMetadata } from '@nestjs/common';

export const ACTIVITY_META = 'activity:options';

export interface ActivityOptions {
  // Do not log this endpoint (noisy, no business meaning)
  skip?: boolean;
  action?: string;
  category?: string;
  summary?: string;
}

export const Activity = (options: ActivityOptions) =>
  SetMetadata(ACTIVITY_META, options);
