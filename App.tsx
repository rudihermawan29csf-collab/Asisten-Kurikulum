
import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, Role, FileData, SchoolConfig, ChatSession } from './types';
import { geminiService } from './services/geminiService';
import ChatMessageItem from './components/ChatMessageItem';
import FileUploader from './components/FileUploader';

const App: React.FC = () => {
  // Config State (with Default Credentials)
  // Check LocalStorage for saved API Key first
  const savedApiKey = localStorage.getItem('smpn3_api_key') || "";
  
  const [config, setConfig] = useState<SchoolConfig>({
    schoolName: "SMPN 3 Pacet",
    principalName: "Didik Sulistyo, M.M.Pd",
    principalNip: "196605181989011002",
    schoolYear: "2025/2026",
    username: "admin",
    password: "007007Rh",
    apiKey: savedApiKey // Load from storage
  });

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isShake, setIsShake] = useState(false);

  // App State
  const [sessionId, setSessionId] = useState<string>(Date.now().toString());
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileData[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'history'>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false); 
  
  // Temp state for editing settings
  const [tempConfig, setTempConfig] = useState<SchoolConfig>(config);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Load History from LocalStorage on mount
  useEffect(() => {
    if (isAuthenticated) {
        const savedSessions = localStorage.getItem('chat_history');
        if (savedSessions) {
        try {
            setSessions(JSON.parse(savedSessions));
        } catch (e) {
            console.error("Failed to parse history");
        }
        }

        // Welcome message
        if (messages.length === 0) {
            const welcomeMsg = {
            role: Role.MODEL,
            text: `Selamat datang! Saya Asisten Kurikulum Digital ${config.schoolName}.\n\nKonfigurasi Tahun Pelajaran ${config.schoolYear} aktif.\nData Kepala Sekolah: ${config.principalName} (NIP. ${config.principalNip}) telah dimuat.\n\n${!config.apiKey ? '⚠️ **PENTING:** API Key belum diatur. Silakan masuk ke menu **Pengaturan** dan masukkan Gemini API Key agar saya dapat bekerja.' : 'Silakan ketik instruksi atau unggah dokumen.'}`
            };
            setMessages([welcomeMsg]);
        }
    }
  }, [isAuthenticated]);

  // Save to History
  useEffect(() => {
    if (messages.length > 1 && isAuthenticated) {
      const title = messages.find(m => m.role === Role.USER)?.text.slice(0, 30) + "..." || "Percakapan Baru";
      setSessions(prev => {
        const existing = prev.findIndex(s => s.id === sessionId);
        const newSessions = [...prev];
        if (existing > -1) {
          newSessions[existing] = { id: sessionId, title, date: Date.now(), messages };
        } else {
          newSessions.unshift({ id: sessionId, title, date: Date.now(), messages });
        }
        localStorage.setItem('chat_history', JSON.stringify(newSessions));
        return newSessions;
      });
    }
  }, [messages, sessionId, isAuthenticated]);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === config.username && loginPass === config.password) {
        setIsAuthenticated(true);
        setLoginError('');
    } else {
        setLoginError("Password Salah");
        setIsShake(true);
        setTimeout(() => setIsShake(false), 500);
        setLoginPass('');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setLoginPass(''); 
    setLoginUser('');
    setShowSettings(false); 
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setSessionId(newId);
    setMessages([{
      role: Role.MODEL,
      text: `Sesi Baru dimulai. \nKonfigurasi: ${config.schoolYear} - ${config.principalName}.`
    }]);
    setPendingFiles([]);
    setActiveTab('chat');
    closeMobileMenu();
  };

  const handleLoadSession = (session: ChatSession) => {
    setSessionId(session.id);
    setMessages(session.messages);
    setActiveTab('chat');
    closeMobileMenu();
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem('chat_history', JSON.stringify(newSessions));
    if (sessionId === id) handleNewChat();
  };

  const handleOpenSettings = () => {
    setTempConfig(config);
    setShowSettings(true);
    closeMobileMenu();
  };

  const handleSaveSettings = () => {
    setConfig(tempConfig);
    // Persist API Key to LocalStorage
    localStorage.setItem('smpn3_api_key', tempConfig.apiKey);
    
    setShowSettings(false);
    setMessages(prev => [...prev, {
      role: Role.MODEL,
      text: `✅ Pengaturan diperbarui.\n\nKS: ${tempConfig.principalName}\nTP: ${tempConfig.schoolYear}\nStatus API Key: ${tempConfig.apiKey ? 'Terpasang' : 'Kosong'}`
    }]);
  };

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
    if (newFiles.length > 0) setPendingFiles(prev => [...prev, ...newFiles]);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!input.trim() && pendingFiles.length === 0) || isLoading) return;

    const userMessage: ChatMessage = {
      role: Role.USER,
      text: input || (pendingFiles.length > 0 ? "Analisis dokumen/gambar ini." : ""),
      files: pendingFiles.map(f => ({ name: f.name, type: f.type, data: f.base64 }))
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setPendingFiles([]);
    setIsLoading(true);

    try {
      const responseText = await geminiService.chat(newMessages, config);
      setMessages(prev => [...prev, { role: Role.MODEL, text: responseText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: Role.MODEL, text: "Maaf, koneksi terputus. Coba lagi." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTemplateClick = (prompt: string) => {
    setInput(prompt);
    closeMobileMenu();
  };

  const templates = [
    { title: "Program Supervisi", prompt: "Buatkan Program Supervisi Akademik semester ini.", icon: "📝", color: "bg-blue-500" },
    { title: "Modul Ajar", prompt: "Buatkan Modul Ajar [Mapel] Kelas [7/8/9].", icon: "📚", color: "bg-orange-400" },
    { title: "SK Tugas", prompt: "Buatkan SK Pembagian Tugas Mengajar.", icon: "⚖️", color: "bg-purple-500" },
    { title: "Laporan Nilai", prompt: "Analisis nilai siswa berikut...", icon: "📊", color: "bg-emerald-500" }
  ];

  // --- LOGIN SCREEN RENDER ---
  if (!isAuthenticated) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-black overflow-hidden relative font-sans">
            <div className="absolute inset-0 bg-[#0f172a]">
                <div className="absolute top-[-10%] left-[-10%] w-[70%] h-[70%] bg-purple-900/40 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-900/40 rounded-full blur-[120px] animate-pulse delay-1000"></div>
                <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-pink-900/30 rounded-full blur-[100px] animate-pulse delay-700"></div>
            </div>
            
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>

            <div className="relative z-10 flex flex-col items-center justify-center w-full max-w-sm p-4 animate-in fade-in zoom-in-95 duration-1000">
                <div className="mb-8 relative group">
                    <div className="absolute -inset-1 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-full blur opacity-40 group-hover:opacity-75 transition duration-1000"></div>
                    <div className="relative w-32 h-32 rounded-full bg-slate-800/50 backdrop-blur-md shadow-2xl flex items-center justify-center border border-white/10 ring-1 ring-white/20">
                         <svg viewBox="0 0 384 512" className="h-16 w-16 fill-white drop-shadow-[0_0_15px_rgba(255,255,255,0.4)]" xmlns="http://www.w3.org/2000/svg">
                             <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
                         </svg>
                    </div>
                </div>

                <div className="text-center mb-8 space-y-1">
                    <h1 className="text-white text-3xl font-bold tracking-tight drop-shadow-xl text-shadow font-sans">
                        Asisten Kurikulum
                    </h1>
                    <p className="text-slate-300 text-sm font-medium tracking-wider uppercase opacity-80">
                        SMPN 3 PACET
                    </p>
                </div>

                <form onSubmit={handleLogin} className={`w-full max-w-[280px] space-y-4 ${isShake ? 'animate-bounce' : ''}`}>
                    <div className="group">
                        <input 
                            type="text" 
                            placeholder="Username" 
                            value={loginUser}
                            onChange={(e) => setLoginUser(e.target.value)}
                            className="w-full bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/70 text-center focus:outline-none focus:bg-white/30 focus:ring-2 focus:ring-blue-400/50 transition-all backdrop-blur-xl shadow-lg"
                        />
                    </div>
                    
                    <div className="relative group">
                        <input 
                            type="password" 
                            placeholder="Password"
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)} 
                            className="w-full bg-white/20 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/70 text-center focus:outline-none focus:bg-white/30 focus:ring-2 focus:ring-blue-400/50 transition-all backdrop-blur-xl shadow-lg"
                        />
                    </div>

                    <div className="flex justify-center pt-8 pb-4">
                        <button 
                            type="submit" 
                            className="group relative flex items-center justify-center w-20 h-20 rounded-full focus:outline-none transition-transform active:scale-95"
                            title="Sentuh untuk Masuk"
                        >
                            <div className="absolute inset-0 rounded-full border border-blue-400/30 animate-[spin_4s_linear_infinite]"></div>
                            <div className="absolute inset-1 rounded-full border border-purple-400/20 animate-[spin_6s_linear_infinite_reverse]"></div>
                            <div className="absolute inset-3 bg-blue-500/10 rounded-full blur-lg group-hover:bg-blue-400/30 transition-all duration-500"></div>
                            <div className="absolute inset-2 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-full border border-white/10 shadow-inner flex items-center justify-center group-hover:border-blue-400/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10 text-white/70 group-hover:text-blue-200 transition-colors drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">
                                    <path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10" />
                                    <path d="M12 2v10" />
                                    <path d="M16.5 12a4.5 4.5 0 1 1-9 0" />
                                    <path d="M7 16a6 6 0 1 0 10 0" />
                                    <path d="M12 22a10 10 0 0 1-10-10" />
                                    <path d="M22 12a10 10 0 0 1-5 8.66" />
                                </svg>
                            </div>
                        </button>
                    </div>
                </form>

                {loginError && (
                    <div className="mt-2 flex items-center bg-red-500/10 border border-red-500/20 backdrop-blur-md px-4 py-2 rounded-full animate-in slide-in-from-top-2">
                        <svg className="w-4 h-4 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <span className="text-red-200 text-xs font-semibold">{loginError}</span>
                    </div>
                )}
            </div>
        </div>
    );
  }

  // --- MAIN APP RENDER ---
  return (
    <div className="flex h-screen w-full items-center justify-center bg-[#c8ced9] p-0 md:p-4 overflow-hidden relative font-sans text-[13px]" onPaste={(e) => handlePaste(e as any)}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#E0C3FC] via-[#8EC5FC] to-[#E0C3FC] opacity-60"></div>
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-400/30 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-400/30 rounded-full blur-[100px]"></div>

      <div className="relative w-full h-full md:max-w-[1280px] md:h-[90vh] bg-white/60 backdrop-blur-2xl shadow-2xl rounded-none md:rounded-2xl border border-white/40 flex overflow-hidden ring-1 ring-white/50">
        
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
            onClick={closeMobileMenu}
          ></div>
        )}

        <aside className={`
            flex flex-col border-r border-white/20
            transition-transform duration-300 ease-in-out
            md:translate-x-0 md:relative md:w-[260px] md:bg-white/40 md:backdrop-blur-xl md:z-20 md:flex
            fixed inset-y-0 left-0 z-50 w-[280px] h-full bg-white/90 backdrop-blur-2xl shadow-2xl md:shadow-none
            ${mobileMenuOpen ? 'translate-x-0 flex' : '-translate-x-full hidden'}
        `}>
          
          <div className="p-4 pt-5 pb-2">
            <div className="flex space-x-2 mb-6 ml-1">
              <button onClick={closeMobileMenu} className="w-3 h-3 rounded-full bg-[#FF5F57] border border-[#E0443E] shadow-sm hover:opacity-80 transition-opacity"></button>
              <div className="w-3 h-3 rounded-full bg-[#FEBC2E] border border-[#D89E24] shadow-sm"></div>
              <div className="w-3 h-3 rounded-full bg-[#28C840] border border-[#1AAB29] shadow-sm"></div>
            </div>
            
            <div className="flex items-center space-x-3 px-1 mb-2">
               <div className="flex items-center justify-center text-slate-800">
                  <svg viewBox="0 0 384 512" className="h-5 w-5 fill-current" xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
               </div>
               <div>
                 <h1 className="font-bold text-slate-800 text-base leading-tight">Kurikulum</h1>
                 <p className="text-[10px] text-slate-500 font-medium tracking-wide">SMPN 3 PACET</p>
               </div>
            </div>
          </div>

          <div className="px-4 mb-2">
            <div className="flex p-1 bg-slate-200/50 rounded-lg">
              <button 
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${activeTab === 'chat' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Menu
              </button>
              <button 
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1 text-[11px] font-medium rounded-md transition-all ${activeTab === 'history' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Riwayat
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-1 custom-scrollbar">
            {activeTab === 'chat' ? (
              <div className="space-y-4">
                 <button onClick={handleNewChat} className="w-full flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-lg transition-colors shadow-sm mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="font-medium text-xs">Chat Baru</span>
                 </button>

                 <div className="space-y-1">
                   <p className="text-[10px] font-semibold text-slate-400 uppercase px-2 mb-1">Templat</p>
                   {templates.map((t, i) => (
                     <button key={i} onClick={() => handleTemplateClick(t.prompt)} className="w-full text-left flex items-center p-2 rounded-lg hover:bg-black/5 group transition-colors">
                       <span className={`w-6 h-6 rounded-md ${t.color} flex items-center justify-center text-[10px] mr-2 shadow-sm`}>{t.icon}</span>
                       <span className="text-xs font-medium text-slate-700 group-hover:text-black">{t.title}</span>
                     </button>
                   ))}
                 </div>
              </div>
            ) : (
              <div className="space-y-1">
                 {sessions.length === 0 && <p className="text-center text-xs text-slate-400 mt-4">Belum ada riwayat.</p>}
                 {sessions.map((s) => (
                   <div key={s.id} onClick={() => handleLoadSession(s)} className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${sessionId === s.id ? 'bg-blue-500 text-white shadow-md' : 'hover:bg-white/50 text-slate-700'}`}>
                     <p className="font-medium truncate text-xs pr-4">{s.title}</p>
                     <p className={`text-[10px] ${sessionId === s.id ? 'text-blue-100' : 'text-slate-400'}`}>{new Date(s.date).toLocaleDateString('id-ID', {day:'numeric', month:'short'})}</p>
                     <button onClick={(e) => handleDeleteSession(e, s.id)} className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all ${sessionId === s.id ? 'text-white' : 'text-slate-400'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                     </button>
                   </div>
                 ))}
              </div>
            )}
          </div>

          <div className="p-3 border-t border-white/20 bg-white/20 backdrop-blur-md">
            <div className="flex items-center space-x-1 mb-2">
                <button 
                  onClick={handleOpenSettings}
                  className="flex-1 flex items-center p-2 rounded-lg hover:bg-white/50 transition-colors text-slate-700 group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 mr-3 border border-white shadow-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate">{config.username}</p>
                    <p className="text-[9px] text-slate-500 truncate">Pengaturan</p>
                  </div>
                </button>
                <button 
                    onClick={handleLogout}
                    className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                    title="Keluar Aplikasi"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
            <div className="text-center pt-2 border-t border-slate-300/30">
               <p className="text-[10px] text-slate-500 font-serif italic">Created by eRHa</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0 bg-transparent relative">
          
          <header className="md:hidden p-3 bg-white/80 backdrop-blur-md border-b border-white/20 flex justify-between items-center sticky top-0 z-30">
             <div className="flex items-center space-x-2">
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-200/50 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

               <svg viewBox="0 0 384 512" className="h-5 w-5 fill-slate-800" xmlns="http://www.w3.org/2000/svg"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
               <div className="flex flex-col -space-y-0.5">
                   <span className="font-bold text-slate-800 leading-tight">Asisten Kurikulum</span>
                   <span className="text-[10px] text-slate-500 font-medium">SMPN 3 PACET</span>
               </div>
             </div>
             <button onClick={handleOpenSettings} className="p-1.5 bg-white/50 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
             </button>
          </header>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 custom-scrollbar">
            <div className="max-w-[800px] mx-auto space-y-5">
              {messages.map((msg, i) => (
                <ChatMessageItem key={i} message={msg} />
              ))}
              {isLoading && (
                <div className="flex justify-start animate-pulse">
                  <div className="bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center space-x-2">
                    <span className="text-[11px] font-medium text-slate-500 mr-2">Thinking</span>
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></div>
                    <div className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-4 md:p-6 pt-0 z-20">
            <div className="max-w-[800px] mx-auto relative">
              
              {pendingFiles.length > 0 && (
                <div className="absolute bottom-full mb-3 left-0 flex flex-wrap gap-2 bg-white/80 backdrop-blur-xl p-2 rounded-xl border border-white/50 shadow-lg animate-in slide-in-from-bottom-2">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="relative group flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg border border-slate-200">
                      {file.type.startsWith('image/') ? (
                        <img src={file.base64} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <span className="text-[9px] text-slate-500 font-bold">DOC</span>
                      )}
                      <button onClick={() => setPendingFiles(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-sm hover:scale-110 transition-transform">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="group relative bg-white/70 backdrop-blur-2xl rounded-[24px] border border-white/60 shadow-xl hover:shadow-2xl hover:bg-white/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-400/30 transition-all duration-300 flex items-end p-1.5">
                <div className="pl-1 pb-1">
                   <FileUploader onFilesSelected={(files) => setPendingFiles(prev => [...prev, ...files])} disabled={isLoading} />
                </div>
                
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onPaste={(e) => handlePaste(e)}
                  placeholder="Ketik instruksi..."
                  className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 text-[13px] py-3 px-2 resize-none max-h-32 min-h-[44px] placeholder-slate-400 leading-relaxed"
                  rows={1}
                  disabled={isLoading}
                  style={{ outline: 'none' }}
                />

                <button
                  type="submit"
                  disabled={(!input.trim() && pendingFiles.length === 0) || isLoading}
                  className={`p-2 m-1 rounded-full transition-all duration-300 ${
                    (!input.trim() && pendingFiles.length === 0) || isLoading
                      ? 'bg-slate-200 text-slate-400'
                      : 'bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:scale-105'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                  </svg>
                </button>
              </form>
              <div className="text-center mt-2 opacity-60">
                <span className="text-[10px] text-slate-500">
                  {config.schoolName} AI
                </span>
              </div>
            </div>
          </div>
        </main>

        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="bg-white/85 backdrop-blur-2xl w-full max-w-[400px] rounded-2xl shadow-2xl border border-white/60 p-5 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto custom-scrollbar">
               <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-200/50">
                 <h2 className="text-sm font-bold text-slate-800">Pengaturan Sekolah</h2>
                 <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
               </div>
               <div className="space-y-3">
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nama Sekolah</label>
                   <input type="text" value={tempConfig.schoolName} onChange={(e) => setTempConfig({...tempConfig, schoolName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm" />
                 </div>
                 <div>
                   <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tahun Pelajaran</label>
                   <input type="text" value={tempConfig.schoolYear} onChange={(e) => setTempConfig({...tempConfig, schoolYear: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                 </div>
                 <div className="pt-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Kepala Sekolah</label>
                    <input type="text" value={tempConfig.principalName} onChange={(e) => setTempConfig({...tempConfig, principalName: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm mb-2" />
                    <input type="text" value={tempConfig.principalNip} onChange={(e) => setTempConfig({...tempConfig, principalNip: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" placeholder="NIP" />
                 </div>

                 {/* API Key Settings Section */}
                 <div className="pt-4 mt-4 border-t border-slate-200/50 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 mb-2 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                        API Key (Wajib)
                    </h3>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Gemini API Key</label>
                    <input 
                        type="password" 
                        value={tempConfig.apiKey} 
                        onChange={(e) => setTempConfig({...tempConfig, apiKey: e.target.value})} 
                        className="w-full bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm placeholder-slate-300"
                        placeholder="Tempel AIza... disini" 
                    />
                    <p className="text-[9px] text-slate-400 mt-1">
                        Dapatkan key gratis di <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-500 hover:underline">aistudio.google.com</a>. Key tersimpan lokal di browser.
                    </p>
                 </div>
                 
                 {/* Login Settings Section */}
                 <div className="pt-4 mt-4 border-t border-slate-200/50">
                    <h3 className="text-xs font-bold text-slate-800 mb-3 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M2.166 10a.75.75 0 01.75-.75h14.168a.75.75 0 01.75.75v3.5A2.75 2.75 0 0114.084 16H5.916A2.75 2.75 0 013.166 13.5V10zm5.5 0a.75.75 0 01.75-.75h3.168a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75H8.416a.75.75 0 01-.75-.75V10z" clipRule="evenodd"/><path d="M5.916 2.5a.75.75 0 01.75.75v5h6.668v-5a.75.75 0 011.5 0v5.25c0 .414-.336.75-.75.75H5.916a.75.75 0 01-.75-.75V3.25a.75.75 0 01.75-.75z" /></svg>
                        Akun Login
                    </h3>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Username</label>
                    <input type="text" value={tempConfig.username} onChange={(e) => setTempConfig({...tempConfig, username: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm mb-2" />
                    
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
                    <input type="password" value={tempConfig.password} onChange={(e) => setTempConfig({...tempConfig, password: e.target.value})} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" />
                 </div>
               </div>
               <div className="mt-6 flex space-x-2">
                 <button onClick={() => setShowSettings(false)} className="flex-1 px-3 py-2 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg hover:bg-slate-200">Batal</button>
                 <button onClick={handleSaveSettings} className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-blue-700">Simpan</button>
               </div>
               
               <div className="mt-6 pt-4 border-t border-red-200 text-center">
                   <button 
                     onClick={handleLogout}
                     className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center justify-center mx-auto"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                       </svg>
                       Keluar dari Aplikasi
                   </button>
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
