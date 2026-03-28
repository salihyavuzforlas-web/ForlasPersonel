
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Expense, ExpenseStatus, RoutePlan } from '../types.ts';
import { Plus, Wallet, AlertCircle, CheckCircle, Clock, Tag, TrendingUp } from 'lucide-react';
import { CATEGORIES, STATUS_UI } from '../constants.tsx';
import ExpenseForm from './ExpenseForm.tsx';
import ExpenseList from './ExpenseList.tsx';
import { createRowId, mapExpense, mapRoutePlan, supabase } from '../supabase.ts';

interface StaffDashboardProps {
  user: UserProfile;
}

const StaffDashboard: React.FC<StaffDashboardProps> = ({ user }) => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [assignedRoutes, setAssignedRoutes] = useState<RoutePlan[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    const { data, error: queryError } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', user.uid)
      .eq('month_key', selectedMonth)
      .order('expense_date', { ascending: false });

    if (queryError) {
      console.error('Supabase Error:', queryError);
      setError('Veri yüklenirken bir hata oluştu.');
      return;
    }
    setExpenses((data || []).map(mapExpense));
    setError(null);
  };

  const loadAssignedRoutes = async () => {
    const { data, error: queryError } = await supabase
      .from('route_plans')
      .select('*')
      .order('route_date', { ascending: false });

    if (queryError) {
      console.error('Route load error:', queryError);
      return;
    }

    const allRoutes = (data || []).map(mapRoutePlan);
    const userRoutes = allRoutes.filter(
      (routePlan) =>
        routePlan.assignedUserIds.includes(user.uid) || routePlan.assignedUserId === user.uid
    );
    setAssignedRoutes(userRoutes);
  };

  useEffect(() => {
    loadExpenses();
  }, [user.uid, selectedMonth]);

  useEffect(() => {
    loadAssignedRoutes();
  }, [user.uid]);

  useEffect(() => {
    let data = [...expenses];
    if (categoryFilter !== 'ALL') {
      data = data.filter(e => e.category === categoryFilter);
    }
    setFilteredExpenses(data);
  }, [expenses, categoryFilter]);

  const toNullableNumber = (value: any): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const handleSubmitExpense = async (formData: any) => {
    try {
      const expensePayload: any = {
        ...formData,
        amount: Number(formData.amount),
        monthKey: formData.expenseDate.slice(0, 7),
        updatedAt: Date.now(),
      };

      if (formData.liter) expensePayload.liter = Number(formData.liter);
      if (formData.literPrice) expensePayload.literPrice = Number(formData.literPrice);

      if (editingExpense) {
        if (editingExpense.status === ExpenseStatus.APPROVED) return;
        const { error: updateError } = await supabase
          .from('expenses')
          .update({
            amount: expensePayload.amount,
            category: expensePayload.category,
            expense_date: expensePayload.expenseDate,
            description: expensePayload.description || '',
            route: expensePayload.route || '',
            plate_number: expensePayload.plateNumber || null,
            liter: toNullableNumber(formData.liter),
            liter_price: toNullableNumber(formData.literPrice),
            receipt_data: expensePayload.receiptData || null,
            receipt_type: expensePayload.receiptType || null,
            month_key: expensePayload.monthKey,
            updated_at: expensePayload.updatedAt,
          })
          .eq('id', editingExpense.id);
        if (updateError) throw updateError;
      } else {
        const rowId = createRowId();
        const createPayload: any = {
          ...expensePayload,
          userId: user.uid,
          userName: user.displayName,
          currency: 'TRY',
          status: ExpenseStatus.SUBMITTED,
          createdAt: Date.now(),
        };
        const { error: insertError } = await supabase.from('expenses').insert({
          id: rowId,
          user_id: createPayload.userId,
          user_name: createPayload.userName,
          amount: createPayload.amount,
          currency: createPayload.currency,
          category: createPayload.category,
          description: createPayload.description || '',
          expense_date: createPayload.expenseDate,
          month_key: createPayload.monthKey,
          status: createPayload.status,
          route: createPayload.route || '',
          plate_number: createPayload.plateNumber || null,
          liter: toNullableNumber(formData.liter),
          liter_price: toNullableNumber(formData.literPrice),
          receipt_data: createPayload.receiptData || null,
          receipt_type: createPayload.receiptType || null,
          created_at: createPayload.createdAt,
          updated_at: createPayload.updatedAt,
        });
        if (insertError) throw insertError;
      }
      await loadExpenses();
      setShowForm(false);
      setEditingExpense(null);
    } catch (err: any) {
      console.error('Expense submit error:', err);
      if (err?.code === 'permission-denied') {
        alert("Yetki hatası: Supabase policy ayarlarını kontrol edin.");
        return;
      }
      if (err?.message?.includes('Unsupported field value: undefined')) {
        alert('Form verisinde eksik bir alan algılandı. Lütfen tekrar deneyin.');
        return;
      }
      alert(`Hata: ${err?.message || 'Masraf kaydedilemedi.'}`);
    }
  };

  const currentTotal = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Seçili ayın Türkçe formatını oluştur
  const monthLabel = new Date(selectedMonth + '-01').toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) + ' Masraf Toplamı';

  // İstatistikler
  const stats = useMemo(() => {
    const byStatus = {
      [ExpenseStatus.SUBMITTED]: expenses.filter(e => e.status === ExpenseStatus.SUBMITTED),
      [ExpenseStatus.APPROVED]: expenses.filter(e => e.status === ExpenseStatus.APPROVED),
      [ExpenseStatus.REJECTED]: expenses.filter(e => e.status === ExpenseStatus.REJECTED),
    };

    const byCategory = CATEGORIES.map(cat => ({
      category: cat,
      expenses: expenses.filter(e => e.category === cat),
      total: expenses.filter(e => e.category === cat).reduce((sum, e) => sum + e.amount, 0),
      count: expenses.filter(e => e.category === cat).length
    })).filter(item => item.count > 0);

    return {
      byStatus,
      byCategory,
      pendingCount: byStatus[ExpenseStatus.SUBMITTED].length,
      approvedCount: byStatus[ExpenseStatus.APPROVED].length,
      rejectedCount: byStatus[ExpenseStatus.REJECTED].length,
      pendingTotal: byStatus[ExpenseStatus.SUBMITTED].reduce((sum, e) => sum + e.amount, 0),
      approvedTotal: byStatus[ExpenseStatus.APPROVED].reduce((sum, e) => sum + e.amount, 0),
    };
  }, [expenses]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Masraflarım</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase">Detaylı Harcama Takibi</p>
        </div>
        <button
          onClick={() => { setEditingExpense(null); setShowForm(true); }}
          className="bg-red-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 shadow-xl"
        >
          <Plus size={14} className="inline mr-2" /> Yeni Masraf
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-3 text-[10px] font-bold flex items-center gap-2 rounded-lg">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><Wallet size={16}/></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase truncate">{monthTitle}</p>
            <p className="text-sm font-black text-slate-800 truncate">{currentTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5">{filteredExpenses.length} Masraf</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl"><Clock size={16}/></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase">Bekleyen</p>
            <p className="text-sm font-black text-slate-800 truncate">{stats.pendingTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5">{stats.pendingCount} Adet</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={16}/></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase">Onaylı</p>
            <p className="text-sm font-black text-slate-800 truncate">{stats.approvedTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5">{stats.approvedCount} Adet</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><TrendingUp size={16}/></div>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-black text-slate-400 uppercase">Kategori Sayısı</p>
            <p className="text-sm font-black text-slate-800">{stats.byCategory.length}</p>
            <p className="text-[8px] font-bold text-slate-400 mt-0.5">Aktif Kategori</p>
          </div>
        </div>
      </div>

      {/* Kategori Özetleri */}
      {stats.byCategory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-slate-400" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kategori Bazlı Özet</p>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {stats.byCategory.map(({ category, total, count }) => (
                <div key={category} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-600 uppercase mb-1 truncate">{category}</p>
                  <p className="text-xs font-black text-slate-900">{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                  <p className="text-[8px] font-bold text-slate-400 mt-0.5">{count} Adet</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Masraf Listesi */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
            />
            {categoryFilter !== 'ALL' && (
              <button
                onClick={() => setCategoryFilter('ALL')}
                className="text-[9px] font-black text-slate-400 hover:text-red-600 uppercase transition-colors"
              >
                Filtreyi Temizle
              </button>
            )}
          </div>

          {/* Kategori Filtreleri */}
          <div className="flex items-center gap-2 flex-wrap">
            <Tag size={12} className="text-slate-400 shrink-0" />
            <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 w-full">
              <button
                onClick={() => setCategoryFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap border ${
                  categoryFilter === 'ALL' 
                    ? 'bg-red-600 text-white border-red-600' 
                    : 'bg-white text-slate-400 border-slate-100'
                }`}
              >
                Tüm Kategoriler
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap border ${
                    categoryFilter === cat 
                      ? 'bg-red-600 text-white border-red-600' 
                      : 'bg-white text-slate-400 border-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        <ExpenseList 
          expenses={filteredExpenses} 
          onEdit={(e) => { setEditingExpense(e); setShowForm(true); }} 
        />
      </div>

      {showForm && (
        <ExpenseForm 
          onSubmit={handleSubmitExpense} 
          onClose={() => { setShowForm(false); setEditingExpense(null); }} 
          initialData={editingExpense} 
          routeOptions={assignedRoutes}
        />
      )}
    </div>
  );
};

export default StaffDashboard;
