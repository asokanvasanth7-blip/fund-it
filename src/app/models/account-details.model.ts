/**
 * Interface for Payment Status
 * Represents the current status of a payment
 */
export type PaymentStatus = 'pending' | 'paid' | 'partial' | 'overdue';

/**
 * Interface for Payment Entry
 * Represents a single payment installment in the due schedule
 */
export interface PaymentEntry {
  /** The installment number (1-24) */
  due_no: number;

  /** The due date for this payment in format "DD MMM YYYY" */
  due_date: string;

  /** The principal amount due for this installment */
  due_amount: number;

  /** The loan interest amount for this installment */
  loan_interest: number;

  /** The total amount due (due_amount + loan_interest) */
  total: number;

  /** The amount already paid for this installment */
  paid_amount: number;

  /** The remaining balance amount to be paid */
  balance_amount: number;

  /** The current payment status */
  payment_status: PaymentStatus;
}

/**
 * Interface for Account Details
 * Represents a customer account with their fund and loan information
 */
export interface AccountDetails {
  /** The unique account identifier (e.g., "AZH-001") */
  account: string;

  /** The full name of the account holder */
  name: string;

  /** The total fund amount contributed by the account holder */
  fund_amount: number;

  /** The total loan amount taken by the account holder */
  loan_amount: number;

  /** Array of payment entries for the due schedule */
  due_payments: PaymentEntry[];
}

/**
 * Type for an array of account details
 */
export type AccountDetailsList = AccountDetails[];

/**
 * Interface for Account Summary Statistics
 * Useful for displaying aggregate information
 */
export interface AccountSummary {
  /** Total number of accounts */
  totalAccounts: number;

  /** Total fund amount across all accounts */
  totalFundAmount: number;

  /** Total loan amount across all accounts */
  totalLoanAmount: number;

  /** Total number of pending payments */
  totalPendingPayments: number;

  /** Total number of paid payments */
  totalPaidPayments: number;

  /** Total outstanding balance across all accounts */
  totalOutstandingBalance: number;
}

