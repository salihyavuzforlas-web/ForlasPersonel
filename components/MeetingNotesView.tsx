import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Edit2, ImagePlus, NotebookText, Plus, Save, Trash2, X } from 'lucide-react';
import { MeetingNote, UserProfile, UserRole } from '../types';
import { createRowId, mapMeetingNote, mapUserProfile, supabase } from '../supabase';

interface MeetingNotesViewProps {
  user: UserProfile;
}

type NoteFormData = {
  title: string;
  meetingDate: string;
  note: string;
  rules: string;
  imageData: string;
  imageType: string;
};

const emptyNoteForm: NoteFormData = {
  title: '',
  meetingDate: new Date().toISOString().slice(0, 10),
  note: '',
  rules: '',
  imageData: '',
  imageType: '',
};

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

const MeetingNotesView: React.FC<MeetingNotesViewProps> = ({ user }) => {
  const [meetingNotes, setMeetingNotes] = useState<MeetingNote[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [formData, setFormData] = useState<NoteFormData>(emptyNoteForm);
  const [personnel, setPersonnel] = useState<UserProfile[]>([]);
  const [selectedAttendeeIds, setSelectedAttendeeIds] = useState<string[]>([]);
  const [allPersonnelSelected, setAllPersonnelSelected] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ src: string; title: string } | null>(null);

  const isAdmin = user.role === UserRole.YONETICI;

  const loadPersonnel = async () => {
    const { data, error } = await supabase.from('users').select('*').eq('role', UserRole.PERSONEL);
    if (error) {
      console.error('Personnel load error:', error);
      return;
    }
    setPersonnel((data || []).map(mapUserProfile));
  };

  const loadNotes = async () => {
    const { data, error } = await supabase.from('meeting_notes').select('*').order('meeting_date', { ascending: false });
    if (error) {
      console.error('Meeting note load error:', error);
      return;
    }
    setMeetingNotes((data || []).map(mapMeetingNote));
  };

  useEffect(() => {
    loadNotes();
    loadPersonnel();
  }, []);

  const filteredNotes = useMemo(() => {
    return meetingNotes.filter((item) => item.meetingDate.slice(0, 7) === selectedMonth);
  }, [meetingNotes, selectedMonth]);

  const openCreateForm = () => {
    setEditingNote(null);
    setFormData(emptyNoteForm);
    setSelectedAttendeeIds([]);
    setAllPersonnelSelected(false);
    setShowForm(true);
  };

  const openEditForm = (note: MeetingNote) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      meetingDate: note.meetingDate,
      note: note.note,
      rules: note.rules || '',
      imageData: note.imageData || '',
      imageType: note.imageType || '',
    });
    if (note.attendees === 'Tüm personeller') {
      setAllPersonnelSelected(true);
      setSelectedAttendeeIds([]);
    } else {
      const names = note.attendees.split(',').map((item) => item.trim()).filter(Boolean);
      const ids = personnel
        .filter((p) => names.includes(p.displayName))
        .map((p) => p.uid);
      setSelectedAttendeeIds(ids);
      setAllPersonnelSelected(false);
    }
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

  const toggleAttendee = (uid: string) => {
    setAllPersonnelSelected(false);
    setSelectedAttendeeIds((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const attendeeNames = allPersonnelSelected
      ? 'Tüm personeller'
      : personnel
          .filter((p) => selectedAttendeeIds.includes(p.uid))
          .map((p) => p.displayName)
          .join(', ');

    if (!attendeeNames) {
      alert('En az bir katılımcı seçmelisiniz.');
      return;
    }

    try {
      if (editingNote) {
        const meetingNotesTable: any = supabase.from('meeting_notes');
        const { error } = await meetingNotesTable
          .update({
            title: formData.title,
            meeting_date: formData.meetingDate,
            attendees: attendeeNames,
            note: formData.note,
            raw: {
              rules: formData.rules || '',
              image_data: formData.imageData || null,
              image_type: formData.imageType || null,
            },
            updated_at: Date.now(),
          })
          .eq('id', editingNote.id);
        if (error) throw error;
      } else {
        const rowId = createRowId();
        const { error } = await (supabase.from('meeting_notes') as any).insert({
          id: rowId,
          title: formData.title,
          meeting_date: formData.meetingDate,
          attendees: attendeeNames,
          note: formData.note,
          raw: {
            rules: formData.rules || '',
            image_data: formData.imageData || null,
            image_type: formData.imageType || null,
          },
          created_by_id: user.uid,
          created_by_name: user.displayName,
          created_at: Date.now(),
          updated_at: Date.now(),
        } as any);
        if (error) throw error;
      }
      await loadNotes();
      setShowForm(false);
      setEditingNote(null);
      setFormData(emptyNoteForm);
    } catch (error) {
      console.error('Meeting note save error:', error);
      alert('Toplantı notu kaydedilirken bir hata oluştu.');
    }
  };

  const handleDelete = async (meetingNote: MeetingNote) => {
    if (!isAdmin) return;
    const confirmed = confirm(`"${meetingNote.title}" toplantı notunu silmek istediğinize emin misiniz?`);
    if (!confirmed) return;
    try {
      const { error } = await supabase.from('meeting_notes').delete().eq('id', meetingNote.id);
      if (error) throw error;
      await loadNotes();
    } catch (error) {
      console.error('Meeting note delete error:', error);
      alert('Toplantı notu silinirken bir hata oluştu.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Toplantı Notları</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Toplantı kayıtları ve kararlar</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateForm}
            className="bg-red-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-red-700 shadow-xl"
          >
            <Plus size={14} className="inline mr-2" />
            Yeni Not
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase">Ay Filtreleme</p>
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
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase">Kayıt</p>
          <p className="text-lg font-black text-slate-900">{filteredNotes.length}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-3 border-b border-slate-100 bg-slate-50/70">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Not Listesi</p>
        </div>

        {filteredNotes.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Not Bulunamadı</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredNotes.map((item) => (
              <div key={item.id} className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <NotebookText size={14} className="text-blue-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{item.title}</h3>
                  </div>
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
                <p className="text-[10px] font-bold text-slate-500 uppercase mt-1">{item.meetingDate}</p>
                <p className="text-[10px] text-slate-500 mt-2">
                  <span className="font-black uppercase text-slate-600">Katılımcılar:</span> {item.attendees}
                </p>
                {item.rules && (
                  <p className="text-[10px] text-slate-600 mt-2 whitespace-pre-wrap">
                    <span className="font-black uppercase text-slate-600">Kurallar:</span> {item.rules}
                  </p>
                )}
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
                <p className="text-[10px] text-slate-600 mt-2 whitespace-pre-wrap">{item.note}</p>
                <p className="text-[9px] text-slate-400 mt-2">Ekleyen: {item.createdByName}</p>
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
                {editingNote ? 'Toplantı Notu Düzenle' : 'Yeni Toplantı Notu'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 grid grid-cols-1 gap-3">
              <input
                required
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Toplantı başlığı"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                type="date"
                required
                value={formData.meetingDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, meetingDate: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
              />
              <input
                value={allPersonnelSelected ? 'Tüm personeller' : personnel.filter((p) => selectedAttendeeIds.includes(p.uid)).map((p) => p.displayName).join(', ')}
                readOnly
                placeholder="Katılımcılar"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none bg-slate-50"
              />
              <div className="border border-slate-200 rounded-lg p-3 space-y-2 max-h-40 overflow-auto">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={allPersonnelSelected}
                    onChange={(e) => {
                      setAllPersonnelSelected(e.target.checked);
                      if (e.target.checked) setSelectedAttendeeIds([]);
                    }}
                    className="rounded border-slate-300"
                  />
                  Tüm personeller
                </label>
                {personnel.map((person) => (
                  <label key={person.uid} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={!allPersonnelSelected && selectedAttendeeIds.includes(person.uid)}
                      onChange={() => toggleAttendee(person.uid)}
                      disabled={allPersonnelSelected}
                      className="rounded border-slate-300"
                    />
                    {person.displayName}
                  </label>
                ))}
              </div>
              <textarea
                value={formData.rules}
                onChange={(e) => setFormData((prev) => ({ ...prev, rules: e.target.value }))}
                placeholder="Toplantı kuralları (opsiyonel)"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none min-h-20"
              />
              <textarea
                required
                value={formData.note}
                onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Toplantı notları ve alınan kararlar"
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none min-h-32"
              />
              <div className="border border-slate-200 rounded-lg p-3 space-y-3">
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
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2.5 text-[11px] font-black uppercase"
              >
                <Save size={14} className="inline mr-2" />
                Kaydet
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
          <div className="relative w-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
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

export default MeetingNotesView;
