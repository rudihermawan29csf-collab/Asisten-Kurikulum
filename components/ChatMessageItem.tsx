
import React from 'react';
import { ChatMessage, Role } from '../types';

interface ChatMessageItemProps {
  message: ChatMessage;
}

const ChatMessageItem: React.FC<ChatMessageItemProps> = ({ message }) => {
  const isUser = message.role === Role.USER;

  const formatMarkdown = (text: string) => {
    // Remove bold markers completely (as per user request "hilangkan **")
    let processedText = text.replace(/\*\*/g, '');

    const lines = processedText.split('\n');
    let inTable = false;
    let tableRows: string[] = [];
    let formattedHtml: string[] = [];

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Headers
      if (trimmedLine.startsWith('# ')) {
        formattedHtml.push(`<h1 class="text-xl font-bold text-center border-b-2 border-gray-800 pb-2 mb-4 uppercase">${trimmedLine.replace('# ', '')}</h1>`);
      } else if (trimmedLine.startsWith('## ')) {
        formattedHtml.push(`<h2 class="text-lg font-bold mt-6 mb-2 uppercase">${trimmedLine.replace('## ', '')}</h2>`);
      } else if (trimmedLine.startsWith('### ')) {
        formattedHtml.push(`<h3 class="text-md font-bold mt-4 mb-2">${trimmedLine.replace('### ', '')}</h3>`);
      } 
      // Ordered Lists (1., 2., 3.)
      else if (/^\d+\.\s/.test(trimmedLine)) {
        formattedHtml.push(`<div class="ml-2 mb-1 flex"><span class="min-w-[25px]">${trimmedLine.match(/^\d+\./)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^\d+\.\s/, '')}</span></div>`);
      }
      // Letter Lists (a., b., c.)
      else if (/^[a-z]\.\s/.test(trimmedLine)) {
        formattedHtml.push(`<div class="ml-8 mb-1 flex"><span class="min-w-[25px]">${trimmedLine.match(/^[a-z]\./)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^[a-z]\.\s/, '')}</span></div>`);
      }
      // Nested Lists (1), 2))
      else if (/^\d+\)\s/.test(trimmedLine)) {
        formattedHtml.push(`<div class="ml-14 mb-1 flex"><span class="min-w-[25px]">${trimmedLine.match(/^\d+\)/)![0]}</span> <span class="flex-1">${trimmedLine.replace(/^\d+\)\s/, '')}</span></div>`);
      }
      // Table rows
      else if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
        if (!inTable) {
          inTable = true;
          tableRows = [];
        }
        if (!trimmedLine.includes('---')) {
          tableRows.push(trimmedLine);
        }
      } 
      // Blank or regular text
      else {
        if (inTable) {
          inTable = false;
          if (tableRows.length > 0) {
            let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-800 text-xs"><thead>';
            tableRows.forEach((row, index) => {
              const cells = row.split('|').filter(c => c.trim() !== '' || (row.indexOf('|') !== row.lastIndexOf('|') && c === ''));
              if (index === 0) {
                tableHtml += `<tr>${cells.map(c => `<th class="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">${c.trim()}</th>`).join('')}</tr></thead><tbody>`;
              } else {
                tableHtml += `<tr>${cells.map(c => `<td class="border border-gray-800 px-2 py-1">${c.trim()}</td>`).join('')}</tr>`;
              }
            });
            tableHtml += '</tbody></table></div>';
            formattedHtml.push(tableHtml);
          }
        }
        
        if (trimmedLine === '') {
          formattedHtml.push('<div class="h-2"></div>');
        } else {
          formattedHtml.push(`<p class="mb-1">${trimmedLine}</p>`);
        }
      }
    });

    // Close table if it was at the end
    if (inTable && tableRows.length > 0) {
      let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-800 text-xs"><thead>';
      tableRows.forEach((row, index) => {
        const cells = row.split('|').filter(c => c.trim() !== '');
        if (index === 0) {
          tableHtml += `<tr>${cells.map(c => `<th class="border border-gray-800 px-2 py-1 bg-gray-100 font-bold">${c.trim()}</th>`).join('')}</tr></thead><tbody>`;
        } else {
          tableHtml += `<tr>${cells.map(c => `<td class="border border-gray-800 px-2 py-1">${c.trim()}</td>`).join('')}</tr>`;
        }
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
            <title>Dokumen Kurikulum SMPN 3 Pacet</title>
            <style>
              @page { size: auto; margin: 2cm; }
              body { font-family: "Times New Roman", serif; padding: 0; line-height: 1.4; color: black; font-size: 12pt; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              th, td { border: 1px solid black; padding: 6px; text-align: left; vertical-align: top; }
              th { background-color: #f2f2f2; text-transform: uppercase; }
              h1, h2, h3 { line-height: 1.2; margin-bottom: 10px; }
              .header-doc { text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 30px; }
              .header-doc h2 { margin: 0; font-size: 16pt; }
              .header-doc p { margin: 0; font-size: 10pt; }
              .flex { display: flex; }
              .ml-2 { margin-left: 0.5cm; }
              .ml-8 { margin-left: 1cm; }
              .ml-14 { margin-left: 1.5cm; }
              .min-w-[25px] { min-width: 25px; display: inline-block; }
              .flex-1 { flex: 1; }
              p { margin: 0 0 10px 0; }
              h1 { text-align: center; text-transform: uppercase; font-size: 14pt; }
              h2 { font-size: 13pt; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="header-doc">
              <h2>PEMERINTAH KABUPATEN CIANJUR</h2>
              <h2>DINAS PENDIDIKAN PEMUDA DAN OLAHRAGA</h2>
              <h2 style="font-weight: bold;">SMP NEGERI 3 PACET</h2>
              <p>Jl. Raya Pacet No. ... Desa ..., Kec. Pacet, Kabupaten Cianjur</p>
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
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6 group`}>
      <div className={`max-w-[95%] sm:max-w-[85%] rounded-2xl p-5 shadow-sm ${
        isUser 
          ? 'bg-indigo-600 text-white rounded-tr-none' 
          : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
      }`}>
        <div className="flex justify-between items-start mb-4">
          <span className="text-xs font-bold uppercase tracking-widest opacity-60">
            {isUser ? 'PENGGUNA' : 'ASISTEN KURIKULUM'}
          </span>
          {!isUser && (
            <button 
              onClick={handlePrint}
              className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg border border-indigo-100 transition-all flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Cetak Format Resmi</span>
            </button>
          )}
        </div>

        {message.files && message.files.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {message.files.map((file, idx) => (
              <div key={idx} className="relative group/file">
                {file.type.startsWith('image/') ? (
                  <img src={file.data} alt={file.name} className="h-24 w-24 object-cover rounded-lg border border-gray-200" />
                ) : (
                  <div className="h-24 w-24 flex flex-col items-center justify-center bg-gray-50 rounded-lg border border-gray-200 text-center p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[10px] font-medium truncate w-full mt-1 text-gray-500">{file.name}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div 
          className="markdown-content text-sm sm:text-base leading-relaxed text-justify"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.text) }}
        />
      </div>
    </div>
  );
};

export default ChatMessageItem;
