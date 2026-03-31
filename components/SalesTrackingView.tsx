import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Calendar, Save, Target, Trash2 } from 'lucide-react';
import {
  PersonnelSale,
  PersonnelTarget,
  PersonnelTargetType,
  UserProfile,
} from '../types';
import { createRowId, mapPersonnelSale, mapPersonnelTarget, supabase } from '../supabase';

interface SalesTrackingViewProps {
  user: UserProfile;
}

const SalesTrackingView: React.FC<SalesTrackingViewProps> = ({ user }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [sales, setSales] = useState<PersonnelSale[]>([]);
  const [targets, setTargets] = useState<PersonnelTarget[]>([]);
  const [saleFormDate, setSaleFormDate] = useState(new Date().toISOString().slice(0, 10));
  const [saleFormAmount, setSaleFormAmount] = useState('');
  const [saleFormNote, setSaleFormNote] = useState('');

  const loadSales = async () => {
    const monthStart = `${selectedMonth}-01`;
    const monthEnd = `${selectedMonth}-31`;
    const { data, error } = await supabase
      .from('personnel_sales')
      .select('*')
      .eq('user_id', user.uid)
      .gte('sale_date', monthStart)
      .lte('sale_date', monthEnd)
      .order('sale_date', { ascending: true });
    if (error) {
      console.error('Sales load error:', error);
      return;
    }
    setSales((data || []).map(mapPersonnelSale));
  };

  const loadTargets = async () => {
    const { data, error } = await supabase
      .from('personnel_targets')
      .select('*')
      .eq('user_id', user.uid)
      .eq('is_active', true)
      .order('end_date', { ascending: true });
    if (error) {
      console.error('Target load error:', error);
      return;
    }
    setTargets((data || []).map(mapPersonnelTarget));
  };

  useEffect(() => {
    loadSales();
  }, [user.uid, selectedMonth]);

  useEffect(() => {
    loadTargets();
  }, [user.uid]);

  const activeMonthSalesTarget = useMemo(() => {
    return targets.find((target) => {
      if (target.targetType !== PersonnelTargetType.SALES) return false;
      const startMonth = target.startDate.slice(0, 7);
      const endMonth = target.endDate.slice(0, 7);
      return startMonth <= selectedMonth && selectedMonth <= endMonth;
    });
  }, [targets, selectedMonth]);

  const salesSummary = useMemo(() => {
    const monthTotal = sales.reduce((sum, sale) => sum + sale.amount, 0);
    const targetValue = activeMonthSalesTarget?.targetValue || 0;
    const performanceIndex = targetValue > 0 ? monthTotal / targetValue : 0;
    const progressPercent = Math.min(100, performanceIndex * 100);
    const remaining = Math.max(0, targetValue - monthTotal);
    return { monthTotal, targetValue, performanceIndex, progressPercent, remaining };
  }, [sales, activeMonthSalesTarget]);

  const dailySalesRows = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const dayCount = new Date(year, month, 0).getDate();
    const amountByDate = new Map<string, number>();
    sales.forEach((sale) => amountByDate.set(sale.saleDate, sale.amount));

    return Array.from({ length: dayCount }, (_, index) => {
      const day = String(index + 1).padStart(2, '0');
      const date = `${selectedMonth}-${day}`;
      return {
        date,
        dayNumber: index + 1,
        amount: amountByDate.get(date) || 0,
      };
    });
  }, [selectedMonth, sales]);

  const handleSaveSale = async () => {
    const amount = Number(saleFormAmount);
    if (!saleFormDate) {
      alert('Satış tarihi seçmelisiniz.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      alert('Satış tutarı geçersiz.');
      return;
    }

    try {
      const now = Date.now();
      const salesTable: any = supabase.from('personnel_sales');
      const { data: existingSale, error: lookupError } = await salesTable
        .select('id, created_at')
        .eq('user_id', user.uid)
        .eq('sale_date', saleFormDate)
        .maybeSingle();
      if (lookupError) throw lookupError;

      if (existingSale?.id) {
        const { error: updateError } = await salesTable
          .update({
            amount,
            note: saleFormNote || null,
            updated_at: now,
          })
          .eq('id', existingSale.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await salesTable.insert({
          id: createRowId(),
          user_id: user.uid,
          user_name: user.displayName,
          sale_date: saleFormDate,
          amount,
          note: saleFormNote || null,
          created_at: now,
          updated_at: now,
        });
        if (insertError) throw insertError;
      }
      setSaleFormAmount('');
      setSaleFormNote('');
      await loadSales();
    } catch (err: any) {
      console.error('Sales save error:', err);
      const message = String(err?.message || '');
      if (message.includes('personnel_sales') && message.includes('schema cache')) {
        alert('Satış tablosu henüz Supabase tarafında oluşturulmamış. SQL Editor içinde `personnel_sales` tablosunu oluşturup tekrar deneyin.');
        return;
      }
      alert(`Satış kaydı kaydedilemedi: ${message || 'Bilinmeyen hata'}`);
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    const confirmed = confirm('Bu satış kaydını silmek istediğinize emin misiniz?');
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('personnel_sales').delete().eq('id', saleId);
      if (error) throw error;
      await loadSales();
    } catch (_err) {
      alert('Satış kaydı silinemedi.');
    }
  };

  const targetTypeLabel = (targetType: PersonnelTargetType): string => {
    if (targetType === PersonnelTargetType.COLLECTION) return 'Tahsilat Hedefi';
    if (targetType === PersonnelTargetType.PRODUCT_QUANTITY) return 'Ürün Adet Hedefi';
    return 'Satış Hedefi';
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Satış Takibi</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Günlük satış giriş ve hedef takibi</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-2 flex items-center gap-2">
          <Calendar size={14} className="text-red-600" />
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-[10px] font-black text-slate-800 bg-transparent outline-none"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-emerald-100 bg-emerald-50/70">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-emerald-600" />
            <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Aktif Hedefler</p>
          </div>
        </div>
        {targets.length === 0 ? (
          <div className="p-6 text-center text-[10px] font-black text-slate-400 uppercase">Hedef bulunamadı</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {targets.map((target) => {
              const progress =
                target.targetType === PersonnelTargetType.SALES
                  ? salesSummary.progressPercent
                  : target.targetValue > 0 && target.currentValue != null
                  ? Math.min(100, (target.currentValue / target.targetValue) * 100)
                  : 0;
              return (
                <div key={target.id} className="p-4">
                  <p className="text-[11px] font-black text-slate-900 uppercase">{target.title}</p>
                  <p className="text-[10px] font-bold text-blue-600 uppercase mt-1">
                    {targetTypeLabel(target.targetType)}
                    {target.targetType === PersonnelTargetType.PRODUCT_QUANTITY && target.productName
                      ? ` - ${target.productName}`
                      : ''}
                  </p>
                  <p className="text-[10px] text-slate-600 mt-1">
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
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
        <div className="p-3 border-b border-blue-100 bg-blue-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} className="text-blue-600" />
            <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Aylık Performans</p>
          </div>
          <p className="text-[10px] font-black text-slate-700">
            Toplam: {salesSummary.monthTotal.toLocaleString('tr-TR')} TL
          </p>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-black text-slate-500 uppercase">Aylık Satış</p>
            <p className="text-sm font-black text-slate-900 mt-1">{salesSummary.monthTotal.toLocaleString('tr-TR')} TL</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-black text-slate-500 uppercase">Satış Hedefi</p>
            <p className="text-sm font-black text-slate-900 mt-1">{salesSummary.targetValue.toLocaleString('tr-TR')} TL</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-black text-slate-500 uppercase">Performans Endeksi</p>
            <p className="text-sm font-black text-indigo-700 mt-1">{salesSummary.performanceIndex.toFixed(2)}</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-black text-slate-500 uppercase">Gerçekleşme</p>
            <p className="text-sm font-black text-green-700 mt-1">{salesSummary.progressPercent.toFixed(1)}%</p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <p className="text-[9px] font-black text-slate-500 uppercase">Kalan</p>
            <p className="text-sm font-black text-red-700 mt-1">{salesSummary.remaining.toLocaleString('tr-TR')} TL</p>
          </div>
        </div>
        <div className="px-4 pb-3">
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${salesSummary.progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="date"
            value={saleFormDate}
            onChange={(e) => setSaleFormDate(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            type="number"
            min="0"
            step="0.01"
            value={saleFormAmount}
            onChange={(e) => setSaleFormAmount(e.target.value)}
            placeholder="Satış tutarı (TL)"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <input
            value={saleFormNote}
            onChange={(e) => setSaleFormNote(e.target.value)}
            placeholder="Açıklama (opsiyonel)"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            type="button"
            onClick={handleSaveSale}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
          >
            <Save size={14} className="inline mr-2" />
            Satış Kaydet
          </button>
        </div>
        <div className="max-h-80 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-black">Gün</th>
                <th className="px-3 py-2 font-black">Tarih</th>
                <th className="px-3 py-2 font-black text-right">Satış (TL)</th>
                <th className="px-3 py-2 font-black">Not</th>
                <th className="px-3 py-2 font-black text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dailySalesRows.map((row) => {
                const sale = sales.find((item) => item.saleDate === row.date);
                return (
                  <tr key={row.date}>
                    <td className="px-3 py-2 text-[10px] font-black text-slate-700">{row.dayNumber}</td>
                    <td className="px-3 py-2 text-[10px] text-slate-500">{row.date}</td>
                    <td className="px-3 py-2 text-[10px] text-right font-black text-slate-900">
                      {row.amount.toLocaleString('tr-TR')}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-slate-500">{sale?.note || '-'}</td>
                    <td className="px-3 py-2 text-right">
                      {sale ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteSale(sale.id)}
                          className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                          title="Sil"
                        >
                          <Trash2 size={14} />
                        </button>
                      ) : (
                        <span className="text-[9px] text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SalesTrackingView;
