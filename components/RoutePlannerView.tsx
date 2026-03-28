import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Edit2, Plus, Route, Save, Trash2, X } from 'lucide-react';
import { RoutePlan, RoutePlanStatus, UserProfile, UserRole } from '../types';
import { createRowId, mapRoutePlan, mapUserProfile, supabase } from '../supabase';
import { calculateDistanceKm, getCityByName, TURKEY_CITIES } from '../data/turkeyCities';

interface RoutePlannerViewProps {
  user: UserProfile;
}

type RouteFormData = {
  title: string;
  routeDate: string;
  startLocation: string;
  endLocation: string;
  stops: string;
  assignedUserIds: string[];
  assignedUserNames: string[];
  durationDays: number;
  status: RoutePlanStatus;
  notes: string;
};

const emptyForm = (): RouteFormData => ({
  title: '',
  routeDate: new Date().toISOString().slice(0, 10),
  startLocation: '',
  endLocation: '',
  stops: '',
  assignedUserIds: [],
  assignedUserNames: [],
  durationDays: 1,
  status: RoutePlanStatus.PLANNED,
  notes: '',
});

const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({ user }) => {
  const [routePlans, setRoutePlans] = useState<RoutePlan[]>([]);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [statusFilter, setStatusFilter] = useState<RoutePlanStatus | 'ALL'>('ALL');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RoutePlan | null>(null);
  const [formData, setFormData] = useState<RouteFormData>(emptyForm());

  const canManageRoutes =
    user.role === UserRole.YONETICI || user.role === UserRole.SEVKIYAT_MUDURU;

  const loadPersonnel = async () => {
    if (!canManageRoutes) return;
    const { data, error } = await supabase.from('users').select('*').eq('role', UserRole.PERSONEL);
    if (error) return;
    setPersonnel((data || []).map(mapUserProfile));
  };

  useEffect(() => {
    loadPersonnel();
  }, [canManageRoutes]);

  const loadRoutes = async () => {
    const queryBuilder = supabase.from('route_plans').select('*');
    const { data, error: queryError } = await queryBuilder.order('route_date', { ascending: false });
    if (queryError) {
      console.error('Route listener error:', queryError);
      if (queryError?.code === '42501') {
        setError("Rut kayıtlarına erişim izni yok. Supabase RLS/policy ayarını kontrol edin.");
      } else {
        setError('Rut kayıtları yüklenirken bir hata oluştu.');
      }
      return;
    }
    const allRoutes = (data || []).map(mapRoutePlan);
    const visibleRoutes = canManageRoutes
      ? allRoutes
      : allRoutes.filter(
          (routePlan) =>
            routePlan.assignedUserIds.includes(user.uid) || routePlan.assignedUserId === user.uid
        );
    setRoutePlans(visibleRoutes);
    setError(null);
  };

  useEffect(() => {
    loadRoutes();
  }, [canManageRoutes, user.uid]);

  const filteredRoutes = useMemo(() => {
    return routePlans.filter((routePlan) => {
      const byMonth = routePlan.routeDate.slice(0, 7) === selectedMonth;
      const byStatus = statusFilter === 'ALL' ? true : routePlan.status === statusFilter;
      return byMonth && byStatus;
    });
  }, [routePlans, selectedMonth, statusFilter]);

  const localYmd = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getWeekStart = (dateStr: string): Date => {
    const date = new Date(`${dateStr}T00:00:00`);
    const dayIndex = (date.getDay() + 6) % 7; // Monday=0 ... Sunday=6
    date.setDate(date.getDate() - dayIndex);
    return date;
  };

  const weeklyGroupedRoutes = useMemo(() => {
    const grouped: Record<string, RoutePlan[]> = {};

    filteredRoutes.forEach((routePlan) => {
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
  }, [filteredRoutes]);

  const totalCount = filteredRoutes.length;
  const completedCount = filteredRoutes.filter((item) => item.status === RoutePlanStatus.COMPLETED).length;
  const cityOptions = useMemo(() => TURKEY_CITIES.map((city) => city.name), []);

  const routeMetrics = useMemo(() => {
    const fromCity = getCityByName(formData.startLocation);
    const toCity = getCityByName(formData.endLocation);
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
  }, [formData.startLocation, formData.endLocation]);

  const openCreateForm = () => {
    setEditingRoute(null);
    setFormData(emptyForm());
    setShowForm(true);
  };

  const openEditForm = (routePlan: RoutePlan) => {
    setEditingRoute(routePlan);
    setFormData({
      title: routePlan.title,
      routeDate: routePlan.routeDate,
      startLocation: routePlan.startLocation,
      endLocation: routePlan.endLocation,
      stops: routePlan.stops || '',
      assignedUserIds: routePlan.assignedUserIds,
      assignedUserNames: routePlan.assignedUserNames,
      status: routePlan.status,
      notes: routePlan.notes || '',
      durationDays: routePlan.durationDays || 1,
    });
    setShowForm(true);
  };

  const toggleAssignee = (selectedUser: UserProfile) => {
    setFormData((prev) => ({
      ...prev,
      assignedUserIds: prev.assignedUserIds.includes(selectedUser.uid)
        ? prev.assignedUserIds.filter((id) => id !== selectedUser.uid)
        : [...prev.assignedUserIds, selectedUser.uid],
      assignedUserNames: prev.assignedUserNames.includes(selectedUser.displayName)
        ? prev.assignedUserNames.filter((name) => name !== selectedUser.displayName)
        : [...prev.assignedUserNames, selectedUser.displayName],
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (canManageRoutes && formData.assignedUserIds.length === 0) {
      alert('En az bir personel seçmelisiniz.');
      return;
    }

    const primaryAssignedUserId = formData.assignedUserIds[0] || user.uid;
    const primaryAssignedUserName = formData.assignedUserNames[0] || user.displayName;
    const rawPayload = {
      assigned_user_ids: formData.assignedUserIds,
      assigned_user_names: formData.assignedUserNames,
      distance_km: routeMetrics?.distanceKm ?? null,
      round_trip_km: routeMetrics?.roundTripKm ?? null,
      estimated_hours: routeMetrics?.estimatedHours ?? null,
      duration_days: formData.durationDays,
    };

    try {
      if (editingRoute) {
        const { error } = await supabase
          .from('route_plans')
          .update({
            title: formData.title,
            route_date: formData.routeDate,
            start_location: formData.startLocation,
            end_location: formData.endLocation,
            stops: formData.stops || null,
            assigned_user_id: primaryAssignedUserId,
            assigned_user_name: primaryAssignedUserName,
            status: formData.status,
            notes: formData.notes || null,
            raw: rawPayload,
            updated_at: Date.now(),
          })
          .eq('id', editingRoute.id);
        if (error) throw error;
      } else {
        const rowId = createRowId();
        const { error } = await supabase.from('route_plans').insert({
          id: rowId,
          title: formData.title,
          route_date: formData.routeDate,
          start_location: formData.startLocation,
          end_location: formData.endLocation,
          stops: formData.stops || null,
          assigned_user_id: primaryAssignedUserId,
          assigned_user_name: primaryAssignedUserName,
          status: formData.status,
          notes: formData.notes || null,
          raw: rawPayload,
          created_by_id: user.uid,
          created_by_name: user.displayName,
          created_at: Date.now(),
          updated_at: Date.now(),
        });
        if (error) throw error;
      }
      await loadRoutes();
      setShowForm(false);
      setEditingRoute(null);
      setFormData(emptyForm());
    } catch (error) {
      console.error('Route save error:', error);
      const err = error as { code?: string; message?: string };
      if (err?.code === '42501') {
        alert("Rut kaydedilemedi: Supabase yetki hatası (RLS/policy).");
      } else {
        alert(`Rut kaydedilirken bir hata oluştu: ${err?.message || ''}`);
      }
    }
  };

  const handleDeleteRoute = async (routePlan: RoutePlan) => {
    if (!canManageRoutes) return;
    const confirmed = confirm(`"${routePlan.title}" rutunu silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('route_plans').delete().eq('id', routePlan.id);
      if (error) throw error;
      await loadRoutes();
    } catch (error: any) {
      alert(`Rut silinemedi: ${error?.message || ''}`);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Rut Planlayıcı</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saha ve ziyaret planı</p>
        </div>
        {canManageRoutes && (
          <button
            onClick={openCreateForm}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 shadow-xl"
          >
            <Plus size={14} className="inline mr-2" />
            Yeni Rut
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Seçili Ay</p>
          <div className="mt-2 flex items-center gap-2">
            <Calendar size={14} className="text-red-600" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="text-[10px] font-black text-slate-800 bg-transparent outline-none"
            />
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Toplam Plan</p>
          <p className="text-lg font-black text-slate-900 mt-2">{totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Tamamlanan</p>
          <p className="text-lg font-black text-green-600 mt-2">{completedCount}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-[9px] font-black text-slate-400 uppercase">Durum Filtresi</p>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as RoutePlanStatus | 'ALL')}
            className="w-full mt-2 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-black uppercase outline-none"
          >
            <option value="ALL">Tümü</option>
            <option value={RoutePlanStatus.PLANNED}>Planlandı</option>
            <option value={RoutePlanStatus.IN_PROGRESS}>Devam Ediyor</option>
            <option value={RoutePlanStatus.COMPLETED}>Tamamlandı</option>
            <option value={RoutePlanStatus.CANCELLED}>İptal</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-600 text-red-700 p-3 text-[10px] font-bold rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Rut Listesi</p>
        </div>

        {weeklyGroupedRoutes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rut Kaydı Bulunamadı</p>
          </div>
        ) : (
          <div>
            {weeklyGroupedRoutes.map((weekGroup) => (
              <div key={weekGroup.weekStartKey} className="border-b border-slate-100 last:border-b-0">
                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-100">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    Hafta: {weekGroup.weekLabel}
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {weekGroup.routes.map((routePlan) => (
                    <div key={routePlan.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Route size={14} className="text-red-600" />
                          <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{routePlan.title}</p>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">
                          {routePlan.routeDate} | {routePlan.startLocation} - {routePlan.endLocation}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">
                          Atanan: {routePlan.assignedUserNames.length > 0 ? routePlan.assignedUserNames.join(', ') : routePlan.assignedUserName}
                        </p>
                        {routePlan.stops && (
                          <p className="text-[10px] text-slate-500 mt-1">Duraklar: {routePlan.stops}</p>
                        )}
                        {routePlan.notes && (
                          <p className="text-[10px] text-slate-500 mt-1">Not: {routePlan.notes}</p>
                        )}
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
                        {canManageRoutes && (
                          <>
                            <button
                              onClick={() => openEditForm(routePlan)}
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
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                {editingRoute ? 'Rut Düzenle' : 'Yeni Rut Planı'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Rut başlığı"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="date"
                required
                value={formData.routeDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, routeDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <select
                required
                value={formData.startLocation}
                onChange={(e) => setFormData((prev) => ({ ...prev, startLocation: e.target.value }))}
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
                value={formData.endLocation}
                onChange={(e) => setFormData((prev) => ({ ...prev, endLocation: e.target.value }))}
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
                value={formData.stops}
                onChange={(e) => setFormData((prev) => ({ ...prev, stops: e.target.value }))}
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

              {canManageRoutes ? (
                <div className="border border-slate-200 rounded-lg px-3 py-2 md:col-span-2">
                  <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Atanacak Personeller</p>
                  <div className="max-h-36 overflow-auto space-y-1">
                    {personnel.map((item) => {
                      const checked = formData.assignedUserIds.includes(item.uid);
                      return (
                        <label key={item.uid} className="flex items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAssignee(item)}
                            className="rounded border-slate-300"
                          />
                          {item.displayName}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <input
                  value={routePlans
                    .find((item) => item.id === editingRoute?.id)
                    ?.assignedUserNames.join(', ') || user.displayName}
                  disabled
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 text-slate-500 md:col-span-2"
                />
              )}

              <select
                value={formData.status}
                onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as RoutePlanStatus }))}
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
                value={formData.durationDays}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, durationDays: Number(e.target.value) || 1 }))
                }
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="Rut süresi (gün)"
              />

              <textarea
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Rut notları (opsiyonel)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2 min-h-24"
              />

              <button
                type="submit"
                className="md:col-span-2 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
              >
                <Save size={14} className="inline mr-2" />
                Kaydet
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutePlannerView;
