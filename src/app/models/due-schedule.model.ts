/**
 * Interface for Due Schedule Payment Data
 * Represents a single payment installment in a loan/investment schedule
 */
export interface DueSchedule {
  /** The installment number (1-24) */
  due_no: number;

  /** The due date for this payment in format "DD MMM YYYY" */
  due_date: string;

  /** The principal amount due for this installment */
  due_amount: number;

  /** The interest amount due for this installment */
  due_interest: number;

  /** The total cumulative amount (principal + interest) */
  total: number;
}

/**
 * Type for an array of due schedules
 */
export type DueScheduleList = DueSchedule[];

