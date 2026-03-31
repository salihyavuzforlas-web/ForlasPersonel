import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  CalendarRange,
  Edit2,
  ImagePlus,
  Megaphone,
  Plus,
  Save,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import {
  PersonnelTarget,
  PersonnelTargetType,
  PromotionCampaign,
  PromotionType,
  UserProfile,
  UserRole,
} from '../types';
import { createRowId, mapPersonnelTarget, mapPromotionCampaign, mapUserProfile, supabase } from '../supabase';

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
  imageData: string;
  imageType: string;
  isActive: boolean;
};

type TargetFormData = {
  userId: string;
  title: string;
  targetType: PersonnelTargetType;
  productName: string;
  description: string;
  metricUnit: string;
  targetValue: string;
  currentValue: string;
  startDate: string;
  endDate: string;
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
  imageData: '',
  imageType: '',
  isActive: true,
};

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;
const targetTypeLabels: Record<PersonnelTargetType, string> = {
  [PersonnelTargetType.SALES]: 'Satış Hedefi',
  [PersonnelTargetType.COLLECTION]: 'Tahsilat Hedefi',
  [PersonnelTargetType.PRODUCT_QUANTITY]: 'Ürün Adet Hedefi',
};

const emptyTargetForm = (): TargetFormData => ({
  userId: '',
  title: 'Satış Hedefi',
  targetType: PersonnelTargetType.SALES,
  productName: '',
  description: '',
  metricUnit: 'TL',
  targetValue: '',
  currentValue: '',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: new Date().toISOString().slice(0, 10),
  isActive: true,
});

const PromotionsView: React.FC<PromotionsViewProps> = ({ user }) => {
  const [items, setItems] = useState<PromotionCampaign[]>([]);
  const [showOnlyActive, setShowOnlyActive] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<PromotionCampaign | null>(null);
  const [formData, setFormData] = useState<PromotionFormData>(emptyForm);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);
  const [targets, setTargets] = useState<PersonnelTarget[]>([]);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [showTargetForm, setShowTargetForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<PersonnelTarget | null>(null);
  const [targetForm, setTargetForm] = useState<TargetFormData>(emptyTargetForm());
  const [assignAllPersonnel, setAssignAllPersonnel] = useState(false);

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

  const loadPersonnel = async () => {
    const { data, error } = await supabase.from('users').select('*').eq('role', UserRole.PERSONEL);
    if (error) return;
    setPersonnel((data || []).map(mapUserProfile));
  };

  const loadTargets = async () => {
    let queryBuilder = supabase.from('personnel_targets').select('*');
    if (!isAdmin) queryBuilder = queryBuilder.eq('user_id', user.uid).eq('is_active', true);
    const { data, error } = await queryBuilder.order('end_date', { ascending: false });
    if (error) {
      console.error('Targets load error:', error);
      return;
    }
    setTargets((data || []).map(mapPersonnelTarget));
  };

  useEffect(() => {
    loadPromotions();
    loadTargets();
    if (isAdmin) loadPersonnel();
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
      imageData: item.imageData || '',
      imageType: item.imageType || '',
      isActive: item.isActive,
    });
    setShowForm(true);
  };

  const convertFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result !== 'string') {
          reject(new Error('Dosya okunamadı.'));
          return;
        }
        resolve(reader.result);
      };
      reader.onerror = () => reject(new Error('Dosya okunurken hata oluştu.'));
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Lütfen yalnızca görsel dosyası seçin.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      alert('Görsel boyutu en fazla 2 MB olabilir.');
      event.target.value = '';
      return;
    }
    try {
      const dataUrl = await convertFileToDataUrl(file);
      setFormData((prev) => ({
        ...prev,
        imageData: dataUrl,
        imageType: file.type || 'image/jpeg',
      }));
    } catch (_error) {
      alert('Görsel yüklenirken bir hata oluştu.');
    } finally {
      event.target.value = '';
    }
  };

  const clearImage = () => {
    setFormData((prev) => ({
      ...prev,
      imageData: '',
      imageType: '',
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...formData,
        budget: formData.budget ? Number(formData.budget) : undefined,
        discountRate: formData.discountRate ? Number(formData.discountRate) : undefined,
        raw: {
          image_data: formData.imageData || null,
          image_type: formData.imageType || null,
        },
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
            raw: payload.raw,
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
          raw: payload.raw,
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
  const bonuses = filteredItems.filter((item) => item.type === PromotionType.BONUS);
  const activeTargetCount = targets.filter((target) => target.isActive).length;

  const openCreateTargetForm = () => {
    setEditingTarget(null);
    setTargetForm(emptyTargetForm());
    setAssignAllPersonnel(false);
    setShowTargetForm(true);
  };

  const openEditTargetForm = (target: PersonnelTarget) => {
    setEditingTarget(target);
    setAssignAllPersonnel(false);
    setTargetForm({
      userId: target.userId,
      title: target.title,
      targetType: target.targetType || PersonnelTargetType.SALES,
      productName: target.productName || '',
      description: target.description || '',
      metricUnit: target.metricUnit || 'TL',
      targetValue: String(target.targetValue || ''),
      currentValue: target.currentValue != null ? String(target.currentValue) : '',
      startDate: target.startDate,
      endDate: target.endDate,
      isActive: target.isActive,
    });
    setShowTargetForm(true);
  };

  const handleTargetSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isAdmin) return;
    const selectedUsers = assignAllPersonnel
      ? personnel
      : personnel.filter((person) => person.uid === targetForm.userId);
    if (selectedUsers.length === 0) {
      alert('Lütfen personel seçin.');
      return;
    }
    const targetValue = Number(targetForm.targetValue);
    if (!Number.isFinite(targetValue) || targetValue <= 0) {
      alert('Hedef değeri 0 dan büyük olmalıdır.');
      return;
    }
    if (targetForm.targetType === PersonnelTargetType.PRODUCT_QUANTITY && !targetForm.productName.trim()) {
      alert('Ürün adet hedefi için ürün adı girmeniz gerekir.');
      return;
    }
    if (!targetForm.title.trim()) {
      alert('Hedef başlığı boş olamaz.');
      return;
    }

    try {
      if (editingTarget) {
        const selectedUser = selectedUsers[0];
        const { error } = await supabase
          .from('personnel_targets')
          .update({
            user_id: selectedUser.uid,
            user_name: selectedUser.displayName,
            title: targetForm.title,
            description: targetForm.description || null,
            metric_unit: targetForm.metricUnit,
            target_value: targetValue,
            current_value: targetForm.currentValue ? Number(targetForm.currentValue) : null,
            start_date: targetForm.startDate,
            end_date: targetForm.endDate,
            is_active: targetForm.isActive,
            raw: {
              target_type: targetForm.targetType,
              product_name: targetForm.productName || null,
            },
            updated_at: Date.now(),
          })
          .eq('id', editingTarget.id);
        if (error) throw error;
      } else {
        const now = Date.now();
        const rows = selectedUsers.map((selectedUser) => ({
          id: createRowId(),
          user_id: selectedUser.uid,
          user_name: selectedUser.displayName,
          title: targetForm.title,
          description: targetForm.description || null,
          metric_unit: targetForm.metricUnit,
          target_value: targetValue,
          current_value: targetForm.currentValue ? Number(targetForm.currentValue) : null,
          start_date: targetForm.startDate,
          end_date: targetForm.endDate,
          is_active: targetForm.isActive,
          raw: {
            target_type: targetForm.targetType,
            product_name: targetForm.productName || null,
          },
          created_by_id: user.uid,
          created_by_name: user.displayName,
          created_at: now,
          updated_at: now,
        }));
        const { error } = await supabase.from('personnel_targets').insert(rows);
        if (error) throw error;
      }
      await loadTargets();
      setShowTargetForm(false);
      setEditingTarget(null);
      setTargetForm(emptyTargetForm());
      setAssignAllPersonnel(false);
    } catch (error) {
      console.error('Target save error:', error);
      alert('Hedef kaydedilirken bir hata oluştu.');
    }
  };

  const handleDeleteTarget = async (target: PersonnelTarget) => {
    if (!isAdmin) return;
    const confirmed = confirm(`"${target.title}" hedefini silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('personnel_targets').delete().eq('id', target.id);
      if (error) throw error;
      await loadTargets();
    } catch (error) {
      console.error('Target delete error:', error);
      alert('Hedef silinirken bir hata oluştu.');
    }
  };

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
              {item.imageData && (
                <div className="mt-2">
                  <img
                    src={item.imageData}
                    alt={`${item.title} görseli`}
                    className="w-full md:w-72 h-36 object-cover rounded-lg border border-slate-200 cursor-zoom-in"
                    loading="lazy"
                    onClick={() => setPreviewImage({ src: item.imageData!, title: item.title })}
                  />
                </div>
              )}
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
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Promosyonlar, Kampanyalar ve Bonuslar</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Promosyon, kampanya ve bonus yönetimi</p>
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
            <button
              onClick={() => openCreateForm(PromotionType.BONUS)}
              className="bg-violet-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-violet-700 shadow-xl"
            >
              <Plus size={14} className="inline mr-2" />
              Yeni Bonus
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
        <div className="p-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Personel Hedefleri</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">
              Aktif Hedef: {activeTargetCount}
            </p>
          </div>
          {isAdmin && (
            <button
              onClick={openCreateTargetForm}
              className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-[10px] font-black uppercase hover:bg-emerald-700"
            >
              <Plus size={12} className="inline mr-1" />
              Hedef Ekle
            </button>
          )}
        </div>
        {targets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hedef Bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {targets.map((target) => {
              const progress =
                target.targetValue > 0 && target.currentValue != null
                  ? Math.min(100, (target.currentValue / target.targetValue) * 100)
                  : 0;
              return (
                <div key={target.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Target size={14} className="text-emerald-600" />
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{target.title}</h3>
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{target.userName}</p>
                    <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                      {targetTypeLabels[target.targetType || PersonnelTargetType.SALES]}
                      {target.targetType === PersonnelTargetType.PRODUCT_QUANTITY && target.productName
                        ? ` - ${target.productName}`
                        : ''}
                    </p>
                    {target.description && (
                      <p className="text-[10px] text-slate-600 mt-1 whitespace-pre-wrap">{target.description}</p>
                    )}
                    <p className="text-[10px] text-slate-500 mt-1">
                      Hedef: {target.targetValue} {target.metricUnit}
                      {target.currentValue != null ? ` | Gerçekleşen: ${target.currentValue} ${target.metricUnit}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Dönem: {target.startDate} - {target.endDate}
                    </p>
                    <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-[8px] font-black uppercase ${
                        target.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {target.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => openEditTargetForm(target)}
                          className="p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Düzenle"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteTarget(target)}
                          className="p-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Bonuslar</p>
        </div>
        {renderList(bonuses)}
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
                <option value={PromotionType.BONUS}>Bonus</option>
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
              <div className="md:col-span-2 border border-slate-200 rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black text-slate-500 uppercase">Görsel</p>
                  {formData.imageData && (
                    <button
                      type="button"
                      onClick={clearImage}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700"
                    >
                      Görseli Kaldır
                    </button>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 text-[11px] font-black uppercase bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg cursor-pointer">
                  <ImagePlus size={14} />
                  Görsel Seç (Max 2 MB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
                {formData.imageData && (
                  <img
                    src={formData.imageData}
                    alt="Seçilen görsel önizleme"
                    className="w-full md:w-80 h-40 object-cover rounded-lg border border-slate-200"
                  />
                )}
              </div>
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

      {showTargetForm && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
                {editingTarget ? 'Hedef Düzenle' : 'Yeni Personel Hedefi'}
              </h3>
              <button onClick={() => setShowTargetForm(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleTargetSubmit} className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              {!editingTarget && (
                <label className="md:col-span-2 flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase">
                  <input
                    type="checkbox"
                    checked={assignAllPersonnel}
                    onChange={(e) => setAssignAllPersonnel(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Tüm personeller için hedef oluştur
                </label>
              )}
              <select
                required
                value={targetForm.userId}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, userId: e.target.value }))}
                disabled={assignAllPersonnel}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2 disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">{assignAllPersonnel ? 'Tüm personeller seçildi' : 'Personel Seçin'}</option>
                {personnel.map((person) => (
                  <option key={person.uid} value={person.uid}>
                    {person.displayName}
                  </option>
                ))}
              </select>
              <input
                required
                value={targetForm.title}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Hedef başlığı"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none md:col-span-2"
              />
              <select
                value={targetForm.targetType}
                onChange={(e) => {
                  const nextType = e.target.value as PersonnelTargetType;
                  setTargetForm((prev) => ({
                    ...prev,
                    targetType: nextType,
                    title:
                      nextType === PersonnelTargetType.PRODUCT_QUANTITY
                        ? 'Ürün Adet Hedefi'
                        : nextType === PersonnelTargetType.COLLECTION
                        ? 'Tahsilat Hedefi'
                        : 'Satış Hedefi',
                    metricUnit: nextType === PersonnelTargetType.PRODUCT_QUANTITY ? 'Adet' : 'TL',
                  }));
                }}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              >
                <option value={PersonnelTargetType.SALES}>Satış Hedefi</option>
                <option value={PersonnelTargetType.COLLECTION}>Tahsilat Hedefi</option>
                <option value={PersonnelTargetType.PRODUCT_QUANTITY}>Ürün Adet Hedefi</option>
              </select>
              <input
                value={targetForm.productName}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, productName: e.target.value }))}
                placeholder="Ürün adı (ürün adet hedefi için)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                disabled={targetForm.targetType !== PersonnelTargetType.PRODUCT_QUANTITY}
              />
              <input
                required
                type="number"
                min="1"
                step="0.01"
                value={targetForm.targetValue}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, targetValue: e.target.value }))}
                placeholder="Hedef değeri"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetForm.currentValue}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, currentValue: e.target.value }))}
                placeholder="Gerçekleşen değer (opsiyonel)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                value={targetForm.metricUnit}
                readOnly
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50 text-slate-500"
              />
              <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-3 py-2">
                <CalendarRange size={14} className="text-slate-400" />
                <input
                  required
                  type="date"
                  value={targetForm.startDate}
                  onChange={(e) => setTargetForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  className="text-sm outline-none flex-1"
                />
              </div>
              <input
                required
                type="date"
                value={targetForm.endDate}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, endDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <label className="flex items-center gap-2 text-[10px] font-black text-slate-600 uppercase">
                <input
                  type="checkbox"
                  checked={targetForm.isActive}
                  onChange={(e) => setTargetForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Aktif Hedef
              </label>
              <textarea
                value={targetForm.description}
                onChange={(e) => setTargetForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Hedef açıklaması (opsiyonel)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none min-h-20 md:col-span-2"
              />
              <button
                type="submit"
                className="md:col-span-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
              >
                <Save size={14} className="inline mr-2" />
                Hedefi Kaydet
              </button>
            </form>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className="fixed inset-0 z-[60] bg-black/75 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute -top-10 right-0 text-white/90 hover:text-white text-[11px] font-black uppercase"
            >
              <X size={16} className="inline mr-1" />
              Kapat
            </button>
            <img
              src={previewImage.src}
              alt={`${previewImage.title} büyük görsel`}
              className="w-full max-h-[85vh] object-contain rounded-xl border border-white/20 bg-black/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PromotionsView;
