import React, { useEffect, useState } from 'react';
import { db } from '../db/dbClient';
import { Category, Expense } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  Calendar, 
  Filter, 
  Download, 
  ArrowUpRight, 
  Info,
  CalendarCheck,
  CalendarX,
  FileSpreadsheet
} from 'lucide-react';

interface ExpensesProps {
  onTriggerRefresh: () => void;
  quickTransactionPrefillId: string | null;
  onClearPrefill: () => void;
}

export const Expenses: React.FC<ExpensesProps> = ({ onTriggerRefresh, quickTransactionPrefillId, onClearPrefill }) => {
  const { user } = useAuth();
  
  // Data State
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Modals state
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Form Fields State
  const [expTitle, setExpTitle] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expNotes, setExpNotes] = useState('');

  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const cats = await db.getCategories();
      const exps = await db.getExpenses();
      setCategories(cats);
      setExpenses(exps);

      // Handle Quick Prefill trigger
      if (quickTransactionPrefillId) {
        const found = cats.find(c => c.id === quickTransactionPrefillId);
        if (found) {
          setExpCategory(found.id);
          setFormOpen(true);
        }
        onClearPrefill();
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [quickTransactionPrefillId]);

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!expTitle.trim() || !expAmount || !expCategory || !expDate) {
      setFormError('Please fill out all required fields.');
      return;
    }

    try {
      if (editingExpense) {
        // Edit Expense
        await db.updateExpense(editingExpense.id, {
          title: expTitle.trim(),
          amount: Number(expAmount),
          category_id: expCategory,
          date: expDate,
          notes: expNotes.trim()
        }, user?.email || 'System');
      } else {
        // Create Expense
        await db.createExpense({
          title: expTitle.trim(),
          amount: Number(expAmount),
          category_id: expCategory,
          date: expDate,
          notes: expNotes.trim(),
          created_by: user?.email || 'System'
        }, user?.email || 'System');
      }

      setFormOpen(false);
      resetForm();
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit expense entry.');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense? The deducted amount will be restored to the category budget.')) {
      return;
    }
    try {
      await db.deleteExpense(id, user?.email || 'System');
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense.');
    }
  };

  const startEditExpense = (exp: Expense) => {
    setEditingExpense(exp);
    setExpTitle(exp.title);
    setExpAmount(exp.amount.toString());
    setExpCategory(exp.category_id);
    setExpDate(exp.date);
    setExpNotes(exp.notes || '');
    setFormOpen(true);
  };

  const resetForm = () => {
    setEditingExpense(null);
    setExpTitle('');
    setExpAmount('');
    setExpCategory('');
    setExpDate(new Date().toISOString().split('T')[0]);
    setExpNotes('');
    setFormError(null);
  };

  // CSV Exporter engine
  const handleExportCSV = () => {
    if (filteredExpenses.length === 0) return;
    
    // Headers
    const headers = ['Date', 'Title', 'Category', 'Amount (INR)', 'Notes', 'Created By', 'Last Modified By', 'Last Modified Date'];
    
    const rows = filteredExpenses.map(e => {
      const cat = categories.find(c => c.id === e.category_id);
      return [
        e.date,
        `"${e.title.replace(/"/g, '""')}"`,
        `"${(cat ? cat.name : 'Unknown').replace(/"/g, '""')}"`,
        e.amount,
        `"${(e.notes || '').replace(/"/g, '""')}"`,
        e.created_by,
        e.last_modified_by || '',
        e.last_modified_date || ''
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `expenses_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtering Logic
  const filteredExpenses = expenses.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (e.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategoryFilter ? e.category_id === selectedCategoryFilter : true;
    
    const matchesStartDate = startDateFilter ? e.date >= startDateFilter : true;
    const matchesEndDate = endDateFilter ? e.date <= endDateFilter : true;

    return matchesSearch && matchesCategory && matchesStartDate && matchesEndDate;
  });

  const fmt = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
            Expenses History
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Browse corporate spending, apply deep sorting, and log transactions.
          </p>
        </div>

        <button 
          onClick={() => { resetForm(); setFormOpen(true); }}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition duration-150 sm:self-center cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Record Expense</span>
        </button>
      </div>

      {/* 2. FILTER SHEET (Search, Category, Date range, Exports) */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        
        <div className="flex items-center gap-2 border-b border-white/8 pb-3">
          <Filter className="h-4 w-4 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
          <span className="text-xs font-extrabold text-slate-200 uppercase tracking-wider">Search & Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
          {/* Keyword Search */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Name/Notes</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Meta ads, Zoho..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
              />
              <Search className="h-4 w-4 absolute right-2.5 top-2.5 text-slate-500" />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Selector</label>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarCheck className="h-3 w-3 text-cyan-400" />
              <span>Start Date</span>
            </label>
            <input 
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <CalendarX className="h-3 w-3 text-rose-500" />
              <span>End Date</span>
            </label>
            <input 
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="w-full px-3 py-1.5 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
            />
          </div>
        </div>

        {/* Clear and export buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/8">
          <span className="text-[10px] text-slate-550 font-bold uppercase">
            Showing {filteredExpenses.length} of {expenses.length} records
          </span>

          <div className="flex items-center gap-3">
            {(searchQuery || selectedCategoryFilter || startDateFilter || endDateFilter) && (
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryFilter('');
                  setStartDateFilter('');
                  setEndDateFilter('');
                }}
                className="text-xs font-bold text-slate-400 hover:text-cyan-400 hover:underline cursor-pointer"
              >
                Clear Filters
              </button>
            )}

            <button 
              onClick={handleExportCSV}
              disabled={filteredExpenses.length === 0}
              className="py-1.5 px-3 bg-[#121326]/45 hover:bg-white/5 text-cyan-400 border border-white/5 hover:border-white/10 font-semibold text-xs rounded-lg flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. EXPENSES HISTORY TABLE (Optimized as cards on mobile, tables on desktop) */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest">
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Expense / Description</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5 text-right">Amount</th>
                <th className="py-4 px-5">Staff Member</th>
                <th className="py-4 px-5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400 font-medium">
                    No matching operational expenses logged.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map(e => {
                  const cat = categories.find(c => c.id === e.category_id);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition">
                      <td className="py-3 px-5 whitespace-nowrap text-slate-400">{e.date}</td>
                      <td className="py-3 px-5 max-w-[200px]">
                        <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{e.title}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">{e.notes || '--'}</p>
                      </td>
                      <td className="py-3 px-5">
                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                          {cat ? cat.name : 'Unknown'}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right font-extrabold text-rose-500 whitespace-nowrap">
                        -{fmt(e.amount)}
                      </td>
                      <td className="py-3 px-5 whitespace-nowrap">
                        <p className="text-slate-700 dark:text-slate-300">{e.created_by}</p>
                        {e.last_modified_by && (
                          <span className="text-[9px] text-slate-400 block mt-0.5">Mod by {e.last_modified_by}</span>
                        )}
                      </td>
                      <td className="py-3 px-5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => startEditExpense(e)}
                            className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-indigo-500 rounded-lg transition"
                            title="Edit"
                          >
                            <Edit3 className="h-4.5 w-4.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteExpense(e.id)}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-950/30 text-rose-500 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards (Fulfills no horizontal scroll rule) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {filteredExpenses.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium text-xs">
              No matching operational expenses logged.
            </div>
          ) : (
            filteredExpenses.map(e => {
              const cat = categories.find(c => c.id === e.category_id);
              return (
                <div key={e.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">{e.title}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{e.date}</p>
                    </div>
                    <span className="text-sm font-extrabold text-rose-500">
                      -{fmt(e.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                      {cat ? cat.name : 'Unknown'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">By {e.created_by}</span>
                  </div>

                  {e.notes && (
                    <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg border border-slate-100 dark:border-slate-750">
                      {e.notes}
                    </p>
                  )}

                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => startEditExpense(e)}
                      className="py-1 px-3 border border-indigo-100 hover:bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Edit</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteExpense(e.id)}
                      className="py-1 px-3 border border-red-100 hover:bg-red-50 text-red-500 rounded-lg text-[10px] font-bold flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ==================== RECORD/EDIT EXPENSE MODAL ==================== */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setFormOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              {editingExpense ? 'Modify Recorded Expense' : 'Record New Category Expense'}
            </h3>

            <form onSubmit={handleSubmitExpense} className="mt-4 space-y-4 text-left">
              {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expense Title *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Meta Campaigns Ads"
                  value={expTitle}
                  onChange={(e) => setExpTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="9000.00"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category Allocation *</label>
                <select
                  required
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="">Select category</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (rem. balance: {fmt(c.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operational Notes</label>
                <textarea 
                  placeholder="e.g. Meta ads for seasonal retargeting campaigns"
                  value={expNotes}
                  onChange={(e) => setExpNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setFormOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  {editingExpense ? 'Save Updates' : 'Add Expense'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Expenses;
