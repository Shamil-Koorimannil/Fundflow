// Core Type Definitions for the Fund Management Web Application

export interface Profile {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Accountant';
  created_at?: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  allocated_amount: number;
  current_balance: number;
  spent_amount: number;
  threshold: number; // low balance percentage, e.g. 20 (meaning 20%)
  is_archived: boolean;
  created_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category_id: string;
  date: string; // YYYY-MM-DD
  notes: string;
  created_by: string;
  last_modified_by?: string;
  last_modified_date?: string;
}

export interface FundsLog {
  id: string;
  category_id: string;
  amount: number; // positive for added, negative for deducted
  added_by: string;
  reason: string;
  date: string;
}

export interface RecurringExpense {
  id: string;
  title: string;
  amount: number;
  category_id: string;
  frequency: 'Daily' | 'Weekly' | 'Monthly' | 'Quarterly' | 'Yearly';
  notes: string;
  is_paused: boolean;
  next_due_date: string; // YYYY-MM-DD
  created_by: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  user_email: string;
  timestamp: string; // ISO String
  prev_value: any; // Previous state JSON
  new_value: any;  // New state JSON
  notes: string;
}

export interface Notification {
  id: string;
  type: 'low_balance' | 'negative_balance' | 'recurring_generated' | 'new_funds' | 'large_expense';
  message: string;
  read: boolean;
  category_id?: string;
  created_at: string; // ISO String
}

export interface UserSession {
  user: {
    email: string;
    name: string;
    role: 'Admin' | 'Accountant';
  } | null;
  loading: boolean;
}
