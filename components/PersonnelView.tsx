
import React, { useState, useEffect } from 'react';
import {
  PersonnelSale,
  PersonnelTarget,
  PersonnelTargetType,
  UserProfile,
  Expense,
  UserRole,
  ExpenseStatus,
  RoutePlan,
  RoutePlanStatus,
} from '../types';
import { CATEGORIES, STATUS_UI } from '../constants';
import {
  Search,
  ArrowLeft,
  Calendar,
  Tag,
  RotateCcw,
  ChevronRight,
  Trash2,
  Route,
  Plus,
  Edit2,
  Save,
  Target,
  X,
  Download,
} from 'lucide-react';
import ExpenseList from './ExpenseList';
import ExpenseForm from './ExpenseForm';
import {
  createRowId,
  mapExpense,
  mapPersonnelSale,
  mapPersonnelTarget,
  mapRoutePlan,
  mapUserProfile,
  supabase,
} from '../supabase';
import { calculateDistanceKm, getCityByName, TURKEY_CITIES } from '../data/turkeyCities';

interface PersonnelViewProps {
  currentUser: UserProfile;
}

const PersonnelView: React.FC<PersonnelViewProps> = ({ currentUser }) => {
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<UserProfile | null>(null);
  const [staffExpenses, setStaffExpenses] = useState<Expense[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [expenseFilterType, setExpenseFilterType] = useState<'month' | 'dateRange'>('month');
  const [expenseStartDate, setExpenseStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [expenseEndDate, setExpenseEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [staffSales, setStaffSales] = useState<PersonnelSale[]>([]);
  const [staffTargets, setStaffTargets] = useState<PersonnelTarget[]>([]);
  const [staffRoutes, setStaffRoutes] = useState<RoutePlan[]>([]);
  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RoutePlan | null>(null);
  const [routeFilterType, setRouteFilterType] = useState<'month' | 'dateRange'>('month');
  const [routeStartDate, setRouteStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeEndDate, setRouteEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [routeForm, setRouteForm] = useState({
    title: '',
    routeDate: new Date().toISOString().slice(0, 10),
    startLocation: '',
    endLocation: '',
    stops: '',
    durationDays: 1,
    status: RoutePlanStatus.PLANNED,
    notes: '',
  });
  const isAdmin = currentUser.role === UserRole.YONETICI;
  const isFinanceManager = currentUser.role === UserRole.FINANS_MUDURU;
  const isRouteManager = currentUser.role === UserRole.SEVKIYAT_MUDURU;
  const canReviewExpenses = isAdmin || isFinanceManager;
  const cityOptions = TURKEY_CITIES.map((city) => city.name);

  const toNullableNumber = (value: any): number | null => {
    if (value === '' || value === null || value === undefined) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const loadPersonnel = async () => {
    const { data, error } = await supabase.from('users').select('*').eq('role', UserRole.PERSONEL);
    if (error) {
      console.error('Personnel load error:', error);
      return;
    }
    setPersonnel((data || []).map(mapUserProfile));
  };

  useEffect(() => {
    loadPersonnel();
  }, []);

  const loadStaffExpenses = async () => {
    if (!selectedStaff) return;
    let queryBuilder = supabase.from('expenses').select('*').eq('user_id', selectedStaff.uid);
    if (expenseFilterType === 'month') {
      queryBuilder = queryBuilder.eq('month_key', selectedMonth);
    } else {
      queryBuilder = queryBuilder.gte('expense_date', expenseStartDate).lte('expense_date', expenseEndDate);
    }
    const { data, error } = await queryBuilder.order('expense_date', { ascending: false });
    if (error) {
      console.error('Expense load error:', error);
      alert('Masraflar yüklenemedi.');
      return;
    }
    let mapped = (data || []).map(mapExpense);
    if (categoryFilter !== 'ALL') mapped = mapped.filter((e) => e.category === categoryFilter);
    setStaffExpenses(mapped);
  };

  const loadStaffRoutes = async () => {
    if (!selectedStaff) return;
    let queryBuilder = supabase.from('route_plans').select('*');
    if (routeFilterType === 'month') {
      queryBuilder = queryBuilder
        .gte('route_date', `${selectedMonth}-01`)
        .lte('route_date', `${selectedMonth}-31`);
    } else {
      queryBuilder = queryBuilder.gte('route_date', routeStartDate).lte('route_date', routeEndDate);
    }
    const { data, error } = await queryBuilder.order('route_date', { ascending: false });
    if (error) {
      console.error('Route load error:', error);
      alert('Rutlar yüklenemedi.');
      return;
    }
    const allRoutes = (data || []).map(mapRoutePlan);
    const filtered = allRoutes.filter(
      (routePlan) =>
        routePlan.assignedUserIds.includes(selectedStaff.uid) || routePlan.assignedUserId === selectedStaff.uid
    );
    setStaffRoutes(filtered);
  };

  const loadStaffSales = async () => {
    if (!selectedStaff) return;
    const { data, error } = await supabase
      .from('personnel_sales')
      .select('*')
      .eq('user_id', selectedStaff.uid)
      .gte('sale_date', `${selectedMonth}-01`)
      .lte('sale_date', `${selectedMonth}-31`)
      .order('sale_date', { ascending: true });
    if (error) {
      console.error('Sales load error:', error);
      return;
    }
    setStaffSales((data || []).map(mapPersonnelSale));
  };

  const loadStaffTargets = async () => {
    if (!selectedStaff) return;
    const { data, error } = await supabase
      .from('personnel_targets')
      .select('*')
      .eq('user_id', selectedStaff.uid)
      .eq('is_active', true)
      .order('end_date', { ascending: true });
    if (error) {
      console.error('Target load error:', error);
      return;
    }
    setStaffTargets((data || []).map(mapPersonnelTarget));
  };

  useEffect(() => {
    if (isRouteManager) {
      loadStaffRoutes();
    } else {
      loadStaffExpenses();
      loadStaffSales();
      loadStaffTargets();
    }
  }, [
    selectedStaff,
    selectedMonth,
    categoryFilter,
    expenseFilterType,
    expenseStartDate,
    expenseEndDate,
    isRouteManager,
    routeFilterType,
    routeStartDate,
    routeEndDate,
  ]);

  const handleUpdateExpense = async (formData: any) => {
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
      await loadStaffExpenses();
      setEditingExpense(null);
      alert("Başarıyla güncellendi.");
    } catch (err) {
      alert("Hata: Güncelleme başarısız.");
    }
  };

  const handleExpenseStatus = async (expense: Expense, newStatus: ExpenseStatus) => {
    if (!canReviewExpenses) return;
    const reason = newStatus === ExpenseStatus.REJECTED ? prompt('Red sebebini yazın:') : null;
    if (newStatus === ExpenseStatus.REJECTED && !reason) return;
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          status: newStatus,
          rejection_reason: reason || '',
          updated_at: Date.now(),
        })
        .eq('id', expense.id);
      if (error) throw error;
      await loadStaffExpenses();
    } catch (err: any) {
      alert(`Masraf durumu güncellenemedi: ${err?.message || ''}`);
    }
  };

  const escapeCsvValue = (value: string | number | undefined | null): string => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const handleExportStaffExpenses = () => {
    if (!selectedStaff) return;
    if (staffExpenses.length === 0) {
      alert('Dışa aktarılacak masraf bulunamadı.');
      return;
    }
    const sortedExpenses = [...staffExpenses].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
    const headers = [
      'Personel',
      'E-Posta',
      'Tarih',
      'Kategori',
      'Açıklama',
      'Tutar (TRY)',
      'Durum',
      'Red Sebebi',
      'Belge',
    ];
    const rows = sortedExpenses.map((expense) =>
      [
        escapeCsvValue(selectedStaff.displayName),
        escapeCsvValue(selectedStaff.email),
        escapeCsvValue(expense.expenseDate),
        escapeCsvValue(expense.category),
        escapeCsvValue(expense.description || ''),
        escapeCsvValue(Number(expense.amount || 0).toFixed(2)),
        escapeCsvValue(STATUS_UI[expense.status].label),
        escapeCsvValue(expense.rejectionReason || ''),
        escapeCsvValue(expense.receiptData ? 'Var' : 'Yok'),
      ].join(';')
    );
    const csvContent = `\uFEFF${headers.map((header) => escapeCsvValue(header)).join(';')}\n${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const periodLabel =
      expenseFilterType === 'month' ? selectedMonth : `${expenseStartDate}_${expenseEndDate}`;
    const safeName = selectedStaff.displayName.replace(/\s+/g, '-').toLowerCase();
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeName}-masraf-raporu-${periodLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const filteredPersonnel = personnel.filter(p => 
    p.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeletePersonnel = async (person: UserProfile) => {
    if (!isAdmin) return;
    const confirmed = confirm(
      `${person.displayName} kullanıcısını personel listesinden kaldırmak istediğinize emin misiniz?`
    );
    if (!confirmed) return;

    try {
      const { error } = await supabase.from('users').delete().eq('uid', person.uid);
      if (error) throw error;
      await loadPersonnel();
      if (selectedStaff?.uid === person.uid) {
        setSelectedStaff(null);
      }
      alert('Personel kaydı kaldırıldı.');
    } catch (error: any) {
      console.error('Personnel delete error:', error);
      if (error?.code === 'permission-denied') {
        alert("Yetki hatası: Yönetici yetkisi ve Supabase policy ayarı gerekli.");
      } else {
        alert('Personel kaldırılırken bir hata oluştu.');
      }
    }
  };

  const openCreateRouteForm = () => {
    setEditingRoute(null);
    setRouteForm({
      title: '',
      routeDate: new Date().toISOString().slice(0, 10),
      startLocation: '',
      endLocation: '',
      stops: '',
      durationDays: 1,
      status: RoutePlanStatus.PLANNED,
      notes: '',
    });
    setShowRouteForm(true);
  };

  const localYmd = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekStart = (dateStr: string): Date => {
    const date = new Date(`${dateStr}T00:00:00`);
    const dayIndex = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayIndex);
    return date;
  };

  const weeklyStaffRoutes = (() => {
    const grouped: Record<string, RoutePlan[]> = {};
    staffRoutes.forEach((routePlan) => {
      const weekStart = getWeekStart(routePlan.routeDate);
      const key = localYmd(weekStart);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(routePlan);
    });

    return Object.keys(grouped)
      .sort((a, b) => b.localeCompare(a))
      .map((weekStartKey) => {
        const weekStart = new Date(`${weekStartKey}T00:00:00`);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return {
          weekStartKey,
          weekLabel: `${weekStart.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })} - ${weekEnd.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })}`,
          routes: grouped[weekStartKey].sort((a, b) => b.routeDate.localeCompare(a.routeDate)),
        };
      });
  })();

  const openEditRouteForm = (routePlan: RoutePlan) => {
    setEditingRoute(routePlan);
    setRouteForm({
      title: routePlan.title,
      routeDate: routePlan.routeDate,
      startLocation: routePlan.startLocation,
      endLocation: routePlan.endLocation,
      stops: routePlan.stops || '',
      durationDays: routePlan.durationDays || 1,
      status: routePlan.status,
      notes: routePlan.notes || '',
    });
    setShowRouteForm(true);
  };

  const routeMetrics = (() => {
    const fromCity = getCityByName(routeForm.startLocation);
    const toCity = getCityByName(routeForm.endLocation);
    if (!fromCity || !toCity) return null;
    const oneWayKm = calculateDistanceKm(fromCity, toCity);
    const roundTripKm = oneWayKm * 2;
    const assumedAverageSpeedKmh = 75;
    const estimatedHours = roundTripKm / assumedAverageSpeedKmh;
    return {
      distanceKm: Number(oneWayKm.toFixed(1)),
      roundTripKm: Number(roundTripKm.toFixed(1)),
      estimatedHours: Number(estimatedHours.toFixed(1)),
    };
  })();

  const handleSaveRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedStaff) return;
    const assignedUserIds = [selectedStaff.uid];
    const assignedUserNames = [selectedStaff.displayName];
    const now = Date.now();

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('route_plans')
          .update({
            title: routeForm.title,
            route_date: routeForm.routeDate,
            start_location: routeForm.startLocation,
            end_location: routeForm.endLocation,
            stops: routeForm.stops || null,
            assigned_user_id: selectedStaff.uid,
            assigned_user_name: selectedStaff.displayName,
            status: routeForm.status,
            notes: routeForm.notes || null,
            raw: {
              assigned_user_ids: assignedUserIds,
              assigned_user_names: assignedUserNames,
              distance_km: routeMetrics?.distanceKm ?? null,
              round_trip_km: routeMetrics?.roundTripKm ?? null,
              estimated_hours: routeMetrics?.estimatedHours ?? null,
              duration_days: routeForm.durationDays,
            },
            updated_at: now,
          })
          .eq('id', editingRoute.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('route_plans').insert({
          id: createRowId(),
          title: routeForm.title,
          route_date: routeForm.routeDate,
          start_location: routeForm.startLocation,
          end_location: routeForm.endLocation,
          stops: routeForm.stops || null,
          assigned_user_id: selectedStaff.uid,
          assigned_user_name: selectedStaff.displayName,
          status: routeForm.status,
          notes: routeForm.notes || null,
          raw: {
            assigned_user_ids: assignedUserIds,
            assigned_user_names: assignedUserNames,
            distance_km: routeMetrics?.distanceKm ?? null,
            round_trip_km: routeMetrics?.roundTripKm ?? null,
            estimated_hours: routeMetrics?.estimatedHours ?? null,
            duration_days: routeForm.durationDays,
          },
          created_by_id: currentUser.uid,
          created_by_name: currentUser.displayName,
          created_at: now,
          updated_at: now,
        });
        if (error) throw error;
      }

      await loadStaffRoutes();
      setShowRouteForm(false);
      setEditingRoute(null);
    } catch (error: any) {
      console.error('Route save error:', error);
      alert(`Rut kaydedilemedi: ${error?.message || ''}`);
    }
  };

  const handleDeleteRoute = async (routePlan: RoutePlan) => {
    const confirmed = confirm(`"${routePlan.title}" rutunu silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('route_plans').delete().eq('id', routePlan.id);
      if (error) throw error;
      await loadStaffRoutes();
    } catch (error: any) {
      alert(`Rut silinemedi: ${error?.message || ''}`);
    }
  };

  if (selectedStaff && isRouteManager) {
    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-300">
        <button
          onClick={() => setSelectedStaff(null)}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-600 transition-colors uppercase"
        >
          <ArrowLeft size={12} /> Personel Listesine Dön
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg font-black uppercase shadow-lg shadow-red-100">
              {selectedStaff.displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{selectedStaff.displayName}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{selectedStaff.email}</p>
            </div>
          </div>
          <button
            onClick={openCreateRouteForm}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 shadow-xl"
          >
            <Plus size={14} className="inline mr-2" /> Yeni Rut
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRouteFilterType('month')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                routeFilterType === 'month' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Ay
            </button>
            <button
              onClick={() => setRouteFilterType('dateRange')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                routeFilterType === 'dateRange' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              Tarih Aralığı
            </button>
          </div>
          {routeFilterType === 'month' ? (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={routeStartDate}
                onChange={(e) => setRouteStartDate(e.target.value)}
                className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
              />
              <span className="text-[9px] font-black text-slate-400">-</span>
              <input
                type="date"
                value={routeEndDate}
                onChange={(e) => setRouteEndDate(e.target.value)}
                className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
              />
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/70">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Personel Rutları</p>
          </div>
          {weeklyStaffRoutes.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rut Kaydı Bulunamadı</p>
            </div>
          ) : (
            <div>
              {weeklyStaffRoutes.map((weekGroup) => (
                <div key={weekGroup.weekStartKey} className="border-b border-slate-100 last:border-b-0">
                  <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                      Hafta: {weekGroup.weekLabel}
                    </p>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {weekGroup.routes.map((routePlan) => (
                      <div key={routePlan.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Route size={14} className="text-red-600" />
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{routePlan.title}</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                            {routePlan.routeDate} | {routePlan.startLocation} - {routePlan.endLocation}
                          </p>
                          {routePlan.notes && <p className="text-[10px] text-slate-500 mt-1">Not: {routePlan.notes}</p>}
                          {routePlan.roundTripKm != null && routePlan.estimatedHours != null && (
                            <p className="text-[10px] text-slate-500 mt-1">
                              Gidiş-dönüş: {routePlan.roundTripKm} km | Tahmini yol: {routePlan.estimatedHours} saat
                            </p>
                          )}
                          {routePlan.durationDays != null && (
                            <p className="text-[10px] text-slate-500 mt-1">Rut süresi: {routePlan.durationDays} gün</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 rounded text-[8px] font-black uppercase bg-slate-100 text-slate-700">
                            {routePlan.status === RoutePlanStatus.PLANNED
                              ? 'Planlandı'
                              : routePlan.status === RoutePlanStatus.IN_PROGRESS
                              ? 'Devam Ediyor'
                              : routePlan.status === RoutePlanStatus.COMPLETED
                              ? 'Tamamlandı'
                              : 'İptal'}
                          </span>
                          <button
                            onClick={() => openEditRouteForm(routePlan)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Düzenle"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteRoute(routePlan)}
                            className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                            title="Sil"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showRouteForm && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                  {editingRoute ? 'Rut Düzenle' : 'Yeni Rut Planı'}
                </h3>
                <button onClick={() => setShowRouteForm(false)} className="text-slate-400 hover:text-slate-700">
                  <X size={16} />
                </button>
              </div>
              <form onSubmit={handleSaveRoute} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  required
                  value={routeForm.title}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Rut başlığı"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <input
                  type="date"
                  required
                  value={routeForm.routeDate}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, routeDate: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                />
                <select
                  required
                  value={routeForm.startLocation}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, startLocation: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value="">Başlangıç Şehri Seçin</option>
                  {cityOptions.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
                <select
                  required
                  value={routeForm.endLocation}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, endLocation: e.target.value }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value="">Bitiş Şehri Seçin</option>
                  {cityOptions.map((cityName) => (
                    <option key={cityName} value={cityName}>
                      {cityName}
                    </option>
                  ))}
                </select>
                <input
                  value={routeForm.stops}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, stops: e.target.value }))}
                  placeholder="Duraklar (opsiyonel)"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2"
                />
                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] font-bold text-slate-600">
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Tek Yön: {routeMetrics ? `${routeMetrics.distanceKm} km` : '-'}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Gidiş-Dönüş: {routeMetrics ? `${routeMetrics.roundTripKm} km` : '-'}
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                    Tahmini Yol: {routeMetrics ? `${routeMetrics.estimatedHours} saat` : '-'}
                  </div>
                </div>
                <input
                  value={selectedStaff.displayName}
                  disabled
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500"
                />
                <select
                  value={routeForm.status}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, status: e.target.value as RoutePlanStatus }))}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                >
                  <option value={RoutePlanStatus.PLANNED}>Planlandı</option>
                  <option value={RoutePlanStatus.IN_PROGRESS}>Devam Ediyor</option>
                  <option value={RoutePlanStatus.COMPLETED}>Tamamlandı</option>
                  <option value={RoutePlanStatus.CANCELLED}>İptal</option>
                </select>
                <input
                  type="number"
                  min="1"
                  value={routeForm.durationDays}
                  onChange={(e) =>
                    setRouteForm((prev) => ({ ...prev, durationDays: Number(e.target.value) || 1 }))
                  }
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                  placeholder="Rut süresi (gün)"
                />
                <textarea
                  value={routeForm.notes}
                  onChange={(e) => setRouteForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="Rut notları (opsiyonel)"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2 min-h-24"
                />
                <button
                  type="submit"
                  className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
                >
                  <Save size={14} className="inline mr-2" /> Kaydet
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (selectedStaff) {
    const monthTotal = staffExpenses.reduce((sum, e) => sum + e.amount, 0);
    const pendingCount = staffExpenses.filter(e => e.status === ExpenseStatus.SUBMITTED).length;
    const monthlySalesTotal = staffSales.reduce((sum, sale) => sum + sale.amount, 0);
    const monthTarget = staffTargets.find((target) => {
      if (target.targetType !== PersonnelTargetType.SALES) return false;
      const startMonth = target.startDate.slice(0, 7);
      const endMonth = target.endDate.slice(0, 7);
      return startMonth <= selectedMonth && selectedMonth <= endMonth;
    });
    const targetValue = monthTarget?.targetValue || 0;
    const targetProgress = targetValue > 0 ? Math.min(100, (monthlySalesTotal / targetValue) * 100) : 0;

    return (
      <div className="max-w-6xl mx-auto space-y-4 animate-in fade-in duration-300">
        <button 
          onClick={() => { setSelectedStaff(null); setCategoryFilter('ALL'); }}
          className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-red-600 transition-colors uppercase"
        >
          <ArrowLeft size={12} /> Personel Listesine Dön
        </button>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-red-600 flex items-center justify-center text-white text-lg font-black uppercase shadow-lg shadow-red-100">
              {selectedStaff.displayName.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{selectedStaff.displayName}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-tighter">{selectedStaff.email}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 flex items-center gap-3">
              <Calendar size={14} className="text-red-600" />
              <input 
                type="month" 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="text-[10px] font-black text-slate-800 uppercase bg-transparent outline-none cursor-pointer"
              />
            </div>
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Dönem Hacmi</p>
                <p className="text-xs font-black text-red-600 mt-0.5">
                  {monthTotal.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Bekleyen İşlem</p>
                <p className="text-xs font-black text-amber-600 mt-0.5">{pendingCount} Masraf</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-3 flex items-center justify-between shadow-lg">
           <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-white/50">
                 <Tag size={12} />
                 <span className="text-[9px] font-black uppercase tracking-widest">Kategori Filtresi:</span>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${
                    categoryFilter === 'ALL' 
                    ? 'bg-red-600 text-white' 
                    : 'text-white/40 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Tümü
                </button>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-tighter transition-all ${
                      categoryFilter === cat 
                      ? 'bg-red-600 text-white' 
                      : 'text-white/40 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
           </div>
           {categoryFilter !== 'ALL' && (
             <button onClick={() => setCategoryFilter('ALL')} className="text-white/30 hover:text-red-500 transition-colors">
               <RotateCcw size={14} />
             </button>
           )}
        </div>

        {canReviewExpenses && (
          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Masraf Dönemi</span>
              <button
                onClick={() => setExpenseFilterType('month')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                  expenseFilterType === 'month' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Ay
              </button>
              <button
                onClick={() => setExpenseFilterType('dateRange')}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase ${
                  expenseFilterType === 'dateRange' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                Tarih Aralığı
              </button>
              {expenseFilterType === 'dateRange' && (
                <>
                  <input
                    type="date"
                    value={expenseStartDate}
                    onChange={(e) => setExpenseStartDate(e.target.value)}
                    className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
                  />
                  <span className="text-[9px] font-black text-slate-400">-</span>
                  <input
                    type="date"
                    value={expenseEndDate}
                    onChange={(e) => setExpenseEndDate(e.target.value)}
                    className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 outline-none"
                  />
                </>
              )}
            </div>
            <button
              onClick={handleExportStaffExpenses}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2 text-[10px] font-black uppercase"
            >
              <Download size={12} className="inline mr-2" />
              Excel Dışa Aktar
            </button>
          </div>
        )}

        <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-blue-100 bg-blue-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target size={14} className="text-blue-600" />
              <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Satış Raporu</p>
            </div>
            <p className="text-[10px] font-black text-slate-700">
              Toplam: {monthlySalesTotal.toLocaleString('tr-TR')} TL
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-black text-slate-500 uppercase">Aylık Satış</p>
              <p className="text-sm font-black text-slate-900 mt-1">{monthlySalesTotal.toLocaleString('tr-TR')} TL</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-black text-slate-500 uppercase">Hedef</p>
              <p className="text-sm font-black text-slate-900 mt-1">
                {targetValue.toLocaleString('tr-TR')} {monthTarget?.metricUnit || 'TL'}
              </p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <p className="text-[9px] font-black text-slate-500 uppercase">Gerçekleşme</p>
              <p className="text-sm font-black text-green-700 mt-1">{targetProgress.toFixed(1)}%</p>
            </div>
          </div>
          <div className="px-4 pb-3">
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${targetProgress}%` }} />
            </div>
          </div>
          <div className="border-t border-slate-100 max-h-64 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-black">Tarih</th>
                  <th className="px-3 py-2 font-black text-right">Satış (TL)</th>
                  <th className="px-3 py-2 font-black">Not</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffSales.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-[10px] font-bold text-slate-400">
                      Seçili ayda satış kaydı yok.
                    </td>
                  </tr>
                ) : (
                  staffSales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-3 py-2 text-[10px] text-slate-600">{sale.saleDate}</td>
                      <td className="px-3 py-2 text-[10px] text-right font-black text-slate-900">
                        {sale.amount.toLocaleString('tr-TR')}
                      </td>
                      <td className="px-3 py-2 text-[10px] text-slate-500">{sale.note || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
              PERSONEL MASRAF KAYITLARI {categoryFilter !== 'ALL' && `(${categoryFilter.toUpperCase()})`}
            </h3>
          </div>
          <ExpenseList 
            expenses={staffExpenses} 
            onEdit={canReviewExpenses ? setEditingExpense : undefined}
            onApprove={canReviewExpenses ? (expense) => void handleExpenseStatus(expense, ExpenseStatus.APPROVED) : undefined}
            onReject={canReviewExpenses ? (expense) => void handleExpenseStatus(expense, ExpenseStatus.REJECTED) : undefined}
          />
        </div>

        {editingExpense && canReviewExpenses && (
          <ExpenseForm 
            initialData={editingExpense} 
            onSubmit={handleUpdateExpense} 
            onClose={() => setEditingExpense(null)} 
          />
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Personel Yönetimi</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">İnceleme ve Masraf Kontrolü</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
          <input
            type="text"
            placeholder="PERSONEL ARA..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-red-500 shadow-sm transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredPersonnel.map((p) => (
          <div
            key={p.uid}
            className="bg-white border border-slate-200 rounded-xl p-3 flex items-center gap-3 hover:border-red-400 hover:shadow-md transition-all text-left group"
          >
            <button onClick={() => setSelectedStaff(p)} className="flex items-center gap-3 flex-1 text-left">
              <div className="w-10 h-10 rounded bg-slate-50 group-hover:bg-red-50 flex items-center justify-center text-slate-400 group-hover:text-red-600 transition-colors uppercase font-black text-xs border border-slate-100 group-hover:border-red-100">
                {p.displayName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight truncate">{p.displayName}</p>
                <p className="text-[8px] text-slate-400 font-bold truncate mt-0.5 uppercase tracking-tighter">{p.email}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[7px] font-black text-red-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                  DETAYLI İNCELE <ChevronRight size={8} />
                </div>
              </div>
            </button>
            {isAdmin && (
              <button
                onClick={() => handleDeletePersonnel(p)}
                className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                title="Personeli kaldır"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonnelView;
