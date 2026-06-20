import React, { useEffect, useState } from 'react';
import { db } from '../db/dbClient';
import { Category, Expense, FundsLog } from '../types';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertOctagon, 
  Coins, 
  ArrowUpRight, 
  Calendar, 
  ShieldAlert, 
  HelpCircle,
  Inbox,
  FolderOpen,
  Plus
} from 'lucide-react';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
  onOpenQuickTransaction: () => void;
  onOpenAddFunds: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab, onOpenQuickTransaction, onOpenAddFunds }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [fundsLog, setFundsLog] = useState<FundsLog[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  // Statistics
  const [totalAllocated, setTotalAllocated] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [remainingFunds, setRemainingFunds] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  const fetchDashboardData = async () => {
    try {
      const cats = await db.getCategories();
      const exps = await db.getExpenses();
      const funds = await db.getFundsLog();

      setCategories(cats);
      setExpenses(exps);
      setFundsLog(funds);

      // Calculations
      const allocated = cats.reduce((sum, c) => sum + Number(c.allocated_amount), 0);
      const spent = exps.reduce((sum, e) => sum + Number(e.amount), 0);
      const remaining = allocated - spent;

      // Critical categories: negative balance OR low balance (< 20%)
      const critical = cats.filter(c => {
        if (c.current_balance < 0) return true;
        if (c.allocated_amount > 0) {
          return (c.current_balance / c.allocated_amount) * 100 < c.threshold;
        }
        return false;
      }).length;

      setTotalAllocated(allocated);
      setTotalExpenses(spent);
      setRemainingFunds(remaining);
      setCriticalCount(critical);

      // Prepare 30-day timeline chart data
      // Generate cumulative points
      const dataPoints = [];
      const now = new Date();
      
      // Seed days backwards
      for (let i = 29; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Cumulative totals up to this date
        const expSum = exps
          .filter(e => e.date <= dateStr)
          .reduce((sum, e) => sum + Number(e.amount), 0);
          
        const allocatedSum = cats
          .filter(c => c.created_at.split('T')[0] <= dateStr)
          .reduce((sum, c) => sum + Number(c.allocated_amount), 0);

        // Adjust allocated by funds additions/deductions up to this date
        const fundsSum = funds
          .filter(f => f.date <= dateStr)
          .reduce((sum, f) => sum + Number(f.amount), 0);

        dataPoints.push({
          dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          'Allocated Funds': Number((allocatedSum + fundsSum).toFixed(2)),
          'Expenses': Number(expSum.toFixed(2))
        });
      }

      setChartData(dataPoints);

    } catch (e) {
      console.error('Failed to load dashboard statistics:', e);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format currency
  const fmt = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(num);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white leading-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 mt-1">
            Real-time financial summary and critical alerts.
          </p>
        </div>
        
        {/* Upper quick action row */}
        <div className="flex items-center gap-3">
          <button 
            onClick={onOpenAddFunds}
            className="py-2.5 px-4 rounded-xl bg-[#0a0b16]/40 backdrop-blur-md border border-white/8 text-slate-200 font-semibold text-xs transition duration-150 hover:bg-white/5 hover:text-white hover:border-white/15 cursor-pointer"
          >
            Add Funds
          </button>
          
          <button 
            onClick={onOpenQuickTransaction}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.4)] border border-white/10 hover:border-white/20 transition duration-150 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Transaction</span>
          </button>
        </div>
      </div>

      {/* 2. ANALYTICS SUMMARY CARDS (4 Columns) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        
        {/* Card 1: Allocated Funds */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Allocated Funds
            </span>
            <div className="h-9 w-9 rounded-xl bg-indigo-950/60 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-none neon-text-purple">
              {fmt(totalAllocated)}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>+2.4% vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Expenses */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Total Expenses
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-950/60 border border-rose-500/20 flex items-center justify-center text-rose-455">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-none text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">
              {fmt(totalExpenses)}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
              <TrendingDown className="h-3 w-3" />
              <span>+5.1% vs last month</span>
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Funds */}
        <div className="glass-card p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Remaining Funds
            </span>
            <div className="h-9 w-9 rounded-xl bg-emerald-950/60 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Coins className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className="font-display font-extrabold text-white text-2xl sm:text-3xl leading-none text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
              {fmt(remainingFunds)}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
              <span>→ Stable runway</span>
            </div>
          </div>
        </div>

        {/* Card 4: Critical Limits Alerts */}
        <button 
          onClick={() => setCurrentTab('categories')}
          className={`p-5 rounded-2xl relative text-left overflow-hidden transition-all duration-250 group hover:shadow-md cursor-pointer ${
            criticalCount > 0 
              ? 'bg-rose-950/25 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.15)] hover:shadow-[0_0_20px_rgba(244,63,94,0.3)]' 
              : 'glass-card border-none'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Critical Categories
            </span>
            <div className={`h-9 w-9 rounded-xl flex items-center justify-center border ${
              criticalCount > 0 
                ? 'bg-rose-950 border-rose-500/40 text-rose-455 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.4)]' 
                : 'bg-slate-900 border-white/5 text-slate-500'
            }`}>
              <AlertOctagon className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 space-y-1">
            <h3 className={`font-display font-extrabold text-2xl sm:text-3xl leading-none ${criticalCount > 0 ? 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'text-white'}`}>
              {criticalCount}
            </h3>
            <div className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
              <span>Review over-budget limits →</span>
            </div>
          </div>
        </button>

      </div>

      {/* 3. SPLIT CHART AND LEDGER BLOCK */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Graph: Cumulative 30-Day Budget vs Expenses (66% space) */}
        <div className="xl:col-span-2 glass-card p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">
                Budget vs Expenses (30 Days)
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                Cumulative distributed assets versus actual operational losses.
              </p>
            </div>
          </div>
          
          <div className="h-80 w-full text-xs font-semibold">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {/* Theme Gradient Shaders */}
                  <linearGradient id="colorAllocated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.01}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dateLabel" tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 11, 24, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    borderRadius: '12px', 
                    border: '1px solid rgba(255, 255, 255, 0.12)', 
                    color: '#f8fafc',
                    fontFamily: 'Inter',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)'
                  }} 
                />
                <Legend iconType="circle" />
                <Area 
                  type="monotone" 
                  dataKey="Allocated Funds" 
                  stroke="#a855f7" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorAllocated)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Expenses" 
                  stroke="#06b6d4" 
                  strokeWidth={2.5}
                  fillOpacity={1} 
                  fill="url(#colorExpenses)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sidebar List: Recent Transactions Feed (33% space) */}
        <div className="glass-card p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/50 pb-4 mb-4">
            <div>
              <h3 className="font-display font-bold text-slate-800 dark:text-slate-100 text-lg">
                Recent Transactions
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                Real-time ledger events.
              </p>
            </div>
            
            <button 
              onClick={() => setCurrentTab('ledger')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              View All
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
            {expenses.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-2">
                <Inbox className="h-7 w-7 text-slate-600" />
                <p className="text-xs font-semibold">No recorded expenditures yet</p>
              </div>
            ) : (
              expenses.slice(0, 5).map(e => {
                const category = categories.find(c => c.id === e.category_id);
                // Assign a mockup status randomly/statically for high fidelity UI
                let status = 'Cleared';
                let statusBg = 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.15)]';
                
                if (e.amount > 5000) {
                  status = 'Flagged';
                  statusBg = 'bg-rose-950/40 border border-rose-500/30 text-rose-455 shadow-[0_0_8px_rgba(244,63,94,0.15)]';
                } else if (e.amount > 2000) {
                  status = 'Pending';
                  statusBg = 'bg-amber-950/40 border border-amber-500/30 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.15)]';
                }

                return (
                  <div 
                    key={e.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-[#121326]/30 border border-white/5 hover:bg-[#181a35]/40 hover:border-white/10 transition duration-150 text-left"
                  >
                    <div className="min-w-0 pr-2">
                      <h4 className="text-xs font-bold text-slate-200 truncate">
                        {e.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-500 font-semibold">{e.date}</span>
                        <span className="h-1 w-1 bg-white/10 rounded-full" />
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide drop-shadow-[0_0_4px_rgba(34,211,238,0.25)]">
                          {category ? category.name : 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-xs font-extrabold text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]">
                        -{fmt(e.amount)}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBg}`}>
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 4. HEALTH WATCHLIST GRID */}
      <div className="glass-card p-5 rounded-2xl">
        <div className="flex items-center gap-2 border-b border-white/8 pb-4 mb-4">
          <FolderOpen className="h-5 w-5 text-cyan-400 drop-shadow-[0_0_6px_rgba(34,211,238,0.4)]" />
          <h3 className="font-display font-bold text-white text-lg">
            Category Status Watchlist
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.slice(0, 3).map(c => {
            const pct = c.allocated_amount > 0 ? (c.spent_amount / c.allocated_amount) * 100 : 0;
            const isNegative = c.current_balance < 0;
            const isLow = c.current_balance >= 0 && c.allocated_amount > 0 && (c.current_balance / c.allocated_amount) * 100 < c.threshold;

            let statusText = 'Healthy';
            let colorClass = 'bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
            let pillClass = 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.2)]';
            let bgLight = 'bg-[#121326]/30 border border-white/5';

            if (isNegative) {
              statusText = 'Over Budget';
              colorClass = 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
              pillClass = 'bg-rose-950/45 border border-rose-500/40 text-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.3)]';
              bgLight = 'bg-rose-950/15 border border-rose-500/20';
            } else if (isLow) {
              statusText = 'Low Balance';
              colorClass = 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
              pillClass = 'bg-amber-950/45 border border-amber-500/40 text-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)]';
              bgLight = 'bg-amber-950/15 border border-amber-500/20';
            }

            return (
              <div 
                key={c.id}
                className={`p-4 rounded-xl text-left flex flex-col justify-between h-32 ${bgLight}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-white text-sm">
                    {c.name}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${pillClass}`}>
                    {statusText}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 font-semibold">Remaining</span>
                    <span className={`font-extrabold ${isNegative ? 'text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.3)]' : 'text-slate-200'}`}>
                      {fmt(c.current_balance)}
                    </span>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="h-1.5 w-full bg-slate-900 border border-white/5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${colorClass}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                    <span>{pct.toFixed(0)}% Utilized</span>
                    <span>Budget: {fmt(c.allocated_amount)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
export default Dashboard;
