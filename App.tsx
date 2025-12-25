
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role, FileData } from './types';
import { geminiService } from './services/geminiService';
import ChatMessageItem from './components/ChatMessageItem';
import FileUploader from './components/FileUploader';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileData[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        role: Role.MODEL,
        text: "Selamat datang! Saya Asisten Kurikulum Digital SMPN 3 Pacet.\n\nKonfigurasi Tahun Pelajaran 2025/2026 aktif.\nData Kepala Sekolah: Didik Sulistyo, M.M.Pd (NIP. 196605181989011002) telah dimuat.\n\nSilakan ketik instruksi atau unggah dokumen. Tekan Enter untuk baris baru, dan tombol kirim untuk memproses."
      }
    ]);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handlePaste = async (e: React.ClipboardEvent | ClipboardEvent) => {
    const items = (e as any).clipboardData?.items;
    if (!items) return;

    const newFiles: FileData[] = [];
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const reader = new FileReader();
          const promise = new Promise<FileData>((resolve) => {
            reader.onload = () => {
              resolve({
                name: `screenshot-${Date.now()}-${i}.png`,
                type: blob.type,
                base64: reader.result as string
              });
            };
            reader.readAsDataURL(blob);
          });
          newFiles.push(await promise);
        }
      }
    }

    if (newFiles.length > 0) {
      setPendingFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      role: Role.USER,
      text: input || (pendingFiles.length > 0 ? "Analisis gambar/dokumen yang saya lampirkan ini." : ""),
      files: pendingFiles.map(f => ({ name: f.name, type: f.type, data: f.base64 }))
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingFiles([]);
    setIsLoading(true);

    try {
      const responseText = await geminiService.chat(newMessages);
      setMessages(prev => [...prev, { role: Role.MODEL, text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Maaf, terjadi kendala teknis. Mohon periksa koneksi internet atau coba beberapa saat lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index));
  };

  const templates = [
    { title: "Program Supervisi", prompt: "Buatkan draft lengkap Program Supervisi Akademik untuk semester ini sesuai standar Kurikulum Merdeka." },
    { title: "Modul Ajar", prompt: "Bantu saya menyusun kerangka Modul Ajar untuk mata pelajaran [Sebutkan Mapel] fase D Kelas [7/8/9]." },
    { title: "Laporan Hasil Belajar", prompt: "Bagaimana cara melakukan analisis capaian pembelajaran dari data nilai siswa? Berikan panduan formatnya." },
    { title: "SK Pembagian Tugas", prompt: "Buatkan draft SK Kepala Sekolah tentang Pembagian Tugas Mengajar dan Tugas Tambahan Guru." }
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" onPaste={(e) => handlePaste(e as any)}>
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-slate-200">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.582.477 5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-slate-800 leading-tight">Kurikulum Digital</h1>
            <p className="text-xs text-slate-500 font-medium">SMPN 3 PACET</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-2">Pintasan Cepat</h2>
            <div className="space-y-1">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setInput(t.prompt)}
                  className="w-full text-left p-3 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-all flex items-center group"
                >
                  <span className="flex-1 truncate">{t.title}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-700 mb-2">Tips Penggunaan:</h3>
            <ul className="text-xs text-slate-500 space-y-2 list-disc pl-4">
              <li>Unggah foto/PDF jadwal untuk dianalisis</li>
              <li>Minta draft SK atau Surat Tugas</li>
              <li>Analisis rekap nilai siswa (Excel)</li>
              <li>Buat rubrik penilaian Kurikulum Merdeka</li>
              <li className="font-semibold text-indigo-600 italic">Bisa CTRL+V langsung hasil screenshot!</li>
            </ul>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center p-3 bg-slate-50 rounded-xl">
            <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xs">
              AD
            </div>
            <div className="ml-3 overflow-hidden">
              <p className="text-sm font-semibold text-slate-800 truncate">Admin Kurikulum</p>
              <p className="text-[10px] text-slate-500">Staf Kurikulum</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-white md:bg-transparent">
        {/* Header - Mobile */}
        <header className="md:hidden p-4 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.582.477 5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="font-bold text-slate-800">Kurikulum Digital SMPN 3</h1>
          </div>
          <button className="p-2 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </header>

        {/* Chat Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
          <div className="max-w-4xl mx-auto">
            {messages.map((msg, i) => (
              <ChatMessageItem key={i} message={msg} />
            ))}
            {isLoading && (
              <div className="flex justify-start mb-6">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 md:p-8 pt-0">
          <div className="max-w-4xl mx-auto">
            {/* Pending Files Preview */}
            {pendingFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                {pendingFiles.map((file, i) => (
                  <div key={i} className="relative group flex items-center space-x-2 bg-slate-50 px-2 py-1.5 rounded-lg border border-slate-100">
                    <div className="w-8 h-8 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded">
                      {file.type.startsWith('image/') ? (
                        <img src={file.base64} alt="" className="w-full h-full object-cover rounded" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs text-slate-600 max-w-[100px] truncate">{file.name}</span>
                    <button 
                      onClick={() => removePendingFile(i)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <form 
              onSubmit={handleSendMessage}
              className="relative bg-white rounded-3xl border border-slate-200 shadow-xl focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all flex items-end p-2"
            >
              <div className="pb-1 px-1">
                <FileUploader 
                  onFilesSelected={(files) => setPendingFiles(prev => [...prev, ...files])} 
                  disabled={isLoading}
                />
              </div>
              
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => handlePaste(e)}
                placeholder="Ketik instruksi... (Enter untuk baris baru)"
                className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 text-sm py-3 px-2 resize-none max-h-60 min-h-[44px]"
                rows={1}
                disabled={isLoading}
              />

              <button
                type="submit"
                disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                className={`p-3 rounded-2xl transition-all shadow-lg ${
                  (!input.trim() && pendingFiles.length === 0) || isLoading
                    ? 'bg-slate-100 text-slate-400'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                }`}
                title="Kirim Pesan"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
            <p className="text-[10px] text-center text-slate-400 mt-3">
              Asisten Kurikulum Digital dapat membuat kesalahan. Selalu verifikasi dokumen penting sebelum digunakan secara resmi.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
