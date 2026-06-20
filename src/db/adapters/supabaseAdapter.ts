// Supabase Database Adapter implementing the same client API
import { createClient } from '@supabase/supabase-js';
import { Category, Expense, FundsLog, RecurringExpense, AuditLog, Notification, Profile } from '../../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = () => {
  return supabaseUrl.trim() !== '' && supabaseAnonKey.trim() !== '';
};

// Initialize client if details exist, otherwise dummy client
export const supabase = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const supabaseAdapter = {
  // Profiles
  getProfiles: async (): Promise<Profile[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createProfile: async (email: string, name: string, role: 'Admin' | 'Accountant', actorEmail: string): Promise<Profile> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    
    // Register profiles
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ email, name, role }])
      .select()
      .single();
    if (error) throw error;

    // Log audit trail
    await supabaseAdapter.createAuditLog({
      action: 'User Created',
      user_email: actorEmail,
      prev_value: null,
      new_value: data,
      notes: `User ${name} (${email}) created as ${role} (Supabase)`
    });

    return data;
  },
  updateProfile: async (id: string, updates: Partial<Profile>, actorEmail: string): Promise<Profile> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: prev } = await supabase.from('profiles').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'User Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: data,
      notes: `User profile modified in Supabase`
    });

    return data;
  },
  deleteProfile: async (id: string, actorEmail: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: removed } = await supabase.from('profiles').select('*').eq('id', id).single();
    
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'User Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Removed user ${removed?.name} (${removed?.email}) from Supabase`
    });
    return true;
  },

  // Categories
  getCategories: async (includeArchived = false): Promise<Category[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    let query = supabase.from('categories').select('*');
    if (!includeArchived) {
      query = query.eq('is_archived', false);
    }
    const { data, error } = await query.order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },
  createCategory: async (category: Omit<Category, 'id' | 'created_at' | 'current_balance' | 'spent_amount' | 'is_archived' | 'created_by'>, actorEmail: string): Promise<Category> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const newCat = {
      ...category,
      current_balance: category.allocated_amount,
      spent_amount: 0.00,
      is_archived: false,
      created_by: actorEmail
    };
    const { data, error } = await supabase
      .from('categories')
      .insert([newCat])
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'Category Created',
      user_email: actorEmail,
      prev_value: null,
      new_value: data,
      notes: `Category "${data.name}" created with budget ₹${data.allocated_amount} (Supabase)`
    });

    return data;
  },
  updateCategory: async (id: string, updates: Partial<Category>, actorEmail: string): Promise<Category> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: prev } = await supabase.from('categories').select('*').eq('id', id).single();

    // Recalculate balance if allocated_amount changes
    const toUpdate = { ...updates };
    if (updates.allocated_amount !== undefined && prev) {
      const diff = Number(updates.allocated_amount) - Number(prev.allocated_amount);
      toUpdate.current_balance = Number(prev.current_balance) + diff;
    }

    const { data, error } = await supabase
      .from('categories')
      .update(toUpdate)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // Recalculate stats inside Supabase (if database triggers exist. Otherwise client recalculates)
    await supabaseAdapter.recalculateCategoryStats(id);

    const { data: refreshed } = await supabase.from('categories').select('*').eq('id', id).single();

    await supabaseAdapter.createAuditLog({
      action: 'Category Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: refreshed,
      notes: `Updated category "${refreshed.name}" (Supabase)`
    });

    return refreshed;
  },
  deleteCategory: async (id: string, transferCategoryId: string | undefined, actorEmail: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: removedCat } = await supabase.from('categories').select('*').eq('id', id).single();
    if (!removedCat) throw new Error('Category not found');

    const { data: relatedExpenses } = await supabase.from('expenses').select('*').eq('category_id', id);

    if (relatedExpenses && relatedExpenses.length > 0) {
      if (!transferCategoryId) {
        throw new Error('Select a category to transfer expenses to!');
      }
      const { data: targetCat } = await supabase.from('categories').select('*').eq('id', transferCategoryId).single();
      if (!targetCat) throw new Error('Transfer target category not found!');

      // Reroute expenses
      const { error: transferError } = await supabase
        .from('expenses')
        .update({ 
          category_id: transferCategoryId, 
          notes: `[Transferred from ${removedCat.name}]` 
        })
        .eq('category_id', id);
      if (transferError) throw transferError;

      await supabaseAdapter.createAuditLog({
        action: 'Expenses Rerouted',
        user_email: actorEmail,
        prev_value: { category: removedCat.name, count: relatedExpenses.length },
        new_value: { category: targetCat.name },
        notes: `Transferred ${relatedExpenses.length} expenses to "${targetCat.name}" in Supabase`
      });
    }

    // Delete category
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'Category Deleted',
      user_email: actorEmail,
      prev_value: removedCat,
      new_value: null,
      notes: `Deleted category "${removedCat.name}" from Supabase`
    });

    if (transferCategoryId) {
      await supabaseAdapter.recalculateCategoryStats(transferCategoryId);
    }

    return true;
  },
  archiveCategory: async (id: string, isArchived: boolean, actorEmail: string): Promise<Category> => {
    return supabaseAdapter.updateCategory(id, { is_archived: isArchived }, actorEmail);
  },

  // Recalculations
  recalculateCategoryStats: async (categoryId: string): Promise<void> => {
    if (!supabase) return;
    
    // Fetch all related items
    const { data: expenses } = await supabase.from('expenses').select('amount').eq('category_id', categoryId);
    const { data: funds } = await supabase.from('funds_log').select('amount').eq('category_id', categoryId);
    const { data: category } = await supabase.from('categories').select('*').eq('id', categoryId).single();

    if (!category) return;

    const totalSpent = (expenses || []).reduce((sum, e) => sum + Number(e.amount), 0);
    const totalAdded = (funds || []).filter(f => f.amount > 0).reduce((sum, f) => sum + Number(f.amount), 0);
    const totalDeducted = Math.abs((funds || []).filter(f => f.amount < 0).reduce((sum, f) => sum + Number(f.amount), 0));

    const currentBalance = Number(category.allocated_amount) + totalAdded - totalDeducted - totalSpent;

    // Update
    await supabase.from('categories').update({
      spent_amount: totalSpent,
      current_balance: currentBalance
    }).eq('id', categoryId);

    // Create notifications if thresholds crossed
    if (currentBalance < 0) {
      // Check if unread notification exists
      const { data: exists } = await supabase
        .from('notifications')
        .select('*')
        .eq('category_id', categoryId)
        .eq('type', 'negative_balance')
        .eq('read', false);
      
      if (!exists || exists.length === 0) {
        await supabase.from('notifications').insert([{
          type: 'negative_balance',
          message: `CRITICAL ALERT: Category "${category.name}" has reached a negative balance of ₹${currentBalance.toFixed(2)}!`,
          read: false,
          category_id: categoryId
        }]);
      }
    } else if (Number(category.allocated_amount) > 0) {
      const remainingPercent = (currentBalance / Number(category.allocated_amount)) * 100;
      if (remainingPercent < Number(category.threshold)) {
        const { data: exists } = await supabase
          .from('notifications')
          .select('*')
          .eq('category_id', categoryId)
          .eq('type', 'low_balance')
          .eq('read', false);

        if (!exists || exists.length === 0) {
          await supabase.from('notifications').insert([{
            type: 'low_balance',
            message: `Warning: Category "${category.name}" balance is low! Remaining balance is ₹${currentBalance.toFixed(2)} (${remainingPercent.toFixed(1)}% remaining).`,
            read: false,
            category_id: categoryId
          }]);
        }
      }
    }
  },

  // Expenses
  getExpenses: async (): Promise<Expense[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  createExpense: async (expenseData: Omit<Expense, 'id'>, actorEmail: string): Promise<Expense> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('expenses')
      .insert([expenseData])
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.recalculateCategoryStats(data.category_id);

    // Large expense trigger
    const { data: cat } = await supabase.from('categories').select('*').eq('id', data.category_id).single();
    if (cat && Number(data.amount) > Number(cat.allocated_amount) * 0.5) {
      await supabase.from('notifications').insert([{
        type: 'large_expense',
        message: `High Expense: A large expense of ₹${data.amount} was recorded on "${cat.name}" category by ${actorEmail}.`,
        read: false,
        category_id: cat.id
      }]);
    }

    await supabaseAdapter.createAuditLog({
      action: 'Expense Added',
      user_email: actorEmail,
      prev_value: null,
      new_value: data,
      notes: `Recorded expense "${data.title}" under "${cat ? cat.name : 'Unknown'}" (Supabase)`
    });

    return data;
  },
  updateExpense: async (id: string, updates: Partial<Expense>, actorEmail: string): Promise<Expense> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: prev } = await supabase.from('expenses').select('*').eq('id', id).single();

    const mergedUpdates = {
      ...updates,
      last_modified_by: actorEmail,
      last_modified_date: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('expenses')
      .update(mergedUpdates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.recalculateCategoryStats(prev.category_id);
    if (updates.category_id && updates.category_id !== prev.category_id) {
      await supabaseAdapter.recalculateCategoryStats(updates.category_id);
    }

    const { data: cat } = await supabase.from('categories').select('name').eq('id', data.category_id).single();

    await supabaseAdapter.createAuditLog({
      action: 'Expense Edited',
      user_email: actorEmail,
      prev_value: prev,
      new_value: data,
      notes: `Edited expense "${data.title}" in category "${cat ? cat.name : 'Unknown'}" (Supabase)`
    });

    return data;
  },
  deleteExpense: async (id: string, actorEmail: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: removed } = await supabase.from('expenses').select('*').eq('id', id).single();
    if (!removed) throw new Error('Expense not found');

    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdapter.recalculateCategoryStats(removed.category_id);
    const { data: cat } = await supabase.from('categories').select('name').eq('id', removed.category_id).single();

    await supabaseAdapter.createAuditLog({
      action: 'Expense Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Deleted expense "${removed.title}" from "${cat ? cat.name : 'Unknown'}"`
    });

    return true;
  },

  // Funds Management
  addFunds: async (categoryId: string, amount: number, addedBy: string, reason: string): Promise<FundsLog> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
    if (!cat) throw new Error('Category not found');

    const { data, error } = await supabase
      .from('funds_log')
      .insert([{ category_id: categoryId, amount, added_by: addedBy, reason }])
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.recalculateCategoryStats(categoryId);

    // Create custom notification
    await supabase.from('notifications').insert([{
      type: 'new_funds',
      message: `Fund Injection: ₹${amount.toFixed(2)} added to "${cat.name}" by ${addedBy} for: "${reason}".`,
      read: false,
      category_id: categoryId
    }]);

    await supabaseAdapter.createAuditLog({
      action: 'Funds Added',
      user_email: addedBy,
      prev_value: null,
      new_value: data,
      notes: `Injected ₹${amount} into "${cat.name}" via Supabase`
    });

    return data;
  },
  deductFunds: async (categoryId: string, amount: number, deductedBy: string, reason: string): Promise<FundsLog> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: cat } = await supabase.from('categories').select('name').eq('id', categoryId).single();
    if (!cat) throw new Error('Category not found');

    const { data, error } = await supabase
      .from('funds_log')
      .insert([{ category_id: categoryId, amount: -Math.abs(amount), added_by: deductedBy, reason }])
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.recalculateCategoryStats(categoryId);

    await supabaseAdapter.createAuditLog({
      action: 'Funds Removed',
      user_email: deductedBy,
      prev_value: null,
      new_value: data,
      notes: `Deducted ₹${amount} from "${cat.name}" via Supabase`
    });

    return data;
  },
  transferFunds: async (fromCategoryId: string, toCategoryId: string, amount: number, actorEmail: string, reason: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: fromCat } = await supabase.from('categories').select('name').eq('id', fromCategoryId).single();
    const { data: toCat } = await supabase.from('categories').select('name').eq('id', toCategoryId).single();

    if (!fromCat || !toCat) throw new Error('Source/destination category not found');

    const dateStr = new Date().toISOString().split('T')[0];

    // Transfer transactions inside transaction logic or double write
    const { error: error1 } = await supabase.from('funds_log').insert([
      { category_id: fromCategoryId, amount: -amount, added_by: actorEmail, reason: `Transfer to "${toCat.name}". Reason: ${reason}`, date: dateStr }
    ]);
    if (error1) throw error1;

    const { error: error2 } = await supabase.from('funds_log').insert([
      { category_id: toCategoryId, amount: amount, added_by: actorEmail, reason: `Transfer from "${fromCat.name}". Reason: ${reason}`, date: dateStr }
    ]);
    if (error2) throw error2;

    await supabaseAdapter.recalculateCategoryStats(fromCategoryId);
    await supabaseAdapter.recalculateCategoryStats(toCategoryId);

    await supabaseAdapter.createAuditLog({
      action: 'Funds Transferred',
      user_email: actorEmail,
      prev_value: { from: fromCat.name },
      new_value: { to: toCat.name },
      notes: `Transferred ₹${amount} from "${fromCat.name}" to "${toCat.name}" (Supabase)`
    });

    return true;
  },
  getFundsLog: async (): Promise<FundsLog[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('funds_log').select('*').order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  // Recurring
  getRecurringExpenses: async (): Promise<RecurringExpense[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('recurring_expenses').select('*');
    if (error) throw error;
    return data || [];
  },
  createRecurringExpense: async (recData: Omit<RecurringExpense, 'id' | 'is_paused'>, actorEmail: string): Promise<RecurringExpense> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const newRec = {
      ...recData,
      is_paused: false
    };
    const { data, error } = await supabase
      .from('recurring_expenses')
      .insert([newRec])
      .select()
      .single();
    if (error) throw error;

    const { data: cat } = await supabase.from('categories').select('name').eq('id', data.category_id).single();

    await supabaseAdapter.createAuditLog({
      action: 'Recurring Expense Set',
      user_email: actorEmail,
      prev_value: null,
      new_value: data,
      notes: `Set up recurring expense "${data.title}" under "${cat?.name}" (Supabase)`
    });

    return data;
  },
  updateRecurringExpense: async (id: string, updates: Partial<RecurringExpense>, actorEmail: string): Promise<RecurringExpense> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: prev } = await supabase.from('recurring_expenses').select('*').eq('id', id).single();

    const { data, error } = await supabase
      .from('recurring_expenses')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'Recurring Expense Updated',
      user_email: actorEmail,
      prev_value: prev,
      new_value: data,
      notes: `Modified recurring params for "${data.title}" (Supabase)`
    });

    return data;
  },
  deleteRecurringExpense: async (id: string, actorEmail: string): Promise<boolean> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data: removed } = await supabase.from('recurring_expenses').select('*').eq('id', id).single();
    
    const { error } = await supabase.from('recurring_expenses').delete().eq('id', id);
    if (error) throw error;

    await supabaseAdapter.createAuditLog({
      action: 'Recurring Expense Deleted',
      user_email: actorEmail,
      prev_value: removed,
      new_value: null,
      notes: `Removed recurring expense "${removed?.title}" (Supabase)`
    });

    return true;
  },
  processRecurringExpenses: async (actorEmail: string): Promise<number> => {
    if (!supabase) return 0;
    
    const { data: recurring, error } = await supabase.from('recurring_expenses').select('*').eq('is_paused', false);
    if (error || !recurring) return 0;

    const todayStr = new Date().toISOString().split('T')[0];
    let createdCount = 0;

    for (const rec of recurring) {
      if (rec.next_due_date <= todayStr) {
        // Create expense
        await supabaseAdapter.createExpense({
          title: `[Recurring] ${rec.title}`,
          amount: Number(rec.amount),
          category_id: rec.category_id,
          date: rec.next_due_date,
          notes: `Auto-generated from scheduled billing. Frequency: ${rec.frequency}`,
          created_by: 'System'
        }, 'System');

        // Create notification
        await supabase.from('notifications').insert([{
          type: 'recurring_generated',
          message: `Auto Billing: Recurring expense "[Recurring] ${rec.title}" of ₹${rec.amount} was auto-generated.`,
          read: false,
          category_id: rec.category_id
        }]);

        // Calculate next date
        const currentDue = new Date(rec.next_due_date);
        if (rec.frequency === 'Daily') currentDue.setDate(currentDue.getDate() + 1);
        else if (rec.frequency === 'Weekly') currentDue.setDate(currentDue.getDate() + 7);
        else if (rec.frequency === 'Monthly') currentDue.setMonth(currentDue.getMonth() + 1);
        else if (rec.frequency === 'Quarterly') currentDue.setMonth(currentDue.getMonth() + 3);
        else if (rec.frequency === 'Yearly') currentDue.setFullYear(currentDue.getFullYear() + 1);

        const newDueDate = currentDue.toISOString().split('T')[0];
        await supabase.from('recurring_expenses').update({ next_due_date: newDueDate }).eq('id', rec.id);
        createdCount++;
      }
    }

    if (createdCount > 0) {
      await supabaseAdapter.createAuditLog({
        action: 'Recurring Expenses Processed',
        user_email: actorEmail,
        prev_value: null,
        new_value: { generated: createdCount },
        notes: `Processed scheduled recurring items on Supabase database.`
      });
    }

    return createdCount;
  },

  // Audit Logs
  getAuditLogs: async (): Promise<AuditLog[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  createAuditLog: async (logData: Omit<AuditLog, 'id' | 'timestamp'>): Promise<AuditLog> => {
    if (!supabase) {
      // Stub
      return { id: '', timestamp: '', ...logData };
    }
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([logData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // Notifications
  getNotifications: async (): Promise<Notification[]> => {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  markNotificationAsRead: async (id: string): Promise<void> => {
    if (!supabase) return;
    await supabase.from('notifications').update({ read: true }).eq('id', id);
  },
  clearAllNotifications: async (): Promise<void> => {
    if (!supabase) return;
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }
};
