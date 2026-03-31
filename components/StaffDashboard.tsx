
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UserProfile,
  Expense,
  ExpenseStatus,
  PersonnelTarget,
  PersonnelTargetType,
  RoutePlan,
} from '../types.ts';
import { Plus, Wallet, AlertCircle, CheckCircle, Clock, Save, Tag, Target, TrendingUp } from 'lucide-react';
import { CATEGORIES, STATUS_UI } from '../constants.tsx';
import ExpenseForm from './ExpenseForm.tsx';
import ExpenseList from './ExpenseList.tsx';
import SalesTopPerformersCard from './SalesTopPerformersCard.tsx';
import { createRowId, mapExpense, mapPersonnelTarget, mapRoutePlan, supabase } from '../supabase.ts';

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
  const [targets, setTargets] = useState<PersonnelTarget[]>([]);
  const [quickExpense, setQuickExpense] = useState({
    expenseDate: new Date().toISOString().slice(0, 10),
    category: CATEGORIES[0] || 'Diğer',
    amount: '',
    description: '',
  });
  const quickAmountRef = useRef<HTMLInputElement | null>(null);

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

  const loadTargets = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error: queryError } = await supabase
      .from('personnel_targets')
      .select('*')
      .eq('user_id', user.uid)
      .eq('is_active', true)
      .gte('end_date', today)
      .order('end_date', { ascending: true });
    if (queryError) {
      console.error('Target load error:', queryError);
      return;
    }
    setTargets((data || []).map(mapPersonnelTarget));
  };

  useEffect(() => {
    loadExpenses();
  }, [user.uid, selectedMonth]);

  useEffect(() => {
    loadAssignedRoutes();
  }, [user.uid]);

  useEffect(() => {
    loadTargets();
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

  const handleQuickAddExpense = async () => {
    const amount = Number(quickExpense.amount);
    if (!quickExpense.expenseDate || !quickExpense.category) {
      alert('Tarih ve kategori zorunludur.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      alert('Tutar 0 dan büyük olmalıdır.');
      return;
    }

    try {
      const now = Date.now();
      const { error: insertError } = await supabase.from('expenses').insert({
        id: createRowId(),
        user_id: user.uid,
        user_name: user.displayName,
        amount,
        currency: 'TRY',
        category: quickExpense.category,
        description: quickExpense.description || '',
        expense_date: quickExpense.expenseDate,
        month_key: quickExpense.expenseDate.slice(0, 7),
        status: ExpenseStatus.SUBMITTED,
        route: '',
        created_at: now,
        updated_at: now,
      });
      if (insertError) throw insertError;
      setQuickExpense((prev) => ({ ...prev, amount: '', description: '' }));
      await loadExpenses();
      quickAmountRef.current?.focus();
    } catch (err: any) {
      alert(`Hızlı masraf eklenemedi: ${err?.message || ''}`);
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

      <SalesTopPerformersCard monthKey={selectedMonth} />

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/60">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Hızlı Masraf Girişi (Excel Tarzı)</p>
        </div>
        <div className="p-3 grid grid-cols-1 md:grid-cols-5 gap-2">
          <input
            type="date"
            value={quickExpense.expenseDate}
            onChange={(e) => setQuickExpense((prev) => ({ ...prev, expenseDate: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <select
            value={quickExpense.category}
            onChange={(e) => setQuickExpense((prev) => ({ ...prev, category: e.target.value }))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          >
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <input
            ref={quickAmountRef}
            type="number"
            min="0"
            step="0.01"
            value={quickExpense.amount}
            onChange={(e) => setQuickExpense((prev) => ({ ...prev, amount: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleQuickAddExpense();
              }
            }}
            placeholder="Tutar (TL)"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            value={quickExpense.description}
            onChange={(e) => setQuickExpense((prev) => ({ ...prev, description: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleQuickAddExpense();
              }
            }}
            placeholder="Açıklama (opsiyonel)"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={() => void handleQuickAddExpense()}
            className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
          >
            <Save size={14} className="inline mr-2" />
            Hızlı Ekle
          </button>
        </div>
      </div>

      {targets.length > 0 && (
        <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-emerald-100 bg-emerald-50/70">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-emerald-600" />
              <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Personel Hedeflerim</p>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {targets.map((target) => {
              const progress =
                target.targetValue > 0 && target.currentValue != null
                  ? Math.min(100, (target.currentValue / target.targetValue) * 100)
                  : 0;
              return (
                <div key={target.id} className="p-4">
                  <p className="text-[11px] font-black text-slate-900 uppercase">{target.title}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                    {target.targetType === PersonnelTargetType.SALES
                      ? 'Satış Hedefi'
                      : target.targetType === PersonnelTargetType.COLLECTION
                      ? 'Tahsilat Hedefi'
                      : `Ürün Adet Hedefi${target.productName ? ` - ${target.productName}` : ''}`}
                  </p>
                  {target.description && (
                    <p className="text-[10px] text-slate-500 mt-1 whitespace-pre-wrap">{target.description}</p>
                  )}
                  <p className="text-[10px] text-slate-600 mt-1">
                    Hedef: {target.targetValue} {target.metricUnit}
                    {target.currentValue != null ? ` | Gerçekleşen: ${target.currentValue} ${target.metricUnit}` : ''}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Bitiş Tarihi: {target.endDate}
                  </p>
                  <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
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
