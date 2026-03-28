import React, { useEffect, useMemo, useState } from 'react';
import { BadgePercent, CalendarRange, Edit2, Megaphone, Plus, Save, Trash2, X } from 'lucide-react';
import { PromotionCampaign, PromotionType, UserProfile, UserRole } from '../types';
import { createRowId, mapPromotionCampaign, supabase } from '../supabase';

interface PromotionsViewProps {
  user: UserProfile;
}

type PromotionFormData = {
  title: string;
  type: PromotionType;
  details: string;
  startDate: string;
  endDate: string;
  targetAudience: string;
  budget: string;
  discountRate: string;
  isActive: boolean;
};

const emptyForm: PromotionFormData = {
  title: '',
  type: PromotionType.PROMOTION,
  details: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  targetAudience: '',
  budget: '',
  discountRate: '',
  isActive: true,
};

const PromotionsView: React.FC<PromotionsViewProps> = ({ user }) => {
  const [items, setItems] = useState<PromotionCampaign[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PromotionCampaign | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(emptyForm);

  const isAdmin = user.role === UserRole.YONETICI;

  const loadPromotions = async () => {
    let queryBuilder = supabase.from('promotions_campaigns').select('*');
    if (!isAdmin) queryBuilder = queryBuilder.eq('is_active', true);
    const { data, error } = await queryBuilder.order('start_date', { ascending: false });
    if (error) {
      console.error('Promotions load error:', error);
      return;
    }
    setItems((data || []).map(mapPromotionCampaign));
  };

  useEffect(() => {
    loadPromotions();
  }, [isAdmin]);

  const filteredItems = useMemo(() => {
    if (!showOnlyActive) return items;
    return items.filter((item) => item.isActive);
  }, [items, showOnlyActive]);

  const openCreateForm = (type: PromotionType = PromotionType.PROMOTION) => {
    setEditingItem(null);
    setFormData({ ...emptyForm, type });
    setShowForm(true);
  };

  const openEditForm = (item: PromotionCampaign) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      type: item.type,
      details: item.details,
      startDate: item.startDate,
      endDate: item.endDate,
      targetAudience: item.targetAudience,
      budget: item.budget ? String(item.budget) : '',
      discountRate: item.discountRate ? String(item.discountRate) : '',
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? Number(formData.budget) : undefined,
        discountRate: formData.discountRate ? Number(formData.discountRate) : undefined,
      };

      if (editingItem) {
        const promotionsTable: any = supabase.from('promotions_campaigns');
        const { error } = await promotionsTable
          .update({
            title: payload.title,
            type: payload.type,
            details: payload.details,
            start_date: payload.startDate,
            end_date: payload.endDate,
            target_audience: payload.targetAudience,
            budget: payload.budget ?? null,
            discount_rate: payload.discountRate ?? null,
            is_active: payload.isActive,
            updated_at: Date.now(),
          })
          .eq('id', editingItem.id);
        if (error) throw error;
      } else {
        const rowId = createRowId();
        const { error } = await (supabase.from('promotions_campaigns') as any).insert({
          id: rowId,
          title: payload.title,
          type: payload.type,
          details: payload.details,
          start_date: payload.startDate,
          end_date: payload.endDate,
          target_audience: payload.targetAudience,
          budget: payload.budget ?? null,
          discount_rate: payload.discountRate ?? null,
          is_active: payload.isActive,
          created_by_id: user.uid,
          created_by_name: user.displayName,
          created_at: Date.now(),
          updated_at: Date.now(),
        } as any);
        if (error) throw error;
      }

      await loadPromotions();
      setShowForm(false);
      setEditingItem(null);
      setFormData(emptyForm);
    } catch (error) {
      console.error('Promotion save error:', error);
      alert('Promosyon/kampanya kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = async (item: PromotionCampaign) => {
    if (!isAdmin) return;
    const confirmed = confirm(`"${item.title}" kaydını silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('promotions_campaigns').delete().eq('id', item.id);
      if (error) throw error;
      await loadPromotions();
    } catch (error) {
      console.error('Promotion delete error:', error);
      alert('Kayıt silinirken bir hata oluştu.');
    }
  };

  const promotions = filteredItems.filter((item) => item.type === PromotionType.PROMOTION);
  const campaigns = filteredItems.filter((item) => item.type === PromotionType.CAMPAIGN);

  const renderList = (list: PromotionCampaign[]) => {
    if (list.length === 0) {
      return (
        <div className="p-8 text-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kayıt Bulunamadı</p>
        </div>
      );
    }

    return (
      <div className="divide-y divide-slate-100">
        {list.map((item) => (
          <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <BadgePercent size={14} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{item.targetAudience}</p>
              <p className="text-[10px] text-slate-600 mt-2">{item.details}</p>
              <p className="text-[10px] text-slate-500 mt-2">
                Dönem: {item.startDate} - {item.endDate}
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-[10px] text-slate-500">
                {typeof item.budget === 'number' && (
                  <span>Bütçe: {item.budget.toLocaleString('tr-TR')} TL</span>
                )}
                {typeof item.discountRate === 'number' && <span>İndirim: %{item.discountRate}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                  item.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.isActive ? 'Aktif' : 'Pasif'}
              </span>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditForm(item)}
                    className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Düzenle"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Promosyonlar ve Kampanyalar</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Pazarlama planları ve takip</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openCreateForm(PromotionType.PROMOTION)}
              className="bg-red-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 shadow-xl"
            >
              <Plus size={14} className="inline mr-2" />
              Yeni Promosyon
            </button>
            <button
              onClick={() => openCreateForm(PromotionType.CAMPAIGN)}
              className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-xl"
            >
              <Plus size={14} className="inline mr-2" />
              Yeni Kampanya
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Megaphone size={16} className="text-red-600" />
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase">Toplam Kayıt</p>
            <p className="text-lg font-black text-slate-900">{items.length}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase">
          <input
            type="checkbox"
            checked={showOnlyActive}
            onChange={(e) => setShowOnlyActive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Sadece Aktif
        </label>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Promosyonlar</p>
        </div>
        {renderList(promotions)}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kampanyalar</p>
        </div>
        {renderList(campaigns)}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                {editingItem ? 'Kayıt Düzenle' : 'Yeni Promosyon/Kampanya'}
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
                placeholder="Kayıt başlığı"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2"
              />
              <select
                value={formData.type}
                onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as PromotionType }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value={PromotionType.PROMOTION}>Promosyon</option>
                <option value={PromotionType.CAMPAIGN}>Kampanya</option>
              </select>
              <input
                required
                value={formData.targetAudience}
                onChange={(e) => setFormData((prev) => ({ ...prev, targetAudience: e.target.value }))}
                placeholder="Hedef kitle"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                <CalendarRange size={14} className="text-slate-400" />
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="text-sm outline-none flex-1"
                />
              </div>
              <input
                type="date"
                required
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.budget}
                onChange={(e) => setFormData((prev) => ({ ...prev, budget: e.target.value }))}
                placeholder="Bütçe (TL)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.discountRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, discountRate: e.target.value }))}
                placeholder="İndirim oranı (%)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <textarea
                required
                value={formData.details}
                onChange={(e) => setFormData((prev) => ({ ...prev, details: e.target.value }))}
                placeholder="Detaylar"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none min-h-28 md:col-span-2"
              />
              <label className="md:col-span-2 flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Aktif Kayıt
              </label>
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

export default PromotionsView;
