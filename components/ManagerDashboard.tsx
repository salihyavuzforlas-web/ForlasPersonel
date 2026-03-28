
import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, Expense, ExpenseStatus, UserRole } from '../types';

type StatusFilter = ExpenseStatus | 'ALL';
import { STATUS_UI, CATEGORIES } from '../constants';
import { CheckCircle, Calendar, Filter, Edit2, CheckSquare, Square, Tag, RotateCcw, TrendingUp, ChevronDown, ChevronUp, Trash2, XCircle, Users, Percent } from 'lucide-react';
import ExpenseForm from './ExpenseForm';
import { mapExpense, supabase } from '../supabase';

interface ManagerDashboardProps {
  user: UserProfile;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ user }) => {
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [filterType, setFilterType] = useState<'month' | 'dateRange'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isAdmin = user.role === UserRole.YONETICI;

  const toNullableNumber = (value: any): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const loadExpenses = async () => {
    let queryBuilder = supabase.from('expenses').select('*');
    if (filterType === 'month') {
      queryBuilder = queryBuilder.eq('month_key', selectedMonth);
    } else {
      queryBuilder = queryBuilder.gte('expense_date', startDate).lte('expense_date', endDate);
    }

    const { data, error } = await queryBuilder.order('expense_date', { ascending: false });
    if (error) {
      console.error('Sorgu Hatası:', error);
      alert('Veri yüklenemedi.');
      return;
    }

    let rows = (data || []).map(mapExpense);
    if (statusFilter !== 'ALL') rows = rows.filter((e) => e.status === statusFilter);
    if (categoryFilter !== 'ALL') rows = rows.filter((e) => e.category === categoryFilter);
    setFilteredExpenses(rows);
    setSelectedIds([]);
  };

  useEffect(() => {
    loadExpenses();
  }, [filterType, selectedMonth, startDate, endDate, statusFilter, categoryFilter]);

  const handleAction = async (id: string, newStatus: ExpenseStatus) => {
    const reason = newStatus === ExpenseStatus.REJECTED ? prompt("Red Sebebi:") : null;
    if (newStatus === ExpenseStatus.REJECTED && !reason) return;
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
        status: newStatus,
        rejection_reason: reason || '',
        updated_at: Date.now(),
      })
        .eq('id', id);
      if (error) throw error;
      await loadExpenses();
    } catch (err) {
      alert("Hata: Durum güncellenemedi.");
    }
  };

  const handleDelete = async (expense: Expense) => {
    const expenseAge = Date.now() - (expense.createdAt || expense.updatedAt || 0);
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 saat
    
    if (expenseAge > oneDayInMs) {
      alert("Masraf 1 günden eski olduğu için silinemez.");
      return;
    }

    if (!confirm(`Bu masrafı silmek istediğinize emin misiniz?\n\nKategori: ${expense.category}\nTutar: ${expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}`)) {
      return;
    }

    try {
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
      if (error) throw error;
      await loadExpenses();
      alert("Masraf başarıyla silindi.");
    } catch (err: any) {
      console.error("Silme hatası:", err);
      if (err.code === 'permission-denied') {
        alert("Hata: Bu işlem için yetkiniz bulunmamaktadır. Firebase Security Rules'ı kontrol edin.");
      } else {
        alert("Hata: Masraf silinemedi. " + (err.message || ""));
      }
    }
  };

  const canDelete = (expense: Expense): boolean => {
    const expenseAge = Date.now() - (expense.createdAt || expense.updatedAt || 0);
    const oneDayInMs = 24 * 60 * 60 * 1000; // 24 saat
    return expenseAge <= oneDayInMs;
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const resetFilters = () => {
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
  };

  const total = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const advancedStats = useMemo(() => {
    const totalCount = filteredExpenses.length;
    const approvedCount = filteredExpenses.filter((item) => item.status === ExpenseStatus.APPROVED).length;
    const rejectedCount = filteredExpenses.filter((item) => item.status === ExpenseStatus.REJECTED).length;
    const pendingCount = filteredExpenses.filter((item) => item.status === ExpenseStatus.SUBMITTED).length;
    const uniquePersonnelCount = new Set(filteredExpenses.map((item) => item.userId)).size;
    const averageAmount = totalCount > 0 ? total / totalCount : 0;
    const approvalRate = totalCount > 0 ? (approvedCount / totalCount) * 100 : 0;

    const categoryTotals = CATEGORIES.map((category) => {
      const items = filteredExpenses.filter((expense) => expense.category === category);
      return {
        category,
        count: items.length,
        total: items.reduce((sum, expense) => sum + expense.amount, 0),
      };
    })
      .filter((entry) => entry.count > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalCount,
      approvedCount,
      rejectedCount,
      pendingCount,
      uniquePersonnelCount,
      averageAmount,
      approvalRate,
      categoryTotals,
    };
  }, [filteredExpenses, total]);

  // Tarihe göre grupla ve kategorilere göre sırala
  const groupedExpenses = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};
    
    filteredExpenses.forEach(expense => {
      const dateKey = expense.expenseDate;
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(expense);
    });

    // Her tarih grubunu kategorilere göre sırala
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => {
        const aIndex = CATEGORIES.indexOf(a.category);
        const bIndex = CATEGORIES.indexOf(b.category);
        // Kategori listesinde yoksa en sona
        if (aIndex === -1 && bIndex === -1) return 0;
        if (aIndex === -1) return 1;
        if (bIndex === -1) return -1;
        return aIndex - bIndex;
      });
    });

    // Tarihleri ters sırada (en yeni önce)
    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map(dateKey => ({
        date: dateKey,
        expenses: grouped[dateKey],
        total: grouped[dateKey].reduce((sum, exp) => sum + exp.amount, 0)
      }));
  }, [filteredExpenses]);

  // İlk yüklendiğinde tüm tarihleri açık yap
  useEffect(() => {
    if (filteredExpenses.length > 0 && expandedDates.size === 0) {
      const allDates = new Set(groupedExpenses.map(g => g.date));
      setExpandedDates(allDates);
    }
  }, [filteredExpenses.length, groupedExpenses]);

  const toggleDateGroup = (date: string) => {
    setExpandedDates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(date)) {
        newSet.delete(date);
      } else {
        newSet.add(date);
      }
      return newSet;
    });
  };

  const isExpanded = (date: string) => expandedDates.has(date);

  return (
    <div className="max-w-7xl mx-auto space-y-4 pb-12">
      {/* Mobile Stats Summary */}
      <div className="md:hidden bg-[#E31E24] p-5 rounded-3xl shadow-xl shadow-red-200 text-white flex justify-between items-center mb-6 overflow-hidden relative">
         <div className="relative z-10">
           <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Filtrelenmiş Toplam</p>
           <h2 className="text-2xl font-black mt-1">{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</h2>
           <p className="text-[9px] font-bold mt-1 bg-white/20 inline-block px-2 py-0.5 rounded-full uppercase">{filteredExpenses.length} Masraf Kaydı</p>
         </div>
         <div className="opacity-10 absolute -right-4 -bottom-4">
           <TrendingUp size={100} />
         </div>
      </div>

      {/* Advanced KPI Block */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Toplam Kayıt</p>
          <p className="text-lg font-black text-slate-900 mt-1">{advancedStats.totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Personel Sayısı</p>
          <p className="text-lg font-black text-slate-900 mt-1 flex items-center gap-1">
            <Users size={14} className="text-blue-600" /> {advancedStats.uniquePersonnelCount}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Ortalama Masraf</p>
          <p className="text-lg font-black text-slate-900 mt-1">
            {advancedStats.averageAmount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Onay Oranı</p>
          <p className="text-lg font-black text-green-700 mt-1 flex items-center gap-1">
            <Percent size={14} /> {advancedStats.approvalRate.toFixed(1)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Durum Dağılımı</p>
          <div className="space-y-2">
            <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Bekleyen</span><span>{advancedStats.pendingCount}</span></div>
            <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Onaylı</span><span>{advancedStats.approvedCount}</span></div>
            <div className="flex justify-between text-[10px] font-bold text-slate-600"><span>Red</span><span>{advancedStats.rejectedCount}</span></div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">En Yüksek Kategoriler</p>
          <div className="space-y-2">
            {advancedStats.categoryTotals.length === 0 ? (
              <p className="text-[10px] font-bold text-slate-400">Veri bulunamadı.</p>
            ) : (
              advancedStats.categoryTotals.map((entry) => (
                <div key={entry.category} className="flex justify-between text-[10px] font-bold text-slate-600">
                  <span>{entry.category}</span>
                  <span>{entry.total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Filtre Paneli */}
      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-xl p-3 shadow-sm sticky top-0 z-20 space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-slate-50 pb-2 md:pb-0 md:border-0">
             <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-red-50 text-red-600 rounded-lg">
                    <Calendar size={14} />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setFilterType('month')}
                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all ${
                        filterType === 'month' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      Ay
                    </button>
                    <button
                      onClick={() => setFilterType('dateRange')}
                      className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase transition-all whitespace-nowrap ${
                        filterType === 'dateRange' 
                          ? 'bg-red-600 text-white' 
                          : 'bg-white text-slate-400 border border-slate-200'
                      }`}
                    >
                      Tarih Aralığı
                    </button>
                  </div>
                </div>
                
                {filterType === 'month' ? (
                  <input 
                    type="month" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)} 
                    className="text-xs font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1 uppercase outline-none cursor-pointer"
                  />
                ) : (
                  <div className="flex items-center gap-2">
                    <input 
                      type="date" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      className="text-[10px] font-black text-slate-800 bg-white outline-none border border-slate-200 rounded px-2 py-1.5"
                    />
                    <span className="text-[9px] font-black text-slate-400">-</span>
                    <input 
                      type="date" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      className="text-[10px] font-black text-slate-800 bg-white outline-none border border-slate-200 rounded px-2 py-1.5"
                    />
                  </div>
                )}
             </div>
             {(statusFilter !== 'ALL' || categoryFilter !== 'ALL') && (
               <button onClick={resetFilters} className="p-2 text-slate-400 hover:text-red-600 transition-colors flex items-center gap-1" title="Sıfırla">
                 <span className="text-[9px] font-black uppercase">Sıfırla</span>
                 <RotateCcw size={12} />
               </button>
             )}
          </div>

          <div className="space-y-3">
             {/* Durum Filtresi - Scrollable */}
             <div className="flex items-center gap-2">
                <Filter size={12} className="text-slate-400 shrink-0" />
                <div className="flex gap-1 overflow-x-auto no-scrollbar pb-1 w-full">
                  {(['ALL', ExpenseStatus.SUBMITTED, ExpenseStatus.APPROVED, ExpenseStatus.REJECTED] as StatusFilter[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter transition-all whitespace-nowrap border ${
                        statusFilter === status 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                        : 'bg-white text-slate-400 border-slate-100'
                      }`}
                    >
                      {status === 'ALL' ? 'Tümü' : status === ExpenseStatus.SUBMITTED ? 'Bekleyen' : status === ExpenseStatus.APPROVED ? 'Onaylı' : 'Red'}
                    </button>
                  ))}
                </div>
             </div>

             {/* Kategori Filtresi - Scrollable */}
             <div className="flex items-center gap-2">
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
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-xl animate-in slide-in-from-top-2">
            <span className="text-[10px] font-black text-slate-600 uppercase mx-2">{selectedIds.length} Seçildi</span>
            <button onClick={() => setSelectedIds([])} className="text-[9px] font-black text-slate-400 hover:text-slate-600 ml-auto px-2 uppercase">İptal</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl md:rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="hidden md:flex p-3 border-b border-slate-100 bg-slate-50/50 items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yönetim Tablosu</p>
            <div className="text-right">
               <p className="text-[12px] font-black text-red-600 leading-none">{total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
            </div>
        </div>
        
        {/* Responsive List / Table */}
        <div className="w-full">
          <table className="hidden md:table w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                <th className="px-5 py-3 w-10">
                  <button onClick={toggleSelectAll} className="text-slate-300 hover:text-red-600 transition-colors">
                    {selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                </th>
                <th className="px-4 py-3">Personel</th>
                <th className="px-4 py-3">Kategori</th>
                <th className="px-4 py-3 text-right">Tutar</th>
                <th className="px-4 py-3">Durum</th>
                <th className="px-4 py-3 text-right">Aksiyon</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {groupedExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Masraf Kaydı Bulunamadı</p>
                      <p className="text-[9px] text-slate-300 font-bold">Seçili filtreler için herhangi bir masraf bulunmamaktadır.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedExpenses.map(({ date, expenses: dayExpenses, total: dayTotal }) => {
                  const expanded = isExpanded(date);
                  return (
                    <React.Fragment key={date}>
                      <tr 
                        className="bg-slate-100/50 cursor-pointer hover:bg-slate-200/50 transition-colors"
                        onClick={() => toggleDateGroup(date)}
                      >
                        <td className="px-5 py-3"></td>
                        <td colSpan={4} className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {expanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                              <span className="text-[11px] font-black text-slate-900">
                                {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </span>
                            </div>
                            <span className="text-[11px] font-black text-slate-900">
                              TOPLAM: {dayTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3"></td>
                      </tr>
                      {expanded && dayExpenses.map(expense => {
                        const isSelected = selectedIds.includes(expense.id);
                        return (
                          <tr 
                            key={expense.id} 
                            className={`transition-colors cursor-pointer ${isSelected ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                            onClick={() => toggleSelect(expense.id)}
                          >
                            <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                              <button onClick={() => toggleSelect(expense.id)} className={`${isSelected ? 'text-red-600' : 'text-slate-200 hover:text-slate-400'}`}>
                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                            </td>
                            <td className="px-4 py-4 font-bold text-xs uppercase">{expense.userName}</td>
                            <td className="px-4 py-4">
                              <div className="text-[10px] font-black uppercase text-slate-700">{expense.category}</div>
                            </td>
                            <td className="px-4 py-4 text-right font-black text-xs">{expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase border ${STATUS_UI[expense.status].color} border-current/10`}>
                                {STATUS_UI[expense.status].label}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                               <div className="flex justify-end gap-1 items-center">
                                  {expense.status === ExpenseStatus.SUBMITTED && (
                                    <>
                                      <button onClick={() => handleAction(expense.id, ExpenseStatus.APPROVED)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Onayla"><CheckCircle size={15}/></button>
                                      <button onClick={() => handleAction(expense.id, ExpenseStatus.REJECTED)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reddet"><XCircle size={15}/></button>
                                    </>
                                  )}
                                  {isAdmin && (
                                    <>
                                      <button onClick={() => { setEditingExpense(expense); setShowForm(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={15}/></button>
                                      {canDelete(expense) ? (
                                        <button onClick={() => handleDelete(expense)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Sil"><Trash2 size={15}/></button>
                                      ) : (
                                        <button disabled className="p-1.5 text-slate-300 cursor-not-allowed" title="1 günden eski masraflar silinemez"><Trash2 size={15}/></button>
                                      )}
                                    </>
                                  )}
                                </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Mobile Card View (Integrated directly to use Manager Actions) */}
          <div className="md:hidden p-3">
            {groupedExpenses.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl py-10 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Kayıt Bulunamadı</div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                {groupedExpenses.map(({ date, expenses: dayExpenses, total: dayTotal }, groupIndex) => {
                  const expanded = isExpanded(date);
                  return (
                    <div key={date}>
                      {/* Tarih Başlığı ve Toplam */}
                      <div 
                        className={`bg-slate-100 px-4 py-3 border-b border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors ${groupIndex === 0 ? '' : 'border-t'}`}
                        onClick={() => toggleDateGroup(date)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {expanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                            <span className="text-[11px] font-black text-slate-900">
                              {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          </div>
                          <span className="text-[11px] font-black text-slate-900">
                            TOPLAM: {dayTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                          </span>
                        </div>
                      </div>
                      
                      {/* O Günün Masrafları */}
                      {expanded && dayExpenses.map((expense, expenseIndex) => {
                      const isLastInGroup = expenseIndex === dayExpenses.length - 1;
                      const isLastGroup = groupIndex === groupedExpenses.length - 1;
                      return (
                        <div 
                          key={expense.id} 
                          className={`bg-white p-4 ${!isLastInGroup || !isLastGroup ? 'border-b border-slate-100' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-black text-white uppercase">
                                {expense.userName.charAt(0)}
                              </div>
                              <div>
                                <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight leading-none">{expense.userName}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{expense.category}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-slate-900">{expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</p>
                              <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current/10 ${STATUS_UI[expense.status].color}`}>
                                {STATUS_UI[expense.status].label}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end border-t border-slate-100 pt-3">
                            {expense.status === ExpenseStatus.SUBMITTED && (
                              <>
                                <button 
                                  onClick={() => handleAction(expense.id, ExpenseStatus.APPROVED)} 
                                  className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-green-100 flex items-center justify-center gap-1.5"
                                >
                                  <CheckCircle size={12}/> ONAYLA
                                </button>
                                <button 
                                  onClick={() => handleAction(expense.id, ExpenseStatus.REJECTED)} 
                                  className="flex-1 py-2.5 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-amber-100 flex items-center justify-center gap-1.5"
                                >
                                  <XCircle size={12}/> REDDET
                                </button>
                              </>
                            )}
                            {isAdmin && (
                              <>
                                <button 
                                  onClick={() => { setEditingExpense(expense); setShowForm(true); }}
                                  className="flex-1 py-2.5 bg-white border border-blue-100 text-blue-600 rounded-xl text-[9px] font-black uppercase flex items-center justify-center gap-1.5 shadow-sm"
                                >
                                  <Edit2 size={12}/> DÜZENLE
                                </button>
                                {canDelete(expense) ? (
                                  <button 
                                    onClick={() => handleDelete(expense)}
                                    className="py-2.5 px-4 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase shadow-lg shadow-red-100 flex items-center justify-center gap-1.5"
                                  >
                                    <Trash2 size={12}/> SİL
                                  </button>
                                ) : (
                                  <button 
                                    disabled
                                    className="py-2.5 px-4 bg-slate-100 text-slate-300 rounded-xl text-[9px] font-black uppercase cursor-not-allowed flex items-center justify-center gap-1.5"
                                    title="1 günden eski masraflar silinemez"
                                  >
                                    <Trash2 size={12}/> SİL
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <ExpenseForm 
          onSubmit={async (formData) => {
            if (!editingExpense) return;
            try {
              const payload: any = {
                ...formData,
                amount: Number(formData.amount),
                monthKey: formData.expenseDate.slice(0, 7),
                updatedAt: Date.now(),
              };
              if (formData.liter) payload.liter = Number(formData.liter);
              if (formData.literPrice) payload.literPrice = Number(formData.literPrice);
              const { error } = await supabase
                .from('expenses')
                .update({
                  amount: payload.amount,
                  category: payload.category,
                  expense_date: payload.expenseDate,
                  description: payload.description || '',
                  route: payload.route || '',
                  plate_number: payload.plateNumber || null,
                  liter: toNullableNumber(formData.liter),
                  liter_price: toNullableNumber(formData.literPrice),
                  receipt_data: payload.receiptData || null,
                  receipt_type: payload.receiptType || null,
                  month_key: payload.monthKey,
                  updated_at: payload.updatedAt,
                })
                .eq('id', editingExpense.id);
              if (error) throw error;
              await loadExpenses();
              setShowForm(false);
              setEditingExpense(null);
            } catch (err) { alert("Güncelleme hatası."); }
          }} 
          onClose={() => { setShowForm(false); setEditingExpense(null); }} 
          initialData={editingExpense} 
        />
      )}
    </div>
  );
};

export default ManagerDashboard;
