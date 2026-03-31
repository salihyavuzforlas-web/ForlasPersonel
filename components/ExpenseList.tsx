
import React, { useState, useMemo, useEffect } from 'react';
import { Expense, ExpenseStatus } from '../types';
import { STATUS_UI, CATEGORIES } from '../constants';
import {
  Edit2,
  Paperclip,
  CheckSquare,
  Square,
  CreditCard,
  ChevronDown,
  ChevronUp,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onEdit?: (expense: Expense) => void;
  onApprove?: (expense: Expense) => void;
  onReject?: (expense: Expense) => void;
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({
  expenses,
  onEdit,
  onApprove,
  onReject,
  selectable,
  onSelectionChange,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [previewExpense, setPreviewExpense] = useState<Expense | null>(null);

  // Tarihe göre grupla ve kategorilere göre sırala
  const groupedExpenses = useMemo(() => {
    const grouped: Record<string, Expense[]> = {};
    
    expenses.forEach(expense => {
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
  }, [expenses]);

  // İlk yüklendiğinde tüm tarihleri açık yap
  useEffect(() => {
    if (expenses.length > 0 && expandedDates.size === 0) {
      const allDates = new Set(groupedExpenses.map(g => g.date));
      setExpandedDates(allDates);
    }
  }, [expenses.length, groupedExpenses]);

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

  const openAttachment = (expense: Expense) => {
    if (!expense.receiptData) return;
    setPreviewExpense(expense);
  };

  const handleToggleSelect = (id: string) => {
    const newSelection = selectedIds.includes(id) 
      ? selectedIds.filter(i => i !== id) 
      : [...selectedIds, id];
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  const handleSelectAll = () => {
    const newSelection = selectedIds.length === expenses.length ? [] : expenses.map(e => e.id);
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection);
  };

  if (expenses.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Kayıt Bulunamadı</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <button onClick={handleSelectAll} className="hover:text-red-600 transition-colors">
                    {selectedIds.length === expenses.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  </button>
                </th>
              )}
              <th className="px-4 py-3">Kategori</th>
              <th className="px-4 py-3">Açıklama</th>
              <th className="px-4 py-3">Belge</th>
              <th className="px-4 py-3">Tutar</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3 text-right">İşlemler</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {groupedExpenses.map(({ date, expenses: dayExpenses, total }) => {
              const expanded = isExpanded(date);
              return (
                <React.Fragment key={date}>
                  <tr 
                    className="bg-slate-100/50 cursor-pointer hover:bg-slate-200/50 transition-colors"
                    onClick={() => toggleDateGroup(date)}
                  >
                    {selectable && <td className="px-4 py-3"></td>}
                    <td colSpan={selectable ? 6 : 5} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {expanded ? <ChevronUp size={14} className="text-slate-600" /> : <ChevronDown size={14} className="text-slate-600" />}
                          <span className="text-[11px] font-black text-slate-900">
                            {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-[11px] font-black text-slate-900">
                          TOPLAM: {total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {expanded && dayExpenses.map(expense => {
                  const isSelected = selectedIds.includes(expense.id);
                  return (
                    <tr 
                      key={expense.id} 
                      className={`transition-colors group ${isSelected ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}`}
                      onClick={() => selectable && handleToggleSelect(expense.id)}
                    >
                      {selectable && (
                        <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => handleToggleSelect(expense.id)} className={`${isSelected ? 'text-red-600' : 'text-slate-200'}`}>
                            {isSelected ? <CheckSquare size={14} /> : <Square size={14} />}
                          </button>
                        </td>
                      )}
                      <td className="px-4 py-2.5">
                        <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md uppercase tracking-tighter">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-[11px] text-slate-600 truncate max-w-[150px]">
                        <div className="space-y-1">
                          <p className="truncate max-w-[150px]">{expense.description}</p>
                          {expense.status === ExpenseStatus.REJECTED && expense.rejectionReason && (
                            <p className="text-[9px] text-red-600 font-bold truncate max-w-[150px]">
                              Red Sebebi: {expense.rejectionReason}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        {expense.receiptData ? (
                          <button 
                            onClick={(e) => { e.stopPropagation(); openAttachment(expense); }}
                            className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded hover:bg-red-600 hover:text-white transition-all uppercase border border-red-100"
                          >
                            <Paperclip size={10} /> Belge
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-300 uppercase italic">Yok</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-[11px] font-black text-slate-900">
                        {expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase w-max border border-current/10 ${STATUS_UI[expense.status].color}`}>
                          {STATUS_UI[expense.status].label}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5 items-center">
                          {expense.status === ExpenseStatus.SUBMITTED && onApprove && onReject && (
                            <>
                              <button
                                type="button"
                                onClick={() => onApprove(expense)}
                                className="p-1.5 text-green-600 bg-green-50 hover:bg-green-600 hover:text-white border border-green-100 rounded shadow-sm transition-all"
                                title="Onayla"
                              >
                                <CheckCircle size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => onReject(expense)}
                                className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-600 hover:text-white border border-amber-100 rounded shadow-sm transition-all"
                                title="Reddet"
                              >
                                <XCircle size={13} />
                              </button>
                            </>
                          )}
                          {onEdit && (
                            <button 
                              type="button"
                              onClick={() => onEdit(expense)}
                              className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white border border-blue-100 rounded shadow-sm transition-all"
                            >
                              <Edit2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden p-1">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {groupedExpenses.map(({ date, expenses: dayExpenses, total }, groupIndex) => {
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
                      {expanded ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronUp size={14} className="text-slate-600" />}
                      <span className="text-[11px] font-black text-slate-900">
                        {new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                    <span className="text-[11px] font-black text-slate-900">
                      TOPLAM: {total.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </span>
                  </div>
                </div>
                
                {/* O Günün Masrafları */}
                {expanded && dayExpenses.map((expense, expenseIndex) => {
                const isSelected = selectedIds.includes(expense.id);
                const isLastInGroup = expenseIndex === dayExpenses.length - 1;
                const isLastGroup = groupIndex === groupedExpenses.length - 1;
                return (
                  <div 
                    key={expense.id}
                    onClick={() => selectable && handleToggleSelect(expense.id)}
                    className={`p-4 transition-all active:scale-[0.98] ${
                      isSelected ? 'bg-red-50' : 'bg-white'
                    } ${!isLastInGroup || !isLastGroup ? 'border-b border-slate-100' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${STATUS_UI[expense.status].color.split(' ')[0]}`}>
                          <CreditCard size={14} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-900 uppercase tracking-tight">{expense.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900 leading-none">
                          {expense.amount.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                        </p>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-current/10 ${STATUS_UI[expense.status].color}`}>
                          {STATUS_UI[expense.status].label}
                        </span>
                      </div>
                    </div>

                    {expense.description && (
                      <div className="bg-slate-50 rounded-xl p-3 mb-3 border border-slate-100">
                        <p className="text-[10px] font-medium text-slate-600 line-clamp-2">{expense.description}</p>
                        {expense.status === ExpenseStatus.REJECTED && expense.rejectionReason && (
                          <p className="text-[9px] text-red-600 font-bold mt-1 line-clamp-2">
                            Red Sebebi: {expense.rejectionReason}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {expense.receiptData && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); openAttachment(expense); }}
                            className="flex items-center gap-1 text-[9px] font-black text-red-600 bg-white border border-red-100 px-3 py-1.5 rounded-lg uppercase shadow-sm"
                          >
                            <Paperclip size={10} /> Belgeyi Aç
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {expense.status === ExpenseStatus.SUBMITTED && onApprove && onReject && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onApprove(expense);
                              }}
                              className="flex items-center gap-1 text-[9px] font-black text-green-700 bg-white border border-green-100 px-3 py-1.5 rounded-lg uppercase shadow-sm"
                            >
                              <CheckCircle size={10} /> Onayla
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onReject(expense);
                              }}
                              className="flex items-center gap-1 text-[9px] font-black text-amber-700 bg-white border border-amber-100 px-3 py-1.5 rounded-lg uppercase shadow-sm"
                            >
                              <XCircle size={10} /> Reddet
                            </button>
                          </>
                        )}
                        {onEdit && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(expense);
                            }}
                            className="flex items-center gap-1 text-[9px] font-black text-blue-600 bg-white border border-blue-100 px-3 py-1.5 rounded-lg uppercase shadow-sm"
                          >
                            <Edit2 size={10} /> Düzenle
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {previewExpense && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Belge Önizleme</p>
              <button
                onClick={() => setPreviewExpense(null)}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bg-slate-100 p-3 h-[75vh] overflow-auto flex items-center justify-center">
              {previewExpense.receiptType?.includes('pdf') ? (
                <iframe
                  src={previewExpense.receiptData}
                  title="Belge Önizleme"
                  className="w-full h-full rounded-lg bg-white"
                />
              ) : (
                <img
                  src={previewExpense.receiptData}
                  alt="Belge"
                  className="max-w-full max-h-full rounded-lg shadow-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
