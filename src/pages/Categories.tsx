import React, { useEffect, useState } from 'react';
import { db } from '../db/dbClient';
import { Category, Expense } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Trash2, 
  Archive, 
  Edit3, 
  ArrowRightLeft, 
  TrendingUp, 
  TrendingDown, 
  FolderMinus, 
  AlertTriangle,
  Coins,
  Video,
  Home,
  Wifi as WifiIcon,
  Zap,
  TrendingUp as AdIcon,
  Layers,
  Droplet,
  Brush,
  Users
} from 'lucide-react';

interface CategoriesProps {
  onTriggerRefresh: () => void;
  openQuickTransaction: (prefilledCategoryId?: string) => void;
  openAddFunds: (prefilledCategoryId?: string) => void;
}

export const Categories: React.FC<CategoriesProps> = ({ onTriggerRefresh, openQuickTransaction, openAddFunds }) => {
  const { user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // Active selected entities
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  
  // Form fields
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catAllocated, setCatAllocated] = useState('');
  const [catThreshold, setCatThreshold] = useState('20');
  
  // Transfer form fields
  const [transferSource, setTransferSource] = useState('');
  const [transferDest, setTransferDest] = useState('');
  const [transferAmt, setTransferAmt] = useState('');
  const [transferReason, setTransferReason] = useState('');
  
  // Delete rerouting state
  const [transferExpensesTarget, setTransferExpensesTarget] = useState('');
  const [relatedExpensesCount, setRelatedExpensesCount] = useState(0);

  const [formError, setFormError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const cats = await db.getCategories(true); // include archived
      const exps = await db.getExpenses();
      setCategories(cats);
      setExpenses(exps);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!catName.trim() || catAllocated === '') {
      setFormError('Please fill out all required fields.');
      return;
    }
    try {
      await db.createCategory({
        name: catName.trim(),
        description: catDesc.trim(),
        allocated_amount: Number(catAllocated),
        threshold: Number(catThreshold)
      }, user?.email || 'System');
      
      setCreateModalOpen(false);
      resetForm();
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create category.');
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!selectedCategory || !catName.trim() || catAllocated === '') {
      setFormError('Required fields missing.');
      return;
    }
    try {
      await db.updateCategory(selectedCategory.id, {
        name: catName.trim(),
        description: catDesc.trim(),
        allocated_amount: Number(catAllocated),
        threshold: Number(catThreshold)
      }, user?.email || 'System');

      setEditModalOpen(false);
      resetForm();
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update category.');
    }
  };

  const handleTransferFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!transferSource || !transferDest || !transferAmt || Number(transferAmt) <= 0) {
      setFormError('Please input a valid transfer target and positive amount.');
      return;
    }
    if (transferSource === transferDest) {
      setFormError('Cannot transfer funds to the same category!');
      return;
    }
    try {
      await db.transferFunds(
        transferSource,
        transferDest,
        Number(transferAmt),
        user?.email || 'System',
        transferReason || 'Inter-category balance transfer'
      );
      setTransferModalOpen(false);
      resetForm();
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to transfer budget.');
    }
  };

  const openDeleteConfirmation = (cat: Category) => {
    setSelectedCategory(cat);
    const count = expenses.filter(e => e.category_id === cat.id).length;
    setRelatedExpensesCount(count);
    // Find default healthy transfer option (not the deleted one)
    const other = categories.find(c => c.id !== cat.id && !c.is_archived);
    setTransferExpensesTarget(other?.id || '');
    setDeleteConfirmOpen(true);
    setActiveDropdown(null);
  };

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return;
    try {
      await db.deleteCategory(
        selectedCategory.id,
        relatedExpensesCount > 0 ? transferExpensesTarget : undefined,
        user?.email || 'System'
      );
      setDeleteConfirmOpen(false);
      setSelectedCategory(null);
      loadData();
      onTriggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete category.');
    }
  };

  const handleToggleArchive = async (cat: Category) => {
    try {
      await db.archiveCategory(cat.id, !cat.is_archived, user?.email || 'System');
      loadData();
      setActiveDropdown(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update archive status.');
    }
  };

  const openEditModal = (cat: Category) => {
    setSelectedCategory(cat);
    setCatName(cat.name);
    setCatDesc(cat.description || '');
    setCatAllocated(cat.allocated_amount.toString());
    setCatThreshold(cat.threshold.toString());
    setEditModalOpen(true);
    setActiveDropdown(null);
  };

  const resetForm = () => {
    setCatName('');
    setCatDesc('');
    setCatAllocated('');
    setCatThreshold('20');
    setTransferSource('');
    setTransferDest('');
    setTransferAmt('');
    setTransferReason('');
    setFormError(null);
    setSelectedCategory(null);
  };

  // Get matching mockup icon based on name
  const getCategoryIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('shoot')) return Video;
    if (n.includes('rent')) return Home;
    if (n.includes('wifi') || n.includes('internet')) return WifiIcon;
    if (n.includes('bill') || n.includes('current')) return Zap;
    if (n.includes('ad') || n.includes('market') || n.includes('camp')) return AdIcon;
    if (n.includes('zoho') || n.includes('soft') || n.includes('app')) return Layers;
    if (n.includes('water')) return Droplet;
    if (n.includes('clean')) return Brush;
    if (n.includes('client') || n.includes('meet')) return Users;
    return Coins;
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmt = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
            Category Allocations
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Manage your budget distribution and track category performance.
          </p>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setTransferModalOpen(true)}
            className="py-2.5 px-4 rounded-xl bg-[#0a0b16]/40 backdrop-blur-md border border-white/8 text-slate-250 font-semibold text-xs transition duration-150 hover:bg-white/5 hover:text-white hover:border-white/15 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Transfer Funds</span>
          </button>

          <button 
            onClick={() => { resetForm(); setCreateModalOpen(true); }}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create Category</span>
          </button>
        </div>
      </div>

      {/* 2. SEARCH & FILTER BAR */}
      <div className="relative max-w-md w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-550" />
        </div>
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-2.5 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
        />
      </div>

      {/* 3. CATEGORIES GRID - Renders exact visual mockup card sizes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCategories.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3 py-16 text-center text-slate-400 space-y-2">
            <FolderMinus className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="font-semibold text-sm">No matching categories found</p>
          </div>
        ) : (
          filteredCategories.map(c => {
            const Icon = getCategoryIcon(c.name);
            const pct = c.allocated_amount > 0 ? (c.spent_amount / c.allocated_amount) * 100 : 0;
            const isNegative = c.current_balance < 0;
            const isLow = c.current_balance >= 0 && c.allocated_amount > 0 && (c.current_balance / c.allocated_amount) * 100 < c.threshold;

            let cardBorder = 'border-white/5';
            let statusPill = 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]';
            let statusText = 'Healthy';
            let barColor = 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]';

            if (isNegative) {
              cardBorder = 'border-rose-500/30 bg-rose-950/10 shadow-[0_0_12px_rgba(244,63,94,0.1)]';
              statusPill = 'bg-rose-950/45 border border-rose-500/40 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
              statusText = 'Over Budget';
              barColor = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
            } else if (isLow) {
              cardBorder = 'border-amber-500/30 bg-amber-950/10 shadow-[0_0_12px_rgba(245,158,11,0.1)]';
              statusPill = 'bg-amber-950/45 border border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
              statusText = 'Low Balance';
              barColor = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
            }

            if (c.is_archived) {
              cardBorder = 'border-white/5 opacity-50';
              statusText = 'Archived';
              statusPill = 'bg-slate-900 border border-white/5 text-slate-500';
              barColor = 'bg-slate-600';
            }

            return (
              <div 
                key={c.id} 
                className={`glass-card rounded-2xl border ${cardBorder} flex flex-col justify-between overflow-hidden relative group hover:translate-y-[-2px] transition duration-200`}
              >
                
                {/* Upper Details */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center border ${
                        isNegative ? 'bg-rose-950 border-rose-500/25 text-rose-455 shadow-[0_0_8px_rgba(244,63,94,0.2)]' : 'bg-[#121326] border border-white/5 text-cyan-405 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-bold text-white text-base leading-snug">
                          {c.name}
                        </h3>
                        <p className="text-[10px] text-slate-500 font-semibold truncate max-w-[150px]">
                          {c.description || 'No description provided'}
                        </p>
                      </div>
                    </div>
                    
                    {/* Status Pill & Settings Dots */}
                    <div className="flex items-center gap-2 relative">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusPill}`}>
                        {statusText}
                      </span>
                      
                      {/* Admin-locked dropdown trigger */}
                      {user?.role === 'Admin' && (
                        <div>
                          <button 
                            onClick={() => setActiveDropdown(activeDropdown === c.id ? null : c.id)}
                            className="p-1 rounded-lg hover:bg-white/5 text-slate-400 cursor-pointer"
                          >
                            <MoreVertical className="h-4.5 w-4.5" />
                          </button>
                          
                          {activeDropdown === c.id && (
                            <div className="absolute right-0 mt-1 w-36 bg-[#0a0b16] border border-white/10 rounded-xl shadow-2xl py-1 z-10 text-left text-xs font-semibold text-slate-205">
                              <button 
                                onClick={() => openEditModal(c)}
                                className="w-full px-4 py-2 hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                              >
                                <Edit3 className="h-4 w-4" />
                                <span>Edit Card</span>
                              </button>
                              
                              <button 
                                onClick={() => handleToggleArchive(c)}
                                className="w-full px-4 py-2 hover:bg-white/5 flex items-center gap-2 text-slate-400 cursor-pointer"
                              >
                                <Archive className="h-4 w-4" />
                                <span>{c.is_archived ? 'Activate' : 'Archive'}</span>
                              </button>
                              
                              <div className="h-px bg-white/5 my-1" />
                              
                              <button 
                                onClick={() => openDeleteConfirmation(c)}
                                className="w-full px-4 py-2 hover:bg-rose-950/20 flex items-center gap-2 text-rose-455 cursor-pointer"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Allocated / Spent Mini Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-[#121326]/30 p-2.5 rounded-xl border border-white/5 text-left">
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Allocated</span>
                      <p className="text-xs font-extrabold text-slate-200">{fmt(c.allocated_amount)}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Spent</span>
                      <p className="text-xs font-extrabold text-slate-200">{fmt(c.spent_amount)}</p>
                    </div>
                  </div>

                  {/* Remaining Balance & Percentage utilized bar */}
                  <div className="space-y-1 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {isNegative ? 'Remaining Deficit' : 'Remaining Balance'}
                      </span>
                      <span className={`text-base font-extrabold ${isNegative ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]' : 'text-emerald-400 drop-shadow-[0_0_6px_rgba(52,211,153,0.3)]'}`}>
                        {isNegative ? '-' : ''}{fmt(Math.abs(c.current_balance))}
                      </span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="h-1.5 w-full bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${barColor}`} 
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>

                    <div className="text-[9px] font-bold text-slate-400 text-right">
                      {pct.toFixed(0)}% Utilized
                    </div>
                  </div>
                </div>

                {/* Bottom card actions split block */}
                <div className="flex border-t border-white/8 h-11 text-xs font-bold text-slate-400">
                  <button 
                    onClick={() => openQuickTransaction(c.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 hover:bg-white/5 transition border-r border-white/8 text-cyan-400 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Add Exp</span>
                  </button>
                  
                  <button 
                    onClick={() => openAddFunds(c.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 hover:bg-white/5 transition text-indigo-300 cursor-pointer"
                  >
                    <Coins className="h-3.5 w-3.5 text-indigo-300" />
                    <span>Add Funds</span>
                  </button>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ==================== MODALS INJECTION SHEET ==================== */}

      {/* A. CREATE CATEGORY MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setCreateModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              Create New Category
            </h3>
            
            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4 text-left">
              {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Ad Budget"
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea 
                  placeholder="Notes about operational category allocation..."
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Allocated Budget (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    placeholder="8000"
                    value={catAllocated} 
                    onChange={(e) => setCatAllocated(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alert Threshold (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    placeholder="20"
                    value={catThreshold} 
                    onChange={(e) => setCatThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setCreateModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. EDIT CATEGORY MODAL */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              Edit Category Allocation
            </h3>
            
            <form onSubmit={handleEditCategory} className="mt-4 space-y-4 text-left">
              {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Category Name *</label>
                <input 
                  type="text" 
                  required
                  value={catName} 
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Description</label>
                <textarea 
                  value={catDesc} 
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Allocated Budget (₹) *</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    step="0.01"
                    value={catAllocated} 
                    onChange={(e) => setCatAllocated(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Alert Threshold (%)</label>
                  <input 
                    type="number" 
                    min="0"
                    max="100"
                    value={catThreshold} 
                    onChange={(e) => setCatThreshold(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setEditModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. DELETE CONFIRMATION & EXPENSE REROUTING MODAL */}
      {deleteConfirmOpen && selectedCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setDeleteConfirmOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10 border border-slate-200 dark:border-rose-950/50">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3 text-red-500 text-left">
              <AlertTriangle className="h-5 w-5" />
              <h3 className="font-display font-bold text-lg">
                Delete Category Allocation?
              </h3>
            </div>

            <div className="mt-4 space-y-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
              <p>
                Are you sure you want to delete category <strong className="text-slate-800 dark:text-slate-100">"{selectedCategory.name}"</strong>? This action will permanently remove it from the budget records and wipe related allocations.
              </p>

              {relatedExpensesCount > 0 ? (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-xl space-y-3">
                  <p className="text-rose-600 dark:text-rose-400 font-bold">
                    Warning: There are {relatedExpensesCount} expenses currently recorded under this category!
                  </p>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Reroute Expenses To:
                    </label>
                    <select
                      value={transferExpensesTarget}
                      onChange={(e) => setTransferExpensesTarget(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                    >
                      <option value="" disabled>-- Select target category --</option>
                      {categories
                        .filter(c => c.id !== selectedCategory.id && !c.is_archived)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name} (rem. balance: {fmt(c.current_balance)})</option>
                        ))}
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-emerald-500 font-bold">
                  No active expenses recorded on this card. It can be clean deleted.
                </p>
              )}

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setDeleteConfirmOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleDeleteCategory}
                  disabled={relatedExpensesCount > 0 && !transferExpensesTarget}
                  className="py-2 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs disabled:opacity-50"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D. TRANSFER FUNDS MODAL */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setTransferModalOpen(false)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
          <div className="glass-modal rounded-2xl w-full max-w-md p-6 relative shadow-2xl z-10">
            <h3 className="font-display font-bold text-slate-900 dark:text-white text-lg border-b dark:border-slate-700 pb-3 text-left">
              Transfer Funds Between Categories
            </h3>
            
            <form onSubmit={handleTransferFunds} className="mt-4 space-y-4 text-left">
              {formError && <p className="text-xs text-rose-500 font-bold">{formError}</p>}
              
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Source Category (From)</label>
                <select
                  required
                  value={transferSource}
                  onChange={(e) => setTransferSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="">Select source category</option>
                  {categories.filter(c => !c.is_archived).map(c => (
                    <option key={c.id} value={c.id}>{c.name} (balance: {fmt(c.current_balance)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Destination Category (To)</label>
                <select
                  required
                  value={transferDest}
                  onChange={(e) => setTransferDest(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                >
                  <option value="">Select destination category</option>
                  {categories.filter(c => !c.is_archived).map(c => (
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
                  placeholder="500.00"
                  value={transferAmt} 
                  onChange={(e) => setTransferAmt(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Reason</label>
                <input 
                  type="text"
                  placeholder="e.g. Allocation adjustment for rent billing"
                  value={transferReason} 
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button 
                  type="button" 
                  onClick={() => setTransferModalOpen(false)}
                  className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="py-2 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                >
                  Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
export default Categories;
