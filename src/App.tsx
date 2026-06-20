import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { localAdapter } from './db/adapters/localAdapter';
import { db } from './db/dbClient';
import { Category } from './types';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Categories from './pages/Categories';
import Expenses from './pages/Expenses';
import Ledger from './pages/Ledger';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { Coins, Plus, Calendar } from 'lucide-react';

// Main Application Inner Shell to read Auth Context
const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Global Quick Action Modals
  const [quickTxOpen, setQuickTxOpen] = useState(false);
  const [addFundsOpen, setAddFundsOpen] = useState(false);
  
  // Prefill state
  const [prefilledCatId, setPrefilledCatId] = useState<string | null>(null);
  
  // Modal Categories list
  const [categories, setCategories] = useState<Category[]>([]);

  // Form Fields for Quick Action Modals
  const [txTitle, setTxTitle] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txNotes, setTxNotes] = useState('');

  const [fundCategory, setFundCategory] = useState('');
  const [fundAmount, setFundAmount] = useState('');
  const [fundReason, setFundReason] = useState('');
  const [fundIsDeduct, setFundIsDeduct] = useState(false);

  const [modalError, setModalError] = useState<string | null>(null);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const loadModalCategories = async () => {
    try {
      const data = await db.getCategories();
      setCategories(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user) {
      loadModalCategories();
    }
  }, [user, refreshTrigger]);

  const handleOpenQuickTx = (catId?: string) => {
    loadModalCategories();
    setTxTitle('');
    setTxAmount('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxNotes('');
    setModalError(null);

    if (catId) {
      setTxCategory(catId);
    } else {
      setTxCategory('');
    }
    setQuickTxOpen(true);
  };

  const handleOpenAddFunds = (catId?: string) => {
    loadModalCategories();
    setFundAmount('');
    setFundReason('');
    setFundIsDeduct(false);
    setModalError(null);

    if (catId) {
      setFundCategory(catId);
    } else {
      setFundCategory('');
    }
    setAddFundsOpen(true);
  };

  const handleQuickTxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!txTitle.trim() || !txAmount || !txCategory || !txDate) {
      setModalError('Please fill out all required fields.');
      return;
    }

    try {
      await db.createExpense({
        title: txTitle.trim(),
        amount: Number(txAmount),
        category_id: txCategory,
        date: txDate,
        notes: txNotes.trim(),
        created_by: user?.email || 'System'
      }, user?.email || 'System');

      setQuickTxOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Transaction recording failed.');
    }
  };

  const handleAddFundsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!fundCategory || !fundAmount || Number(fundAmount) <= 0 || !fundReason.trim()) {
      setModalError('Please input a valid category, positive amount, and operational reason.');
      return;
    }

    try {
      if (fundIsDeduct) {
        // Deduct
        await db.deductFunds(
          fundCategory,
          Number(fundAmount),
          user?.email || 'System',
          fundReason.trim()
        );
      } else {
        // Add
        await db.addFunds(
          fundCategory,
          Number(fundAmount),
          user?.email || 'System',
          fundReason.trim()
        );
      }

      setAddFundsOpen(false);
      triggerRefresh();
    } catch (err: any) {
      setModalError(err.message || 'Funds operation failed.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center space-y-4">
        <div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Authenticating Vault Access...</p>
      </div>
    );
  }

  // Redirect to Login page if no active user session
  if (!user) {
    return <Login />;
  }

  // Route Views Selector
  const renderTabContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <Dashboard 
            setCurrentTab={setCurrentTab} 
            onOpenQuickTransaction={() => handleOpenQuickTx()}
            onOpenAddFunds={() => handleOpenAddFunds()}
          />
        );
      case 'categories':
        return (
          <Categories 
            key={refreshTrigger}
            onTriggerRefresh={triggerRefresh}
            openQuickTransaction={(catId) => handleOpenQuickTx(catId)}
            openAddFunds={(catId) => handleOpenAddFunds(catId)}
          />
        );
      case 'expenses':
        return (
          <Expenses 
            key={refreshTrigger}
            onTriggerRefresh={triggerRefresh}
            quickTransactionPrefillId={prefilledCatId}
            onClearPrefill={() => setPrefilledCatId(null)}
          />
        );
      case 'ledger':
        return <Ledger key={refreshTrigger} />;
      case 'reports':
        return <Reports key={refreshTrigger} />;
      case 'settings':
        return <Settings key={refreshTrigger} />;
      default:
        return <Dashboard setCurrentTab={setCurrentTab} onOpenQuickTransaction={() => handleOpenQuickTx()} onOpenAddFunds={() => handleOpenAddFunds()} />;
    }
  };

  const fmt = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(num);
  };

  return (
    <Layout 
      currentTab={currentTab} 
      setCurrentTab={setCurrentTab}
      onOpenQuickTransaction={() => handleOpenQuickTx()}
    >
      {renderTabContent()}

      {/* ==================== GLOBAL CORE QUICK MODALS ==================== */}

      {/* 1. QUICK ADD TRANSACTION EXPENSE MODAL */}
      {quickTxOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setQuickTxOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              Record Category Expense
            </h3>

            <form onSubmit={handleQuickTxSubmit} className="mt-4 space-y-4 text-left">
              {modalError && <p className="text-xs text-rose-500 font-bold">{modalError}</p>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expense Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. WiFi Bill Payment"
                  value={txTitle} 
                  onChange={(e) => setTxTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
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
                    placeholder="850.00"
                    value={txAmount} 
                    onChange={(e) => setTxAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date *</label>
                  <input 
                    type="date" 
                    required
                    value={txDate} 
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Category *</label>
                <select
                  required
                  value={txCategory}
                  onChange={(e) => setTxCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="">Select category allocation</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (rem. balance: {fmt(c.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description Notes</label>
                <textarea 
                  placeholder="Additional descriptions..."
                  value={txNotes} 
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm h-16 resize-none animate-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setQuickTxOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-350 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Expense</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. QUICK ADD/DEDUCT FUNDS ALLOCATION MODAL */}
      {addFundsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAddFundsOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              Inject / Deduct Category Funds
            </h3>

            <form onSubmit={handleAddFundsSubmit} className="mt-4 space-y-4 text-left">
              {modalError && <p className="text-xs text-rose-500 font-bold">{modalError}</p>}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Operation Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFundIsDeduct(false)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition ${
                      !fundIsDeduct 
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Credit (Add Funds)
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFundIsDeduct(true)}
                    className={`py-2 px-3 rounded-xl border text-center font-bold text-xs transition ${
                      fundIsDeduct 
                        ? 'border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' 
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    Debit (Deduct Funds)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Target Category *</label>
                <select
                  required
                  value={fundCategory}
                  onChange={(e) => setFundCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="">Select category card</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name} (balance: {fmt(c.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Amount (₹) *</label>
                <input 
                  type="number" 
                  required
                  min="0.01"
                  step="0.01"
                  placeholder="5000.00"
                  value={fundAmount} 
                  onChange={(e) => setFundAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Expand budget for marketing expansion"
                  value={fundReason} 
                  onChange={(e) => setFundReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-650 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setAddFundsOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-350 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={`py-2 px-5 rounded-xl text-white font-semibold text-xs flex items-center gap-1 ${
                    fundIsDeduct ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <Coins className="h-3.5 w-3.5" />
                  <span>{fundIsDeduct ? 'Deduct' : 'Add Funds'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </Layout>
  );
};

// Global App wrapper integrating scope contexts
export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;
