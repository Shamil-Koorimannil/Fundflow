// Local Storage Database Adapter simulating Supabase queries locally
import { Category, Expense, FundsLog, RecurringExpense, AuditLog, Notification, Profile } from '../../types';

// Helper: Generate UUIDs
const uuid = () => Math.random().toString(36).substring(2, 9) + '-' + Math.random().toString(36).substring(2, 9);

// Mock Seed Users
const SEED_PROFILES: Profile[] = [
  { id: 'usr-admin', email: 'zywo.in@gmail.com', name: 'System Admin', role: 'Admin' },
  { id: 'usr-accountant', email: 'muhammedshamil251@gmail.com', name: 'Finance Accountant', role: 'Accountant' }
];

// Initial Categories Seed
const SEED_CATEGORIES = [
  { name: "Shooting", amount: 13140, desc: "Video production and shooting costs" },
  { name: "Rent", amount: 4500, desc: "Monthly office rent payment" },
  { name: "Wifi", amount: 850, desc: "Office internet subscription" },
  { name: "Current Bill", amount: 3000, desc: "Electricity utility bills" },
  { name: "Ad Budget", amount: 8000, desc: "Marketing and advertising budget" },
  { name: "Zoho", amount: 1060.82, desc: "Zoho Books and Suite subscription" },
  { name: "Water", amount: 160, desc: "Drinking water supplier delivery charges" },
  { name: "Cleaning", amount: 350, desc: "Office janitorial and cleaning supplies" },
  { name: "Client Meeting", amount: 3000, desc: "Business meals and client engagements" },
  { name: "Client reimbursement", amount: 0, desc: "Client ad spend and budget reimbursements", threshold: 0 },
  { name: "Directors meeting", amount: 2000, desc: "Board member assemblies and discussions" }
];

// Helper to retrieve/save local state
const getStorage = <T>(key: string, fallback: T): T => {
  const data = localStorage.getItem(`fund_manager_${key}`);
  return data ? JSON.parse(data) : fallback;
};

const setStorage = <T>(key: string, val: T): void => {
  localStorage.setItem(`fund_manager_${key}`, JSON.stringify(val));
};

// Database Initialization (Runs once)
export const initLocalDatabase = () => {
  if (!localStorage.getItem('fund_manager_initialized_v3')) {
    // Clear previous storage keys to ensure a clean migration/seeding
    localStorage.removeItem('fund_manager_initialized');
    localStorage.removeItem('fund_manager_initialized_v2');

    setStorage('profiles', SEED_PROFILES);

    // Build categories with id and dates
    const categoryList: Category[] = SEED_CATEGORIES.map(cat => ({
      id: uuid(),
      name: cat.name,
      description: cat.desc,
      allocated_amount: cat.amount,
      current_balance: cat.amount,
      spent_amount: 0,
      threshold: cat.threshold !== undefined ? cat.threshold : 20, // default 20% low balance trigger
      is_archived: false,
      created_by: 'zywo.in@gmail.com',
      created_at: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString()
    }));

    setStorage('categories', categoryList);

    // Seed 12 exact demo records matching the screenshot
    const seededExpenses = [
      {
        title: 'Mandi manzil shoot',
        amount: 1950,
        category: 'Shooting',
        date: '2026-06-05',
        notes: 'TA advance, total was 3500 abd remaining ...'
      },
      {
        title: 'Rent',
        amount: 4500,
        category: 'Rent',
        date: '2026-06-05',
        notes: 'Rent amount paid'
      },
      {
        title: 'Electricity bill',
        amount: 3616,
        category: 'Current Bill',
        date: '2026-06-05',
        notes: 'Exceeded, 616 rs added more than expected'
      },
      {
        title: 'Zywo labs',
        amount: 1000,
        category: 'Ad Budget',
        date: '2026-06-05',
        notes: 'Zywo labs ad, 250 for 4 days'
      },
      {
        title: 'Dlino ad',
        amount: 500,
        category: 'Client reimbursement',
        date: '2026-06-03',
        notes: 'Ad ran for staff'
      },
      {
        title: 'Looi shoot',
        amount: 179,
        category: 'Shooting',
        date: '2026-06-02',
        notes: 'Model refreshments market city'
      },
      {
        title: 'Looi shoot',
        amount: 1254.75,
        category: 'Shooting',
        date: '2026-06-02',
        notes: 'Tea time expebse'
      },
      {
        title: 'Water',
        amount: 160,
        category: 'Water',
        date: '2026-06-02',
        notes: '—'
      },
      {
        title: 'Directors meeting',
        amount: 1037,
        category: 'Directors meeting',
        date: '2026-06-01',
        notes: 'Sandos me, anfas, rayan, anshad'
      },
      {
        title: 'Mandi manzil shoot',
        amount: 837,
        category: 'Shooting',
        date: '2026-06-01',
        notes: 'Full amount advance for shoot was 1400, 5...'
      },
      {
        title: 'Dlino',
        amount: 600,
        category: 'Shooting',
        date: '2026-06-01',
        notes: 'Rentals'
      },
      {
        title: 'Dlino',
        amount: 230,
        category: 'Shooting',
        date: '2026-06-01',
        notes: 'Travel'
      }
    ];

    const wifiCat = categoryList.find(c => c.name === 'Wifi');
    const zohoCat = categoryList.find(c => c.name === 'Zoho');

    const expensesList: Expense[] = seededExpenses.map(item => {
      const cat = categoryList.find(c => c.name === item.category);
      return {
        id: uuid(),
        title: item.title,
        amount: item.amount,
        category_id: cat ? cat.id : '',
        date: item.date,
        notes: item.notes,
        created_by: 'zywo.in@gmail.com'
      };
    });

    const fundsLogList: FundsLog[] = [];
    const auditLogsList: AuditLog[] = [];
    const notificationsList: Notification[] = [];

    // Set recurring expenses
    const recurringList: RecurringExpense[] = [];
    if (wifiCat) {
      recurringList.push({
        id: uuid(),
        title: 'Monthly Wifi Bill',
        amount: 850,
        category_id: wifiCat.id,
        frequency: 'Monthly',
        notes: 'Broadband connection renewal',
        is_paused: false,
        next_due_date: new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString().split('T')[0],
        created_by: 'zywo.in@gmail.com'
      });
    }
    if (zohoCat) {
      recurringList.push({
        id: uuid(),
        title: 'Zoho Books Suite',
        amount: 1060.82,
        category_id: zohoCat.id,
        frequency: 'Monthly',
        notes: 'SaaS Invoice tool',
        is_paused: false,
        next_due_date: new Date(new Date().setDate(new Date().getDate() + 5)).toISOString().split('T')[0],
        created_by: 'zywo.in@gmail.com'
      });
    }

    // Recalculate all categories correctly to be bulletproof
    categoryList.forEach(c => {
      const catExpenses = expensesList.filter(e => e.category_id === c.id);
      const catFundsAdded = fundsLogList.filter(f => f.category_id === c.id && f.amount > 0);
      const catFundsRemoved = fundsLogList.filter(f => f.category_id === c.id && f.amount < 0);

      const totalAdded = catFundsAdded.reduce((sum, item) => sum + Number(item.amount), 0);
      const totalRemoved = Math.abs(catFundsRemoved.reduce((sum, item) => sum + Number(item.amount), 0));
      const totalSpent = catExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

      // Current balance = base allocated + added - removed - spent
      c.spent_amount = totalSpent;
      c.current_balance = c.allocated_amount + totalAdded - totalRemoved - totalSpent;
    });

    // Populate seed audit logs
    auditLogsList.push({
      id: uuid(),
      action: 'System Seeded',
      user_email: 'zywo.in@gmail.com',
      timestamp: new Date().toISOString(),
      prev_value: null,
      new_value: { categories: categoryList.length, expenses: expensesList.length },
      notes: 'Initial fund manager database seeded successfully'
    });

    // Seed negative balance notifications for any categories over budget
    categoryList.forEach(c => {
      if (c.current_balance < 0) {
        notificationsList.push({
          id: uuid(),
          type: 'negative_balance',
          message: `Category "${c.name}" is over budget by ₹${Math.abs(c.current_balance)}!`,
          read: false,
          category_id: c.id,
          created_at: new Date().toISOString()
        });
      }
    });

    setStorage('categories', categoryList);
    setStorage('expenses', expensesList);
    setStorage('funds_log', fundsLogList);
    setStorage('recurring_expenses', recurringList);
    setStorage('audit_logs', auditLogsList);
    setStorage('notifications', notificationsList);
    localStorage.setItem('fund_manager_initialized_v3', 'true');
  }
};

// Initial database call
initLocalDatabase();

// Local DB Operations implementation
export const localAdapter = {
  // Profiles/Users
  getProfiles: async (): Promise<Profile[]> => {
    return getStorage<Profile[]>('profiles', []);
  },
  createProfile: async (email: string, name: string, role: 'Admin' | 'Accountant', actorEmail: string): Promise<Profile> => {
    const profiles = getStorage<Profile[]>('profiles', []);
    if (profiles.some(p => p.email.toLowerCase() === email.toLowerCase())) {
      throw new Error('User email already exists!');
    }
    const newProfile: Profile = { id: uuid(), email, name, role, created_at: new Date().toISOString() };
    profiles.push(newProfile);
    setStorage('profiles', profiles);
    
    await localAdapter.createAuditLog({
      action: 'User Created',
      user_email: actorEmail,
      prev_value: null,
      new_value: newProfile,
      notes: `User ${name} (${email}) created as ${role}`
    });
    return newProfile;
  },
  updateProfile: async (id: string, updates: Partial<Profile>, actorEmail: string): Promise<Profile> => {
    const profiles = getStorage<Profile[]>('profiles', []);
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('User not found');
    
    const prev = { ...profiles[idx] };
    profiles[idx] = { ...profiles[idx], ...updates };
    setStorage('profiles', profiles);

    await localAdapter.createAuditLog({
      action: 'User Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: profiles[idx],
      notes: `User role/name updated for ${profiles[idx].email}`
    });
    return profiles[idx];
  },
  deleteProfile: async (id: string, actorEmail: string): Promise<boolean> => {
    const profiles = getStorage<Profile[]>('profiles', []);
    const idx = profiles.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('User not found');
    const removed = profiles[idx];
    if (removed.email.toLowerCase() === actorEmail.toLowerCase()) {
      throw new Error('You cannot delete your own account!');
    }
    profiles.splice(idx, 1);
    setStorage('profiles', profiles);

    await localAdapter.createAuditLog({
      action: 'User Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Removed user ${removed.name} (${removed.email})`
    });
    return true;
  },

  // Categories
  getCategories: async (includeArchived = false): Promise<Category[]> => {
    const categories = getStorage<Category[]>('categories', []);
    return includeArchived ? categories : categories.filter(c => !c.is_archived);
  },
  createCategory: async (category: Omit<Category, 'id' | 'created_at' | 'current_balance' | 'spent_amount' | 'is_archived' | 'created_by'>, actorEmail: string): Promise<Category> => {
    const categories = getStorage<Category[]>('categories', []);
    if (categories.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
      throw new Error('Category name already exists!');
    }
    const newCat: Category = {
      ...category,
      id: uuid(),
      current_balance: category.allocated_amount,
      spent_amount: 0,
      is_archived: false,
      created_at: new Date().toISOString(),
      created_by: actorEmail
    };
    categories.push(newCat);
    setStorage('categories', categories);

    await localAdapter.createAuditLog({
      action: 'Category Created',
      user_email: actorEmail,
      prev_value: null,
      new_value: newCat,
      notes: `Created category "${newCat.name}" with budget ₹${newCat.allocated_amount}`
    });
    return newCat;
  },
  updateCategory: async (id: string, updates: Partial<Category>, actorEmail: string): Promise<Category> => {
    const categories = getStorage<Category[]>('categories', []);
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Category not found');

    const prev = { ...categories[idx] };
    
    // Merge updates
    const updated = { ...categories[idx], ...updates };
    
    // If allocated amount changes, recalculate balance
    if (updates.allocated_amount !== undefined) {
      const diff = updates.allocated_amount - prev.allocated_amount;
      updated.current_balance += diff;
    }
    
    categories[idx] = updated;
    setStorage('categories', categories);

    // Recalculate status triggers
    await localAdapter.recalculateCategoryStats(id);
    
    // Re-fetch category after recalculation
    const refreshed = (getStorage<Category[]>('categories', [])).find(c => c.id === id)!;

    await localAdapter.createAuditLog({
      action: 'Category Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: refreshed,
      notes: `Updated category properties for "${refreshed.name}"`
    });

    return refreshed;
  },
  deleteCategory: async (id: string, transferCategoryId: string | undefined, actorEmail: string): Promise<boolean> => {
    const categories = getStorage<Category[]>('categories', []);
    const idx = categories.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('Category not found');
    const removedCat = categories[idx];

    const expenses = getStorage<Expense[]>('expenses', []);
    const relatedExpenses = expenses.filter(e => e.category_id === id);

    if (relatedExpenses.length > 0) {
      if (!transferCategoryId) {
        throw new Error('Please select another category to transfer the existing expenses to.');
      }
      const targetCat = categories.find(c => c.id === transferCategoryId);
      if (!targetCat) throw new Error('Target category for transfer not found!');

      // Perform transfer of category_id
      relatedExpenses.forEach(e => {
        e.category_id = transferCategoryId;
        e.notes = `[Transferred from ${removedCat.name}] ` + (e.notes || '');
      });
      setStorage('expenses', expenses);

      // Audit transfer log
      await localAdapter.createAuditLog({
        action: 'Expenses Rerouted',
        user_email: actorEmail,
        prev_value: { category: removedCat.name, count: relatedExpenses.length },
        new_value: { category: targetCat.name },
        notes: `Transferred ${relatedExpenses.length} expenses from deleted category "${removedCat.name}" to "${targetCat.name}"`
      });
    }

    // Delete funds log and recurring items matching this category
    const fundsLog = getStorage<FundsLog[]>('funds_log', []);
    setStorage('funds_log', fundsLog.filter(f => f.category_id !== id));
    
    const recurring = getStorage<RecurringExpense[]>('recurring_expenses', []);
    setStorage('recurring_expenses', recurring.filter(r => r.category_id !== id));

    // Remove category
    categories.splice(idx, 1);
    setStorage('categories', categories);

    // Audit logs
    await localAdapter.createAuditLog({
      action: 'Category Deleted',
      user_email: actorEmail,
      prev_value: removedCat,
      new_value: null,
      notes: `Deleted category "${removedCat.name}". Balance was ₹${removedCat.current_balance}`
    });

    // If we transferred expenses, recalculate target category stats
    if (transferCategoryId) {
      await localAdapter.recalculateCategoryStats(transferCategoryId);
    }

    return true;
  },
  archiveCategory: async (id: string, isArchived: boolean, actorEmail: string): Promise<Category> => {
    return localAdapter.updateCategory(id, { is_archived: isArchived }, actorEmail);
  },

  // Recalculations and Triggers
  recalculateCategoryStats: async (categoryId: string): Promise<void> => {
    const categories = getStorage<Category[]>('categories', []);
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const expenses = getStorage<Expense[]>('expenses', []);
    const fundsLog = getStorage<FundsLog[]>('funds_log', []);

    // Fetch related logs
    const catExpenses = expenses.filter(e => e.category_id === categoryId);
    const catFunds = fundsLog.filter(f => f.category_id === categoryId);

    const totalSpent = catExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalAdded = catFunds.filter(f => f.amount > 0).reduce((sum, f) => sum + Number(f.amount), 0);
    const totalDeducted = Math.abs(catFunds.filter(f => f.amount < 0).reduce((sum, f) => sum + Number(f.amount), 0));

    const originalAllocated = cat.allocated_amount;
    
    cat.spent_amount = totalSpent;
    // Current Balance = Allocated + Added - Deducted - Spent
    cat.current_balance = originalAllocated + totalAdded - totalDeducted - totalSpent;

    setStorage('categories', categories);

    // Notification Triggers
    const notifications = getStorage<Notification[]>('notifications', []);
    
    // 1. Negative Balance alert
    if (cat.current_balance < 0) {
      const alreadyNotified = notifications.some(
        n => n.category_id === categoryId && n.type === 'negative_balance' && !n.read
      );
      if (!alreadyNotified) {
        notifications.unshift({
          id: uuid(),
          type: 'negative_balance',
          message: `CRITICAL ALERT: Category "${cat.name}" has reached a negative balance of ₹${cat.current_balance.toFixed(2)}!`,
          read: false,
          category_id: categoryId,
          created_at: new Date().toISOString()
        });
      }
    }

    // 2. Low balance alert (below threshold percent of allocated)
    // Avoid double alerting if negative (negative is higher critical level)
    if (cat.current_balance >= 0 && cat.allocated_amount > 0) {
      const remainingPercent = (cat.current_balance / cat.allocated_amount) * 100;
      if (remainingPercent < cat.threshold) {
        const alreadyNotified = notifications.some(
          n => n.category_id === categoryId && n.type === 'low_balance' && !n.read
        );
        if (!alreadyNotified) {
          notifications.unshift({
            id: uuid(),
            type: 'low_balance',
            message: `Warning: Category "${cat.name}" balance is low! Remaining balance is ₹${cat.current_balance.toFixed(2)} (${remainingPercent.toFixed(1)}% remaining).`,
            read: false,
            category_id: categoryId,
            created_at: new Date().toISOString()
          });
        }
      }
    }

    setStorage('notifications', notifications);
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    return getStorage<Expense[]>('expenses', []).sort((a, b) => b.date.localeCompare(a.date));
  },
  createExpense: async (expenseData: Omit<Expense, 'id'>, actorEmail: string): Promise<Expense> => {
    const expenses = getStorage<Expense[]>('expenses', []);
    const newExpense: Expense = {
      ...expenseData,
      id: uuid()
    };
    expenses.unshift(newExpense);
    setStorage('expenses', expenses);

    // Recalculate
    await localAdapter.recalculateCategoryStats(newExpense.category_id);

    // Check if large expense (> 50% of the allocated category budget)
    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === newExpense.category_id);
    if (category && newExpense.amount > category.allocated_amount * 0.5) {
      const notifications = getStorage<Notification[]>('notifications', []);
      notifications.unshift({
        id: uuid(),
        type: 'large_expense',
        message: `High Expense: A large expense of ₹${newExpense.amount} was recorded on "${category.name}" category by ${actorEmail}.`,
        read: false,
        category_id: category.id,
        created_at: new Date().toISOString()
      });
      setStorage('notifications', notifications);
    }

    // Add Audit Log
    await localAdapter.createAuditLog({
      action: 'Expense Added',
      user_email: actorEmail,
      prev_value: null,
      new_value: newExpense,
      notes: `Recorded expense "${newExpense.title}" in category "${category ? category.name : 'Unknown'}" for ₹${newExpense.amount}`
    });

    return newExpense;
  },
  updateExpense: async (id: string, updates: Partial<Expense>, actorEmail: string): Promise<Expense> => {
    const expenses = getStorage<Expense[]>('expenses', []);
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Expense not found');

    const prev = { ...expenses[idx] };
    const merged = { 
      ...expenses[idx], 
      ...updates, 
      last_modified_by: actorEmail, 
      last_modified_date: new Date().toISOString() 
    };
    expenses[idx] = merged;
    setStorage('expenses', expenses);

    // Recalculate original category
    await localAdapter.recalculateCategoryStats(prev.category_id);
    
    // Recalculate new category if changed
    if (updates.category_id && updates.category_id !== prev.category_id) {
      await localAdapter.recalculateCategoryStats(updates.category_id);
    }

    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === merged.category_id);

    // Add Audit Log
    await localAdapter.createAuditLog({
      action: 'Expense Edited',
      user_email: actorEmail,
      prev_value: prev,
      new_value: merged,
      notes: `Edited expense "${merged.title}" in category "${category ? category.name : 'Unknown'}"`
    });

    return merged;
  },
  deleteExpense: async (id: string, actorEmail: string): Promise<boolean> => {
    const expenses = getStorage<Expense[]>('expenses', []);
    const idx = expenses.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Expense not found');
    const removed = expenses[idx];

    expenses.splice(idx, 1);
    setStorage('expenses', expenses);

    // Recalculate
    await localAdapter.recalculateCategoryStats(removed.category_id);

    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === removed.category_id);

    // Audit log
    await localAdapter.createAuditLog({
      action: 'Expense Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Deleted expense "${removed.title}" from category "${category ? category.name : 'Unknown'}". Restored ₹${removed.amount}`
    });

    return true;
  },

  // Funds Management
  addFunds: async (categoryId: string, amount: number, addedBy: string, reason: string): Promise<FundsLog> => {
    const fundsLog = getStorage<FundsLog[]>('funds_log', []);
    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === categoryId);
    if (!category) throw new Error('Category not found');

    const newLog: FundsLog = {
      id: uuid(),
      category_id: categoryId,
      amount: amount,
      added_by: addedBy,
      reason: reason,
      date: new Date().toISOString().split('T')[0]
    };

    fundsLog.push(newLog);
    setStorage('funds_log', fundsLog);

    // Recalculate
    await localAdapter.recalculateCategoryStats(categoryId);

    // Create low/high notification
    const notifications = getStorage<Notification[]>('notifications', []);
    notifications.unshift({
      id: uuid(),
      type: 'new_funds',
      message: `Fund Injection: ₹${amount.toFixed(2)} added to "${category.name}" by ${addedBy} for: "${reason}".`,
      read: false,
      category_id: categoryId,
      created_at: new Date().toISOString()
    });
    setStorage('notifications', notifications);

    // Audit log
    await localAdapter.createAuditLog({
      action: 'Funds Added',
      user_email: addedBy,
      prev_value: null,
      new_value: newLog,
      notes: `Injected ₹${amount} into "${category.name}". Reason: ${reason}`
    });

    return newLog;
  },
  deductFunds: async (categoryId: string, amount: number, deductedBy: string, reason: string): Promise<FundsLog> => {
    const fundsLog = getStorage<FundsLog[]>('funds_log', []);
    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === categoryId);
    if (!category) throw new Error('Category not found');

    const newLog: FundsLog = {
      id: uuid(),
      category_id: categoryId,
      amount: -Math.abs(amount), // force negative in database represent deduction
      added_by: deductedBy,
      reason: reason,
      date: new Date().toISOString().split('T')[0]
    };

    fundsLog.push(newLog);
    setStorage('funds_log', fundsLog);

    // Recalculate
    await localAdapter.recalculateCategoryStats(categoryId);

    // Audit log
    await localAdapter.createAuditLog({
      action: 'Funds Removed',
      user_email: deductedBy,
      prev_value: null,
      new_value: newLog,
      notes: `Deducted ₹${amount} from "${category.name}". Reason: ${reason}`
    });

    return newLog;
  },
  transferFunds: async (fromCategoryId: string, toCategoryId: string, amount: number, actorEmail: string, reason: string): Promise<boolean> => {
    const categories = getStorage<Category[]>('categories', []);
    const fromCat = categories.find(c => c.id === fromCategoryId);
    const toCat = categories.find(c => c.id === toCategoryId);

    if (!fromCat || !toCat) throw new Error('Source or destination category not found!');

    const fundsLog = getStorage<FundsLog[]>('funds_log', []);
    const dateStr = new Date().toISOString().split('T')[0];

    // Create negative log on source category
    const fromLog: FundsLog = {
      id: uuid(),
      category_id: fromCategoryId,
      amount: -amount,
      added_by: actorEmail,
      reason: `Transfer to "${toCat.name}". Reason: ${reason}`,
      date: dateStr
    };

    // Create positive log on destination category
    const toLog: FundsLog = {
      id: uuid(),
      category_id: toCategoryId,
      amount: amount,
      added_by: actorEmail,
      reason: `Transfer from "${fromCat.name}". Reason: ${reason}`,
      date: dateStr
    };

    fundsLog.push(fromLog, toLog);
    setStorage('funds_log', fundsLog);

    // Recalculate both
    await localAdapter.recalculateCategoryStats(fromCategoryId);
    await localAdapter.recalculateCategoryStats(toCategoryId);

    // Create audit
    await localAdapter.createAuditLog({
      action: 'Funds Transferred',
      user_email: actorEmail,
      prev_value: { from: fromCat.name, balance: fromCat.current_balance },
      new_value: { to: toCat.name, balance: toCat.current_balance },
      notes: `Transferred ₹${amount} from "${fromCat.name}" to "${toCat.name}". Reason: ${reason}`
    });

    return true;
  },
  getFundsLog: async (): Promise<FundsLog[]> => {
    return getStorage<FundsLog[]>('funds_log', []).sort((a, b) => b.date.localeCompare(a.date));
  },

  // Recurring Expenses
  getRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    return getStorage<RecurringExpense[]>('recurring_expenses', []);
  },
  createRecurringExpense: async (recData: Omit<RecurringExpense, 'id' | 'is_paused'>, actorEmail: string): Promise<RecurringExpense> => {
    const recurring = getStorage<RecurringExpense[]>('recurring_expenses', []);
    const newRec: RecurringExpense = {
      ...recData,
      id: uuid(),
      is_paused: false,
      created_at: new Date().toISOString()
    };
    recurring.push(newRec);
    setStorage('recurring_expenses', recurring);

    const categories = getStorage<Category[]>('categories', []);
    const category = categories.find(c => c.id === newRec.category_id);

    // Audit log
    await localAdapter.createAuditLog({
      action: 'Recurring Expense Set',
      user_email: actorEmail,
      prev_value: null,
      new_value: newRec,
      notes: `Set up recurring expense "${newRec.title}" of ₹${newRec.amount} under "${category ? category.name : 'Unknown'}" (frequency: ${newRec.frequency})`
    });

    return newRec;
  },
  updateRecurringExpense: async (id: string, updates: Partial<RecurringExpense>, actorEmail: string): Promise<RecurringExpense> => {
    const recurring = getStorage<RecurringExpense[]>('recurring_expenses', []);
    const idx = recurring.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Recurring expense template not found');

    const prev = { ...recurring[idx] };
    recurring[idx] = { ...recurring[idx], ...updates };
    setStorage('recurring_expenses', recurring);

    await localAdapter.createAuditLog({
      action: 'Recurring Expense Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: recurring[idx],
      notes: `Modified recurring parameters for scheduled expense "${recurring[idx].title}"`
    });

    return recurring[idx];
  },
  deleteRecurringExpense: async (id: string, actorEmail: string): Promise<boolean> => {
    const recurring = getStorage<RecurringExpense[]>('recurring_expenses', []);
    const idx = recurring.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Recurring expense not found');
    const removed = recurring[idx];

    recurring.splice(idx, 1);
    setStorage('recurring_expenses', recurring);

    await localAdapter.createAuditLog({
      action: 'Recurring Expense Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Removed recurring expense scheduler "${removed.title}"`
    });

    return true;
  },
  processRecurringExpenses: async (actorEmail: string): Promise<number> => {
    const recurring = getStorage<RecurringExpense[]>('recurring_expenses', []);
    const todayStr = new Date().toISOString().split('T')[0];
    let createdCount = 0;

    for (let i = 0; i < recurring.length; i++) {
      const rec = recurring[i];
      if (rec.is_paused) continue;

      // Check if due (next_due_date <= today)
      if (rec.next_due_date <= todayStr) {
        // Trigger auto-creation of expense
        await localAdapter.createExpense({
          title: `[Recurring] ${rec.title}`,
          amount: rec.amount,
          category_id: rec.category_id,
          date: rec.next_due_date,
          notes: `Auto-generated recurring expense. Frequency: ${rec.frequency}. original notes: ${rec.notes || ''}`,
          created_by: 'System'
        }, 'System');

        // Trigger notification
        const notifications = getStorage<Notification[]>('notifications', []);
        notifications.unshift({
          id: uuid(),
          type: 'recurring_generated',
          message: `Auto Billing: Recurring expense "[Recurring] ${rec.title}" of ₹${rec.amount} was auto-generated.`,
          read: false,
          category_id: rec.category_id,
          created_at: new Date().toISOString()
        });
        setStorage('notifications', notifications);

        // Update next_due_date based on frequency
        const currentDue = new Date(rec.next_due_date);
        if (rec.frequency === 'Daily') currentDue.setDate(currentDue.getDate() + 1);
        else if (rec.frequency === 'Weekly') currentDue.setDate(currentDue.getDate() + 7);
        else if (rec.frequency === 'Monthly') currentDue.setMonth(currentDue.getMonth() + 1);
        else if (rec.frequency === 'Quarterly') currentDue.setMonth(currentDue.getMonth() + 3);
        else if (rec.frequency === 'Yearly') currentDue.setFullYear(currentDue.getFullYear() + 1);

        rec.next_due_date = currentDue.toISOString().split('T')[0];
        createdCount++;
      }
    }

    if (createdCount > 0) {
      setStorage('recurring_expenses', recurring);
      await localAdapter.createAuditLog({
        action: 'Recurring Expenses Processed',
        user_email: actorEmail,
        prev_value: null,
        new_value: { generated: createdCount },
        notes: `Processed scheduled recurring expenses. Auto-generated ${createdCount} entries.`
      });
    }

    return createdCount;
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    return getStorage<AuditLog[]>('audit_logs', []).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  },
  createAuditLog: async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
    const logs = getStorage<AuditLog[]>('audit_logs', []);
    const newLog: AuditLog = {
      ...logData,
      id: uuid(),
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    setStorage('audit_logs', logs);
    return newLog;
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    return getStorage<Notification[]>('notifications', []);
  },
  markNotificationAsRead: async (id: string): Promise<void> => {
    const notifications = getStorage<Notification[]>('notifications', []);
    const idx = notifications.findIndex(n => n.id === id);
    if (idx !== -1) {
      notifications[idx].read = true;
      setStorage('notifications', notifications);
    }
  },
  clearAllNotifications: async (): Promise<void> => {
    setStorage('notifications', []);
  }
};
