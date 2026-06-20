// Unified DB Router switching between Local Storage and live Supabase
import { localAdapter } from './adapters/localAdapter';
import { supabaseAdapter, isSupabaseConfigured } from './adapters/supabaseAdapter';
import { Category, Expense, FundsLog, RecurringExpense, AuditLog, Notification, Profile } from '../types';

// Sandbox override in localStorage
const SANDBOX_KEY = 'fund_manager_sandbox_mode';

export const getDbMode = (): 'Local Sandbox' | 'Supabase DB' => {
  const manual = localStorage.getItem(SANDBOX_KEY);
  if (manual === 'true') return 'Local Sandbox';
  if (manual === 'false' && isSupabaseConfigured()) return 'Supabase DB';
  
  // Default fallback
  return isSupabaseConfigured() ? 'Supabase DB' : 'Local Sandbox';
};

export const setDbMode = (mode: 'Local Sandbox' | 'Supabase DB') => {
  if (mode === 'Local Sandbox') {
    localStorage.setItem(SANDBOX_KEY, 'true');
  } else {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured! Please provide VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY in your env.');
    }
    localStorage.setItem(SANDBOX_KEY, 'false');
  }
  // Refresh page to re-initialize router context
  window.location.reload();
};

// Select active adapter
const getAdapter = () => {
  const mode = getDbMode();
  return mode === 'Supabase DB' ? supabaseAdapter : localAdapter;
};

// Expose unified routing client
export const db = {
  // Profiles
  getProfiles: () => getAdapter().getProfiles(),
  createProfile: (email: string, name: string, role: 'Admin' | 'Accountant', actorEmail: string) => 
    getAdapter().createProfile(email, name, role, actorEmail),
  updateProfile: (id: string, updates: Partial<Profile>, actorEmail: string) => 
    getAdapter().updateProfile(id, updates, actorEmail),
  deleteProfile: (id: string, actorEmail: string) => 
    getAdapter().deleteProfile(id, actorEmail),

  // Categories
  getCategories: (includeArchived?: boolean) => getAdapter().getCategories(includeArchived),
  createCategory: (category: Omit<Category, 'id' | 'created_at' | 'current_balance' | 'spent_amount' | 'is_archived' | 'created_by'>, actorEmail: string) => 
    getAdapter().createCategory(category, actorEmail),
  updateCategory: (id: string, updates: Partial<Category>, actorEmail: string) => 
    getAdapter().updateCategory(id, updates, actorEmail),
  deleteCategory: (id: string, transferCategoryId: string | undefined, actorEmail: string) => 
    getAdapter().deleteCategory(id, transferCategoryId, actorEmail),
  archiveCategory: (id: string, isArchived: boolean, actorEmail: string) => 
    getAdapter().archiveCategory(id, isArchived, actorEmail),
  recalculateCategoryStats: (categoryId: string) => 
    getAdapter().recalculateCategoryStats(categoryId),

  // Expenses
  getExpenses: () => getAdapter().getExpenses(),
  createExpense: (expense: Omit<Expense, 'id'>, actorEmail: string) => 
    getAdapter().createExpense(expense, actorEmail),
  updateExpense: (id: string, updates: Partial<Expense>, actorEmail: string) => 
    getAdapter().updateExpense(id, updates, actorEmail),
  deleteExpense: (id: string, actorEmail: string) => 
    getAdapter().deleteExpense(id, actorEmail),

  // Funds
  addFunds: (categoryId: string, amount: number, addedBy: string, reason: string) => 
    getAdapter().addFunds(categoryId, amount, addedBy, reason),
  deductFunds: (categoryId: string, amount: number, deductedBy: string, reason: string) => 
    getAdapter().deductFunds(categoryId, amount, deductedBy, reason),
  transferFunds: (fromCategoryId: string, toCategoryId: string, amount: number, actorEmail: string, reason: string) => 
    getAdapter().transferFunds(fromCategoryId, toCategoryId, amount, actorEmail, reason),
  getFundsLog: () => getAdapter().getFundsLog(),

  // Recurring
  getRecurringExpenses: () => getAdapter().getRecurringExpenses(),
  createRecurringExpense: (recurring: Omit<RecurringExpense, 'id' | 'is_paused'>, actorEmail: string) => 
    getAdapter().createRecurringExpense(recurring, actorEmail),
  updateRecurringExpense: (id: string, updates: Partial<RecurringExpense>, actorEmail: string) => 
    getAdapter().updateRecurringExpense(id, updates, actorEmail),
  deleteRecurringExpense: (id: string, actorEmail: string) => 
    getAdapter().deleteRecurringExpense(id, actorEmail),
  processRecurringExpenses: (actorEmail: string) => 
    getAdapter().processRecurringExpenses(actorEmail),

  // Audit Logs
  getAuditLogs: () => getAdapter().getAuditLogs(),
  createAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => 
    getAdapter().createAuditLog(log),

  // Notifications
  getNotifications: () => getAdapter().getNotifications(),
  markNotificationAsRead: (id: string) => getAdapter().markNotificationAsRead(id),
  clearAllNotifications: () => getAdapter().clearAllNotifications()
};
