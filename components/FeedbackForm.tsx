
import React, { useState } from 'react';
import { X, AlertCircle, MessageSquare, Mail, Send } from 'lucide-react';

interface FeedbackFormProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'bug' | 'suggestion';
  userEmail: string;
  userName: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ isOpen, onClose, type, userEmail, userName }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const emailSubject = type === 'bug' 
      ? `[HATA BİLDİRİMİ] ${subject}`
      : `[TALEP/ÖNERİ] ${subject}`;
    
    const emailBody = `${type === 'bug' ? 'Hata Bildirimi' : 'Talep/Öneri'}\n\n` +
      `Kullanıcı: ${userName} (${userEmail})\n` +
      `Tarih: ${new Date().toLocaleString('tr-TR')}\n\n` +
      `Konu: ${subject}\n\n` +
      `Mesaj:\n${message}`;

    const mailtoLink = `mailto:salihyavuz1907@gmail.com?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    window.location.href = mailtoLink;
    
    setTimeout(() => {
      setLoading(false);
      setSubject('');
      setMessage('');
      onClose();
      alert(type === 'bug' ? 'Hata bildirimi email uygulamanızda açıldı.' : 'Talep/öneriniz email uygulamanızda açıldı.');
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            {type === 'bug' ? (
              <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                <AlertCircle size={20} />
              </div>
            ) : (
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <MessageSquare size={20} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-black text-slate-800 uppercase">
                {type === 'bug' ? 'Hata Bildir' : 'Talep - Öneri'}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase">
                {type === 'bug' ? 'Sorun bildirimi yapın' : 'İstek ve önerilerinizi paylaşın'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
              Konu *
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={type === 'bug' ? 'Hatanın kısa açıklaması...' : 'Talep/önerinizin konusu...'}
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-all font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase mb-1.5 tracking-widest">
              {type === 'bug' ? 'Hata Detayları *' : 'Talep/Öneri Detayları *'}
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                type === 'bug' 
                  ? 'Hatanın ne zaman, nasıl oluştuğunu ve hangi sayfada/özellikte olduğunu detaylıca açıklayın...'
                  : 'İsteğinizi veya önerinizi detaylıca açıklayın...'
              }
              className="w-full px-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:border-red-500 focus:bg-white outline-none transition-all font-bold resize-none"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl">
            <div className="flex gap-2">
              <Mail size={14} className="text-blue-600 shrink-0 mt-0.5" />
              <p className="text-[9px] font-bold text-blue-700">
                Form gönderildiğinde varsayılan email uygulamanız açılacak ve mesajınız hazır olacaktır.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-xl hover:bg-slate-200 transition-all"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading || !subject.trim() || !message.trim()}
              className="flex-1 px-4 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Send size={14} />
              {loading ? 'GÖNDERİLİYOR...' : 'Gönder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm;

