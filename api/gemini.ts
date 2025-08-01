// Nota: Fail ini adalah untuk backend anda. Platform pengehosan seperti Vercel atau Netlify
// akan menjalankan fail ini sebagai "Serverless Function" secara automatik jika anda meletakkannya
// di dalam folder bernama /api. Anda juga perlu memastikan pakej @google/genai
// disenaraikan dalam fail package.json anda.

import { GoogleGenAI } from "@google/genai";

// Ini ialah fungsi pengendali (handler) utama. Ia akan berjalan di pelayan setiap kali
// frontend anda membuat permintaan ke /api/gemini.
export default async function handler(request, response) {
  // 1. Keselamatan Asas: Hanya benarkan permintaan jenis POST.
  if (request.method !== 'POST') {
    return response.status(405).json({ error: "Method Not Allowed" });
  }

  // 2. Baca Kunci API anda dengan selamat dari "environment variable" pelayan.
  // Kunci ini TIDAK PERNAH dihantar ke pelayar pengguna.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY environment variable not set on the server.");
    return response.status(500).json({ error: "API key is not configured on the server." });
  }

  // Inisialisasi klien AI dengan selamat di backend.
  const ai = new GoogleGenAI({ apiKey });

  try {
    // 3. Dapatkan 'operation' dan 'params' yang dihantar dari frontend.
    const { operation, params } = request.body;
    if (!operation || !params) {
      return response.status(400).json({ error: "Missing 'operation' or 'params' in request body." });
    }
    
    let apiResult;

    // 4. Lakukan operasi Gemini AI yang diminta.
    // Buat masa ini, kita hanya menyokong 'generateContent'.
    if (operation === 'generateContent') {
        apiResult = await ai.models.generateContent(params);
    } else {
        return response.status(400).json({ error: `Unknown operation: ${operation}` });
    }

    // 5. Hantar semula respons yang berjaya dari Gemini ke frontend.
    return response.status(200).json(apiResult);

  } catch (error) {
    console.error("Error in Gemini API proxy:", error);
    // Hantar mesej ralat umum untuk keselamatan.
    return response.status(500).json({ error: "An error occurred while communicating with the AI service." });
  }
}
