
import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, FileText, Smartphone, Camera } from 'lucide-react';
import { CATEGORIES } from '../constants';
import { Expense, RoutePlan } from '../types';

interface ExpenseFormProps {
  onSubmit: (data: any) => void;
  onClose: () => void;
  initialData?: Expense | null;
  routeOptions?: RoutePlan[];
}

const ExpenseForm: React.FC<ExpenseFormProps> = ({ onSubmit, onClose, initialData, routeOptions = [] }) => {
  const [formData, setFormData] = useState({
    amount: '',
    category: CATEGORIES[0],
    expenseDate: new Date().toISOString().slice(0, 10),
    description: '',
    route: '',
    plateNumber: '',
    liter: '',
    literPrice: '',
    receiptData: '',
    receiptType: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        amount: initialData.amount.toString(),
        category: initialData.category,
        expenseDate: initialData.expenseDate,
        description: initialData.description,
        route: initialData.route || '',
        plateNumber: initialData.plateNumber || '',
        liter: initialData.liter?.toString() || '',
        literPrice: initialData.literPrice?.toString() || '',
        receiptData: initialData.receiptData || '',
        receiptType: initialData.receiptType || ''
      });
    }
  }, [initialData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Dosya boyutu 2MB'dan küçük olmalıdır.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        receiptData: reader.result as string,
        receiptType: file.type
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount) return;
    
    // Araç masrafı için plaka zorunlu
    if (formData.category === 'Araç masrafı' && !formData.plateNumber) {
      alert('Araç masrafı için plaka bilgisi zorunludur.');
      return;
    }
    
    // Araç masrafı ve Diğer için açıklama zorunlu
    if ((formData.category === 'Araç masrafı' || formData.category === 'Diğer') && !formData.description) {
      alert('Açıklama zorunludur.');
      return;
    }
    
    onSubmit(formData);
  };

  const showDescription = formData.category === 'Araç masrafı' || formData.category === 'Diğer';
  const showPlateNumber = formData.category === 'Araç masrafı';
  const showFuelFields = formData.category === 'Yakıt';
  const monthFilteredRoutes = routeOptions.filter(
    (routePlan) => routePlan.routeDate.slice(0, 7) === formData.expenseDate.slice(0, 7)
  );
  const selectableRoutes = monthFilteredRoutes.length > 0 ? monthFilteredRoutes : routeOptions;
  const hasSelectableRoutes = selectableRoutes.length > 0;

  const routeLabel = (routePlan: RoutePlan): string =>
    `${routePlan.routeDate} | ${routePlan.title} (${routePlan.startLocation} - ${routePlan.endLocation})`;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-end md:items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-white w-full max-w-xl h-[92vh] md:h-auto md:rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 border border-slate-200 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50 shrink-0">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">
              {initialData ? 'Kaydı Düzenle' : 'Yeni Masraf Girişi'}
            </h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 tracking-widest flex items-center gap-1">
              <Smartphone size={8} /> Mobile Optimized Form
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-600 transition-colors bg-white shadow-sm border border-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto">
          <form id="expense-form" onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Harcama Tutarı (TRY)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">₺</span>
                    <input
                      type="number"
                      required
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full pl-9 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Kategori</label>
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      const newCategory = e.target.value;
                      // Kategori değiştiğinde ilgili alanları temizle
                      setFormData({
                        ...formData,
                        category: newCategory,
                        plateNumber: newCategory !== 'Araç masrafı' ? '' : formData.plateNumber,
                        description: (newCategory !== 'Araç masrafı' && newCategory !== 'Diğer') ? '' : formData.description,
                        liter: newCategory !== 'Yakıt' ? '' : formData.liter,
                        literPrice: newCategory !== 'Yakıt' ? '' : formData.literPrice
                      });
                    }}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                  >
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Fatura/Fiş Tarihi</label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 outline-none transition-all shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Rut</label>
                  {hasSelectableRoutes ? (
                    <select
                      required
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                    >
                      <option value="">Rut Seçin...</option>
                      {selectableRoutes.map((routePlan) => (
                        <option key={routePlan.id} value={routeLabel(routePlan)}>
                          {routeLabel(routePlan)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Harcama yapılan rut/güzergah..."
                      value={formData.route}
                      onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all shadow-sm"
                    />
                  )}
                </div>

                {showPlateNumber && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Plaka *</label>
                    <input
                      type="text"
                      required
                      placeholder="Plaka numarasını girin..."
                      value={formData.plateNumber}
                      onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all shadow-sm"
                    />
                  </div>
                )}

                {showFuelFields && (
                  <>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Litre</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Litre miktarı..."
                        value={formData.liter}
                        onChange={(e) => setFormData({ ...formData, liter: e.target.value })}
                        className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all shadow-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Litre Fiyatı (TRY)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-base">₺</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.literPrice}
                          onChange={(e) => setFormData({ ...formData, literPrice: e.target.value })}
                          className="w-full pl-9 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 focus:ring-4 focus:ring-red-50 outline-none transition-all shadow-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {showDescription && (
                  <div>
                    <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Açıklama *</label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Harcama detayını yazın..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black focus:border-red-500 outline-none transition-all resize-none shadow-sm"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">Belge Yükle</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-red-600 text-white hover:bg-red-700 transition-colors"
                  >
                    <Camera size={12} className="inline mr-1" />
                    Kamera ile Çek
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    <Upload size={12} className="inline mr-1" />
                    Dosya Seç
                  </button>
                </div>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-6 transition-all cursor-pointer min-h-[160px] ${
                    formData.receiptData ? 'border-red-200 bg-red-50/20' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {formData.receiptData ? (
                    <div className="w-full flex flex-col items-center justify-center gap-3">
                      {formData.receiptType.startsWith('image/') ? (
                        <img src={formData.receiptData} alt="Preview" className="max-h-24 rounded-xl shadow-md border-2 border-white" />
                      ) : (
                        <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 text-red-600">
                          <FileText size={32} />
                        </div>
                      )}
                      <p className="text-[10px] font-black text-slate-600 uppercase">BELGE YÜKLENDİ</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase">(Değiştirmek için tıklayın)</p>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <div className="mx-auto w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-600 shadow-sm border border-slate-100">
                        <Upload size={24} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-slate-600 uppercase">FOTOĞRAF ÇEK / SEÇ</p>
                        <p className="text-[8px] text-slate-400 font-bold">PDF, JPG, PNG (Max 2MB)</p>
                      </div>
                    </div>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*,application/pdf"
                  />
                  <input
                    type="file"
                    ref={cameraInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/*"
                    capture="environment"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Buttons */}
        <div className="p-6 pt-2 bg-white border-t border-slate-100 shrink-0 mb-safe">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-4 border border-slate-200 text-slate-500 text-[10px] font-black uppercase rounded-2xl hover:bg-slate-50 transition-colors"
            >
              İptal
            </button>
            <button
              form="expense-form"
              type="submit"
              className="flex-[2] px-4 py-4 bg-red-600 text-white text-[10px] font-black uppercase rounded-2xl hover:bg-red-700 shadow-xl shadow-red-200 transition-all active:scale-95"
            >
              {initialData ? 'GÜNCELLE' : 'MASRAFI GÖNDER'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseForm;
