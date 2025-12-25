
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ChatMessage, Role, SchoolConfig } from "../types";

const getSystemInstruction = (config: SchoolConfig) => `Anda adalah Asisten Kurikulum Digital SMPN 3 Pacet.
Peran Anda adalah membantu Wakil Kepala Sekolah Bidang Kurikulum, Kepala Sekolah, dan Tim Kurikulum SMPN 3 Pacet.

=== IDENTITAS & KARAKTER ===
- Staf kurikulum profesional, berpengalaman, dan bijaksana.
- Bahasa: Indonesia formal (EYD), jelas, dan santun.
- Konteks: Sekolah Menengah Pertama (SMP) dengan Kurikulum Merdeka.
- Fokus: Ketepatan administrasi, efisiensi kerja, dan solusi praktis.

=== DATA SEKOLAH (KONFIGURASI SAAT INI) ===
1. Nama Sekolah: ${config.schoolName}
2. Kepala Sekolah: ${config.principalName}
3. NIP Kepala Sekolah: ${config.principalNip}
4. Tahun Pelajaran: ${config.schoolYear}
*Instruksi: Gunakan data di atas secara OTOMATIS untuk mengisi KOP (jika teks) dan TANDA TANGAN pada setiap draft dokumen resmi (SK, Surat Tugas, Laporan, dll).*

=== ATURAN FORMATTING (PENTING) ===
1. JANGAN gunakan format cetak tebal (bintang dua/ **). Gunakan teks biasa saja untuk semua kata.
2. Gunakan penomoran bertingkat yang rapi dan resmi untuk struktur dokumen:
   - Level 1: 1., 2., 3.
   - Level 2: a., b., c.
   - Level 3: 1), 2), 3)
3. Gunakan Tabel untuk data yang bersifat rekapitulasi atau perbandingan.
4. Gunakan Header (# atau ##) hanya untuk Judul Utama Dokumen atau Judul BAB.

=== KEMAMPUAN UTAMA ===
1. Administrasi: Program supervisi, kalender pendidikan, jadwal pelajaran.
2. Pembelajaran: Modul Ajar, ATP, CP, TP, Analisis CP.
3. Supervisi: Analisis instrumen, rekap hasil, rekomendasi tindak lanjut.
4. Manajerial: Draft SK, Surat Tugas, Notulen Rapat, Laporan Pengawas.

=== ATURAN KERJA ===
- Selalu berikan dokumen yang "siap pakai" dan "siap cetak".
- Analisis data Excel/Gambar secara mendalam dan berikan rekomendasi strategis.
- Prioritas: Membantu pekerjaan kurikulum agar cepat, rapi, dan profesional.`;

export class GeminiService {
  async chat(messages: ChatMessage[], config: SchoolConfig): Promise<string> {
    // Cek apakah API Key sudah diisi di pengaturan
    if (!config.apiKey || config.apiKey.trim() === "") {
        return "⚠️ **API Key belum diatur.**\n\nSilakan buka menu **Pengaturan** (klik nama akun di pojok kiri bawah), lalu masukkan Google Gemini API Key Anda pada kolom yang tersedia.\n\nAnda bisa mendapatkannya gratis di: aistudio.google.com";
    }

    // Inisialisasi AI secara dinamis menggunakan key dari Config (Input User)
    const ai = new GoogleGenAI({ apiKey: config.apiKey });
    
    // PENTING: Gunakan model eksperimental yang tersedia
    const model = 'gemini-2.0-flash-exp'; 
    
    const contents = messages.map(msg => {
      const parts: any[] = [{ text: msg.text }];
      
      if (msg.files) {
        msg.files.forEach(file => {
          parts.push({
            inlineData: {
              mimeType: file.type,
              data: file.data.split(',')[1] 
            }
          });
        });
      }
      
      return {
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: parts
      };
    });

    try {
      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: getSystemInstruction(config),
          temperature: 0.7,
        },
      });

      return response.text || "Maaf, saya tidak dapat menghasilkan respon saat ini.";
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      
      // Error Handling yang lebih detail untuk User
      let errorMessage = "Terjadi kesalahan saat menghubungi server.";

      if (error.message) {
          if (error.message.includes("API key")) {
              return "⚠️ **API Key Tidak Valid**\nMohon periksa kembali API Key yang Anda masukkan di menu Pengaturan. Pastikan tidak ada spasi tambahan.";
          }
          if (error.message.includes("404") || error.message.includes("not found")) {
               return `⚠️ **Model Tidak Ditemukan**\nModel '${model}' mungkin sedang tidak tersedia atau API Key Anda tidak memiliki akses ke model ini.`;
          }
          if (error.message.includes("429")) {
               return "⚠️ **Batas Kuota Tercapai**\nAnda telah mencapai batas penggunaan API gratis. Mohon tunggu beberapa saat sebelum mencoba lagi.";
          }
          if (error.message.includes("fetch failed")) {
               return "⚠️ **Koneksi Gagal**\nTidak dapat menghubungi server Google. Periksa koneksi internet Anda.";
          }
          // Tampilkan pesan error asli untuk debugging jika tidak masuk kategori di atas
          errorMessage += `\n\nDetail: ${error.message}`;
      }
      
      return `${errorMessage}\n\nSilakan coba lagi.`;
    }
  }
}

export const geminiService = new GeminiService();
