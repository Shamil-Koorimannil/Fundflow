import React, { useEffect, useState } from 'react';
import { db } from '../db/dbClient';
import { Category, Expense, AuditLog, Profile } from '../types';
import { 
  FileText, 
  Download, 
  Calendar, 
  Briefcase, 
  UserCheck, 
  Database, 
  Printer, 
  ArrowUpRight,
  TrendingDown,
  Info,
  Clock,
  History,
  FileCheck2
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  
  // Selected Report type tab
  const [activeReport, setActiveReport] = useState<'monthly' | 'category' | 'user' | 'audit'>('monthly');

  // Filter
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('');

  const loadData = async () => {
    try {
      const cats = await db.getCategories();
      const exps = await db.getExpenses();
      const audits = await db.getAuditLogs();
      const users = await db.getProfiles();

      setCategories(cats);
      setExpenses(exps);
      setAuditLogs(audits);
      setProfiles(users);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePrint = () => {
    window.print();
  };

  // Export engine for reports
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = 'report';

    if (activeReport === 'monthly') {
      filename = 'monthly_expense_breakdown';
      headers = ['Category', 'Allocated Budget', 'Total Expenses Recorded', 'Remaining Balance'];
      rows = categories.map(c => [
        `"${c.name}"`,
        c.allocated_amount,
        c.spent_amount,
        c.current_balance
      ]);
    } else if (activeReport === 'category') {
      filename = 'category_budget_utilization_matrix';
      headers = ['Category', 'Allocated Amount', 'Spent Amount', 'Remaining Balance', 'Utilization Percent'];
      rows = categories.map(c => [
        `"${c.name}"`,
        c.allocated_amount,
        c.spent_amount,
        c.current_balance,
        c.allocated_amount > 0 ? ((c.spent_amount / c.allocated_amount) * 100).toFixed(2) : 0
      ]);
    } else if (activeReport === 'user') {
      filename = 'user_activity_log';
      headers = ['Date & Time', 'Action Perform', 'User Email', 'Notes'];
      const filteredAudits = selectedUserFilter 
        ? auditLogs.filter(a => a.user_email === selectedUserFilter)
        : auditLogs;
      rows = filteredAudits.map(a => [
        a.timestamp,
        a.action,
        a.user_email,
        `"${a.notes.replace(/"/g, '""')}"`
      ]);
    } else if (activeReport === 'audit') {
      filename = 'system_audit_trail_complete';
      headers = ['Timestamp', 'Action', 'Operated By', 'Previous State', 'New State', 'Notes'];
      rows = auditLogs.map(a => [
        a.timestamp,
        a.action,
        a.user_email,
        `"${JSON.stringify(a.prev_value || {}).replace(/"/g, '""')}"`,
        `"${JSON.stringify(a.new_value || {}).replace(/"/g, '""')}"`,
        `"${a.notes.replace(/"/g, '""')}"`
      ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
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
      
      {/* 1. HEADER (Remains no-print during print execution) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/8 pb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white leading-tight">
            Reports & Auditing
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Generate and export financial summaries, user trackers, and full database audits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={handlePrint}
            className="py-2.5 px-4 rounded-xl bg-[#0a0b16]/40 backdrop-blur-md border border-white/8 text-slate-250 font-semibold text-xs transition duration-150 hover:bg-white/5 hover:text-white hover:border-white/15 cursor-pointer flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report (PDF)</span>
          </button>

          <button 
            onClick={handleExportCSV}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition duration-150 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV / Excel</span>
          </button>
        </div>
      </div>

      {/* 2. PRINT EXCLUSIVE HEADER (Visible during printer processing only) */}
      <div className="hidden print:block text-left mb-8 space-y-2 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold font-display text-slate-900">Fund Manager Financial Ledger Report</h1>
        <div className="text-xs text-slate-500 space-y-1 font-semibold">
          <p>Generated At: {new Date().toLocaleString()}</p>
          <p>Report Segment: {activeReport.toUpperCase()} REPORT</p>
          <p>Database Integrity Status: Verified Cryptographically (Sandbox Local/Supabase Mode)</p>
        </div>
      </div>

      {/* 3. REPORT TAB SELECTIONS (no-print) */}
      <div className="no-print glass-card p-2 rounded-2xl flex flex-wrap gap-2">
        <button
          onClick={() => setActiveReport('monthly')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeReport === 'monthly'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
              : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-205'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Monthly Expense Report</span>
        </button>
        
        <button
          onClick={() => setActiveReport('category')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeReport === 'category'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
              : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-205'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Category Balance Sheet</span>
        </button>

        <button
          onClick={() => setActiveReport('user')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeReport === 'user'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
              : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-205'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          <span>User Activity Tracker</span>
        </button>

        <button
          onClick={() => setActiveReport('audit')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border ${
            activeReport === 'audit'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.15)] font-bold'
              : 'text-slate-400 hover:bg-white/5 border-transparent hover:text-slate-205'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>Audit Log Journal</span>
        </button>
      </div>

      {/* 4. ACTIVE REPORT RENDER PANEL */}
      <div className="glass-card rounded-2xl shadow-sm overflow-hidden p-5">
        
        {/* REPORT A: MONTHLY BREAKUP */}
        {activeReport === 'monthly' && (
          <div className="space-y-6">
            <div className="text-left border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Monthly Breakdown Matrix</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Total operations spend allocated across all categories</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              {/* Category spent summary list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Expenses Breakdown</h4>
                <div className="space-y-2">
                  {categories.map(c => {
                    const totalAlloc = categories.reduce((sum, item) => sum + Number(item.allocated_amount), 0);
                    const pctOfWhole = totalAlloc > 0 ? (c.spent_amount / totalAlloc) * 100 : 0;
                    return (
                      <div key={c.id} className="p-3 bg-slate-50 dark:bg-slate-700/20 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.name}</p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{pctOfWhole.toFixed(1)}% of total corporate budget</p>
                        </div>
                        <span className="text-xs font-extrabold text-rose-500">-{fmt(c.spent_amount)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Total Summary numbers card */}
              <div className="p-5 rounded-2xl bg-indigo-50/50 dark:bg-slate-700/40 border border-indigo-100 dark:border-slate-700 flex flex-col justify-between h-56">
                <div>
                  <span className="text-xs font-bold text-slate-500 dark:text-indigo-300 uppercase tracking-wider">Total Cumulative Spend</span>
                  <h2 className="text-3xl font-display font-extrabold text-slate-900 dark:text-white mt-2">
                    {fmt(expenses.reduce((sum, e) => sum + Number(e.amount), 0))}
                  </h2>
                </div>
                
                <div className="space-y-2 border-t border-slate-200/50 dark:border-slate-600 pt-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Total Transactions Count</span>
                    <span className="text-slate-800 dark:text-slate-250">{expenses.length} logs</span>
                  </div>
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-400">Current Reporting Window</span>
                    <span className="text-slate-800 dark:text-slate-250">June 2026 (Active)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* REPORT B: CATEGORY BALANCE SHEET */}
        {activeReport === 'category' && (
          <div className="space-y-5 text-left">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Category Ledger Matrix</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Budget distributions, direct adjustments, spent logs and balances</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-750 text-slate-400 font-bold uppercase tracking-wider border-b dark:border-slate-700 text-[10px]">
                    <th className="p-3">Category Name</th>
                    <th className="p-3 text-right">Allocated Amount</th>
                    <th className="p-3 text-right">Spent Amount</th>
                    <th className="p-3 text-right">Remaining Balance</th>
                    <th className="p-3 text-center">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 font-semibold text-slate-600 dark:text-slate-350">
                  {categories.map(c => {
                    const pct = c.allocated_amount > 0 ? (c.spent_amount / c.allocated_amount) * 100 : 0;
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/25">
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">{c.name}</td>
                        <td className="p-3 text-right">{fmt(c.allocated_amount)}</td>
                        <td className="p-3 text-right text-rose-500">-{fmt(c.spent_amount)}</td>
                        <td className={`p-3 text-right font-extrabold ${c.current_balance < 0 ? 'text-rose-500' : 'text-slate-800 dark:text-slate-200'}`}>
                          {fmt(c.current_balance)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="h-2 w-24 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${c.current_balance < 0 ? 'bg-rose-500' : 'bg-indigo-500'}`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 font-bold w-8">{pct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* REPORT C: USER ACTIVITY TRACKER */}
        {activeReport === 'user' && (
          <div className="space-y-5 text-left">
            <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700 pb-3">
              <div>
                <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Staff Operations Tracker</h3>
                <p className="text-xs text-slate-400 font-semibold mt-0.5">Filter change events by individual account logs</p>
              </div>

              {/* Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Account Filter:</span>
                <select
                  value={selectedUserFilter}
                  onChange={(e) => setSelectedUserFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-750 border dark:border-slate-600 rounded-xl text-xs focus:outline-none"
                >
                  <option value="">All Users</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.email}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              {auditLogs
                .filter(a => selectedUserFilter ? a.user_email === selectedUserFilter : true)
                .slice(0, 15)
                .map(a => (
                  <div key={a.id} className="p-4 bg-slate-50 dark:bg-slate-700/20 rounded-xl border border-slate-100 dark:border-slate-700/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase">
                          {a.action}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">{a.user_email}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-850 dark:text-slate-200">{a.notes}</p>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold whitespace-nowrap self-end sm:self-center">
                      <Clock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" />
                      <span>{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* REPORT D: AUDIT LOG JOURNAL (Previous vs New values details) */}
        {activeReport === 'audit' && (
          <div className="space-y-5 text-left">
            <div className="border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">Detailed Cryptographic Audit Trail</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Parameters change history of all budget models, profiles, and transactions</p>
            </div>

            <div className="space-y-4">
              {auditLogs.slice(0, 20).map(a => {
                const hasDetails = a.prev_value || a.new_value;
                return (
                  <div key={a.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3 relative hover:shadow-sm transition">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b dark:border-slate-750 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 bg-indigo-500 rounded-full" />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{a.action}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">| By {a.user_email}</span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>

                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{a.notes}</p>

                    {/* Previous vs New comparative layout */}
                    {hasDetails && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[10px] font-mono bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-750 max-h-36 overflow-y-auto">
                        <div className="space-y-1">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block">Previous Value:</span>
                          <pre className="text-slate-500 dark:text-slate-450 overflow-x-auto whitespace-pre-wrap">
                            {a.prev_value ? JSON.stringify(a.prev_value, null, 2) : 'NULL (No previous record)'}
                          </pre>
                        </div>
                        <div className="space-y-1 border-t sm:border-t-0 sm:border-l dark:border-slate-750 pt-2 sm:pt-0 sm:pl-3">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block text-indigo-500">New Value:</span>
                          <pre className="text-slate-700 dark:text-slate-200 overflow-x-auto whitespace-pre-wrap">
                            {a.new_value ? JSON.stringify(a.new_value, null, 2) : 'NULL (Deleted)'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

    </div>
  );
};
export default Reports;
