import React, { useEffect, useState } from 'react';
import { db } from '../db/dbClient';
import { Category, Expense, FundsLog } from '../types';
import { 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  ArrowRightLeft,
  Calendar,
  Filter,
  Download,
  BookOpen,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';

interface LedgerItem {
  id: string;
  date: string;
  categoryName: string;
  type: 'Expense' | 'Fund Added' | 'Fund Removed' | 'Transfer';
  amount: number; // positive or negative
  user: string;
  notes: string;
}

export const Ledger: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [ledgerItems, setLedgerItems] = useState<LedgerItem[]>([]);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  
  const loadData = async () => {
    try {
      const cats = await db.getCategories();
      const exps = await db.getExpenses();
      const funds = await db.getFundsLog();

      setCategories(cats);

      // Aggregate ledger items
      const items: LedgerItem[] = [];

      // 1. Expenses as ledger rows
      exps.forEach(e => {
        const cat = cats.find(c => c.id === e.category_id);
        items.push({
          id: `EXP-${e.id.substring(0, 5).toUpperCase()}`,
          date: e.date,
          categoryName: cat ? cat.name : 'Unknown',
          type: 'Expense',
          amount: -Math.abs(e.amount),
          user: e.created_by,
          notes: e.title + (e.notes ? `: ${e.notes}` : '')
        });
      });

      // 2. Funds log as ledger rows
      funds.forEach(f => {
        const cat = cats.find(c => c.id === f.category_id);
        const isTransfer = f.reason.toLowerCase().includes('transfer');
        
        let type: 'Fund Added' | 'Fund Removed' | 'Transfer' = f.amount > 0 ? 'Fund Added' : 'Fund Removed';
        if (isTransfer) {
          type = 'Transfer';
        }

        items.push({
          id: `FND-${f.id.substring(0, 5).toUpperCase()}`,
          date: f.date,
          categoryName: cat ? cat.name : 'Unknown',
          type,
          amount: f.amount,
          user: f.added_by,
          notes: f.reason
        });
      });

      // Sort ledger chronologically (newest first)
      items.sort((a, b) => b.date.localeCompare(a.date));
      setLedgerItems(items);

    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtering calculations
  const filteredLedger = ledgerItems.filter(item => {
    const matchesSearch = item.notes.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.categoryName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType ? item.type === selectedType : true;
    const matchesCat = selectedCategory ? item.categoryName === selectedCategory : true;

    return matchesSearch && matchesType && matchesCat;
  });

  const handleExportCSV = () => {
    if (filteredLedger.length === 0) return;
    const headers = ['Transaction ID', 'Date', 'Category', 'Type', 'Amount (INR)', 'Staff Member', 'Notes'];
    const rows = filteredLedger.map(i => [
      i.id,
      i.date,
      `"${i.categoryName}"`,
      i.type,
      i.amount,
      i.user,
      `"${i.notes.replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `transaction_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
            Transaction Ledger
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Complete chronologically sorted accounting history of category asset movements.
          </p>
        </div>

        <button 
          onClick={handleExportCSV}
          disabled={filteredLedger.length === 0}
          className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition duration-150 disabled:opacity-40 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>Export Ledger Sheet</span>
        </button>
      </div>

      {/* 2. FILTERS CARD */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Keywords / ID</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="TXN ID, notes, wifi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-3 pr-8 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
              />
              <Search className="h-4 w-4 absolute right-2.5 top-2.5 text-slate-550" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
            >
              <option value="">All Types</option>
              <option value="Expense">Expenses (deduction)</option>
              <option value="Fund Added">Funds Injected (credit)</option>
              <option value="Fund Removed">Funds Removed (debit)</option>
              <option value="Transfer">Inter-Category Transfers</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#121326]/40 border border-white/8 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-cyan-400/50 focus:shadow-[0_0_8px_rgba(6,182,212,0.15)] transition"
            >
              <option value="">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

        </div>

        {/* Filters status row */}
        {(searchQuery || selectedType || selectedCategory) && (
          <div className="flex justify-end border-t border-white/8 pt-2">
            <button 
              onClick={() => {
                setSearchQuery('');
                setSelectedType('');
                setSelectedCategory('');
              }}
              className="text-xs font-bold text-slate-400 hover:text-cyan-400 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* 3. TABLE SHEET */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden">
        
        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-700/40 text-slate-400 border-b border-slate-100 dark:border-slate-700 text-[10px] font-bold uppercase tracking-widest">
                <th className="py-4 px-5">Date</th>
                <th className="py-4 px-5">Transaction ID</th>
                <th className="py-4 px-5">Category</th>
                <th className="py-4 px-5">Type</th>
                <th className="py-4 px-5 text-right">Amount</th>
                <th className="py-4 px-5">User</th>
                <th className="py-4 px-5">Notes / Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-xs font-semibold text-slate-600 dark:text-slate-300">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400 font-medium">
                    No ledger transactions found matching filters.
                  </td>
                </tr>
              ) : (
                filteredLedger.map(item => {
                  const isPositive = item.amount > 0;
                  
                  let icon = <ArrowUpRight className="h-3 w-3" />;
                  let typeStyle = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400';
                  
                  if (item.type === 'Fund Added') {
                    icon = <ArrowDownLeft className="h-3 w-3" />;
                    typeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
                  } else if (item.type === 'Transfer') {
                    icon = <ArrowRightLeft className="h-3 w-3" />;
                    typeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400';
                  }

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition">
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-400">{item.date}</td>
                      <td className="py-3.5 px-5 font-mono text-[10px] text-slate-400 whitespace-nowrap">{item.id}</td>
                      <td className="py-3.5 px-5 font-bold text-slate-800 dark:text-slate-100">{item.categoryName}</td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${typeStyle}`}>
                          {icon}
                          <span>{item.type}</span>
                        </span>
                      </td>
                      <td className={`py-3.5 px-5 text-right font-extrabold whitespace-nowrap ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {isPositive ? '+' : ''}{fmt(item.amount)}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap text-slate-400">{item.user}</td>
                      <td className="py-3.5 px-5 max-w-[250px] truncate text-slate-500 dark:text-slate-450" title={item.notes}>
                        {item.notes}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View Cards */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-700">
          {filteredLedger.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium text-xs">
              No ledger transactions found matching filters.
            </div>
          ) : (
            filteredLedger.map(item => {
              const isPositive = item.amount > 0;
              let typeStyle = 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
              if (item.type === 'Fund Added') {
                typeStyle = 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
              } else if (item.type === 'Transfer') {
                typeStyle = 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30';
              }

              return (
                <div key={item.id} className="p-4 space-y-3 hover:bg-slate-50/50 dark:hover:bg-slate-700/10 text-left">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[9px] text-slate-400">{item.id}</span>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{item.categoryName}</h4>
                      <p className="text-[10px] text-slate-400">{item.date}</p>
                    </div>
                    <span className={`text-xs font-extrabold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isPositive ? '+' : ''}{fmt(item.amount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${typeStyle}`}>
                      {item.type}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">By {item.user}</span>
                  </div>

                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/50">
                    {item.notes}
                  </p>
                </div>
              );
            })
          )}
        </div>

      </div>

    </div>
  );
};
export default Ledger;
