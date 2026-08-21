export type NotificationType =
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'SALES_DROP'
  | 'PROFIT_DROP'
  | 'CREDIT_RISK'
  | 'EXPENSE_SPIKE'
  | 'HIGH_DEMAND'
  | 'NEW_FEEDBACK'
  | 'LOW_RATING'
  | 'LEAVE_REQUEST'
  | 'IMPORTANT_COMPLAINT'
  | 'NEW_MESSAGE'
  | 'ANNOUNCEMENT'
  | 'DAILY_DIGEST'
  | 'SYSTEM';

export type NotificationSeverityLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' | 'ALERT';

export type NotificationFilterOptions = {
  unreadOnly?: boolean;
  severity?: NotificationSeverityLevel | 'ALL';
  type?: NotificationType | 'ALL';
  limit?: number;
  page?: number;
};
