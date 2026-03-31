import React, { useEffect, useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '../supabase';

interface SalesTopPerformersCardProps {
  monthKey: string;
}

type TopSellerRow = {
  userId: string;
  userName: string;
  totalSales: number;
};

const SalesTopPerformersCard: React.FC<SalesTopPerformersCardProps> = ({ monthKey }) => {
  const [topSellers, setTopSellers] = useState<TopSellerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    const loadTopSellers = async () => {
      setLoading(true);
      setLoadError(null);
      const monthStart = `${monthKey}-01`;
      const monthEnd = `${monthKey}-31`;
      const { data, error } = await supabase
        .from('personnel_sales')
        .select('user_id, user_name, amount')
        .gte('sale_date', monthStart)
        .lte('sale_date', monthEnd);

      if (!isActive) return;

      if (error) {
        setTopSellers([]);
        setLoadError(error.message || 'Satış verisi yüklenemedi.');
        setLoading(false);
        return;
      }

      const totals = new Map<string, TopSellerRow>();
      (data || []).forEach((row: any) => {
        const userId = String(row.user_id || '');
        const userName = String(row.user_name || 'Personel');
        const amount = Number(row.amount || 0);
        if (!userId || !Number.isFinite(amount)) return;
        const existing = totals.get(userId);
        if (existing) {
          existing.totalSales += amount;
        } else {
          totals.set(userId, { userId, userName, totalSales: amount });
        }
      });

      const ranked = Array.from(totals.values())
        .sort((a, b) => b.totalSales - a.totalSales)
        .slice(0, 3);

      setTopSellers(ranked);
      setLoading(false);
    };

    void loadTopSellers();

    return () => {
      isActive = false;
    };
  }, [monthKey]);

  const monthLabel = useMemo(() => {
    const parsed = new Date(`${monthKey}-01`);
    const formatted = parsed.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [monthKey]);

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="p-3 border-b border-amber-100 bg-amber-50/70 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-600" />
          <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">En Çok Satış Yapan İlk 3</p>
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase">{monthLabel}</p>
      </div>

      {loading ? (
        <div className="p-4 text-[10px] font-bold text-slate-400 uppercase">Yükleniyor...</div>
      ) : loadError ? (
        <div className="p-4 text-[10px] font-bold text-red-600 uppercase">{loadError}</div>
      ) : topSellers.length === 0 ? (
        <div className="p-4 text-[10px] font-bold text-slate-400 uppercase">Bu ay için satış verisi yok</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[9px] uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2 font-black">Sıra</th>
                <th className="px-3 py-2 font-black">Personel</th>
                <th className="px-3 py-2 font-black text-right">Toplam Satış</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topSellers.map((seller, index) => (
                <tr key={seller.userId}>
                  <td className="px-3 py-2 text-[10px] font-black text-slate-700">#{index + 1}</td>
                  <td className="px-3 py-2 text-[10px] font-bold text-slate-700 uppercase">{seller.userName}</td>
                  <td className="px-3 py-2 text-[10px] font-black text-right text-slate-900">
                    {seller.totalSales.toLocaleString('tr-TR')} TL
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SalesTopPerformersCard;
