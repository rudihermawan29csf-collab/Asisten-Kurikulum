
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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
       printWindow.document.write(`
        <html>
          <head>
            <title>Dokumen Cetak</title>
            <style>
              @page { size: auto; margin: 2cm; }
              body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; color: black; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid black; padding: 5px; text-align: left; vertical-align: top; }
              th { background-color: #f0f0f0; text-align: center; font-weight: bold; }
              h1, h2 { text-align: center; text-transform: uppercase; margin-bottom: 20px; }
              .header { text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
              .header h2 { margin: 0; font-size: 14pt; font-weight: normal; }
              .header h2.bold { font-weight: bold; font-size: 16pt; }
              .header p { margin: 0; font-size: 10pt; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>PEMERINTAH KABUPATEN CIANJUR</h2>
              <h2>DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA</h2>
              <h2 class="bold">SMP NEGERI 3 PACET</h2>
              <p>Alamat: Jl. Raya Pacet, Cianjur - Jawa Barat</p>
            </div>
            ${formatMarkdown(message.text)}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
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
            <button onClick={handlePrint} className="text-[9px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200 transition-colors flex items-center space-x-1 opacity-0 group-hover:opacity-100">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              <span>Cetak</span>
            </button>
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
