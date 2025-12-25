
import React from 'react';
import { ChatMessage, Role } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  // Simple formatter
  const formatMarkdown = (text: string) => {
    let processedText = text.replace(/\*\*/g, '');
    const lines = processedText.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let formattedHtml: string[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();
      
      // Headers
      if (trimmedLine.startsWith('# ')) formattedHtml.push(`<h1 class="text-base font-bold text-center border-b border-slate-200 pb-2 mb-3 mt-2 uppercase text-slate-800">${trimmedLine.replace('# ', '')}</h1>`);
      else if (trimmedLine.startsWith('## ')) formattedHtml.push(`<h2 class="text-sm font-bold mt-4 mb-2 uppercase text-blue-700">${trimmedLine.replace('## ', '')}</h2>`);
      else if (trimmedLine.startsWith('### ')) formattedHtml.push(`<h3 class="text-[13px] font-bold mt-3 mb-1 text-slate-700">${trimmedLine.replace('### ', '')}</h3>`);
      
      // Lists
      else if (/^\d+\.\s/.test(trimmedLine)) formattedHtml.push(`<div class="ml-2 mb-1 flex"><span class="min-w-[20px] font-medium text-slate-500">${trimmedLine.match(/^\d+\./)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^\d+\.\s/, '')}</span></div>`);
      else if (/^[a-z]\.\s/.test(trimmedLine)) formattedHtml.push(`<div class="ml-6 mb-1 flex"><span class="min-w-[20px] text-slate-500">${trimmedLine.match(/^[a-z]\./)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^[a-z]\.\s/, '')}</span></div>`);
      else if (/^\d+\)\s/.test(trimmedLine)) formattedHtml.push(`<div class="ml-10 mb-1 flex"><span class="min-w-[20px] text-slate-500">${trimmedLine.match(/^\d+\)/)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^\d+\)\s/, '')}</span></div>`);
      
      // Table Logic
      else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) { inTable = true; tableRows = []; }
        if (!trimmedLine.includes('---')) tableRows.push(trimmedLine);
      } 
      else {
        if (inTable) {
          inTable = false;
          if (tableRows.length > 0) {
            let tableHtml = '<div class="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-sm"><table class="min-w-full text-[11px] bg-white">';
            tableRows.forEach((row, index) => {
              const cells = row.split('|').filter(c => c.trim() !== '' || (row.indexOf('|') !== row.lastIndexOf('|') && c === ''));
              if (index === 0) tableHtml += `<thead><tr class="bg-slate-50">${cells.map(c => `<th class="px-2 py-1.5 font-semibold text-slate-700 border-b border-slate-200 text-left">${c.trim()}</th>`).join('')}</tr></thead><tbody>`;
              else tableHtml += `<tr class="border-b border-slate-50 last:border-none">${cells.map(c => `<td class="px-2 py-1.5 text-slate-600">${c.trim()}</td>`).join('')}</tr>`;
            });
            tableHtml += '</tbody></table></div>';
            formattedHtml.push(tableHtml);
          }
        }
        if (trimmedLine === '') formattedHtml.push('<div class="h-2"></div>');
        else formattedHtml.push(`<p class="mb-1.5 leading-relaxed">${trimmedLine}</p>`);
      }
    });

    // Flush remaining table
    if (inTable && tableRows.length > 0) {
       let tableHtml = '<div class="overflow-x-auto my-3 rounded-lg border border-slate-200 shadow-sm"><table class="min-w-full text-[11px] bg-white">';
       tableRows.forEach((row, index) => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        if (index === 0) tableHtml += `<thead><tr class="bg-slate-50">${cells.map(c => `<th class="px-2 py-1.5 font-semibold text-slate-700 border-b border-slate-200 text-left">${c.trim()}</th>`).join('')}</tr></thead><tbody>`;
        else tableHtml += `<tr class="border-b border-slate-50 last:border-none">${cells.map(c => `<td class="px-2 py-1.5 text-slate-600">${c.trim()}</td>`).join('')}</tr>`;
      });
      tableHtml += '</tbody></table></div>';
      formattedHtml.push(tableHtml);
    }

    return formattedHtml.join('');
  };

  const handleDownloadWord = () => {
    // 1. CSS Khusus untuk Dokumen Word agar Resmi dan Rapi
    const css = `
      <style>
        @page { size: A4; margin: 2.54cm; }
        body { font-family: 'Times New Roman', serif; font-size: 12pt; line-height: 1.5; color: #000000; }
        h1, h2, h3, h4, h5, h6 { font-weight: bold; color: #000000; margin-top: 12pt; margin-bottom: 6pt; text-align: center; text-transform: uppercase; }
        h1 { font-size: 14pt; }
        h2 { font-size: 13pt; }
        h3 { font-size: 12pt; }
        p, div { text-align: justify; margin-bottom: 6pt; }
        
        /* Table Styling untuk Word */
        table { width: 100%; border-collapse: collapse; margin: 12pt 0; border: 1px solid #000; }
        th, td { border: 1px solid #000; padding: 4pt 6pt; vertical-align: top; text-align: left; }
        th { background-color: #f2f2f2; text-align: center; font-weight: bold; }
        
        /* Kop Surat Resmi */
        .header-kop { text-align: center; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
        .header-kop .line1 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .header-kop .line2 { margin: 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; }
        .header-kop .school-name { margin: 0; font-size: 18pt; font-weight: bold; text-transform: uppercase; }
        .header-kop .address { margin: 0; font-size: 11pt; font-style: italic; font-weight: normal; text-transform: none; }
      </style>
    `;

    // 2. Konten Header (KOP)
    const header = `
      <div class="header-kop">
        <p class="line1">PEMERINTAH KABUPATEN MOJOKERTO</p>
        <p class="line2">DINAS PENDIDIKAN KABUPATEN MOJOKERTO</p>
        <p class="school-name">SMPN 3 PACET</p>
        <p class="address">Alamat: Jl. Tirtawening Desa Kembangbelor Kec. Pacet Kab. Mojokerto</p>
      </div>
    `;

    // 3. Konten Body (Menggunakan hasil formatMarkdown)
    const bodyContent = formatMarkdown(message.text);

    // 4. Struktur HTML Dokumen Lengkap
    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>Dokumen SMPN 3 Pacet</title>
        ${css}
      </head>
      <body>
        ${header}
        ${bodyContent}
      </body>
      </html>
    `;

    // 5. Generate Blob dan Trigger Download
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dokumen_SMPN3Pacet_${Date.now()}.doc`; // Ekstensi .doc agar kompatibel
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`relative max-w-[90%] sm:max-w-[85%] rounded-[18px] px-4 py-3 shadow-sm ${
        isUser 
          ? 'bg-[#007AFF] text-white rounded-tr-sm shadow-blue-200/50' 
          : 'bg-white/80 backdrop-blur-md text-slate-800 border border-white/60 rounded-tl-sm shadow-slate-200/50'
      }`}>
        {/* Header Bubble */}
        <div className="flex justify-between items-center mb-1">
          <span className={`text-[9px] font-bold uppercase tracking-wider opacity-70 ${isUser ? 'text-blue-100' : 'text-slate-400'}`}>
            {isUser ? 'Anda' : 'Asisten AI'}
          </span>
          {!isUser && (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Tombol Unduh Word */}
              <button 
                onClick={handleDownloadWord} 
                className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 transition-colors flex items-center space-x-1"
                title="Unduh sebagai Dokumen Word"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Word</span>
              </button>
            </div>
          )}
        </div>

        {/* Files */}
        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {message.files.map((file, idx) => (
              <div key={idx} className="relative overflow-hidden rounded-lg border border-white/20">
                {file.type.startsWith('image/') ? (
                  <img src={file.data} className="h-20 w-auto object-cover" />
                ) : (
                  <div className="h-20 w-20 flex items-center justify-center bg-white/20"><span className="text-[9px]">FILE</span></div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div 
          className="markdown-content text-[13.5px] leading-[1.6] font-normal tracking-wide"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
        />
      </div>
    </div>
  );
};

export default ChatMessageItem;
