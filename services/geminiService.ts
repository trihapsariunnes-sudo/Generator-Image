
import { GoogleGenAI, Type } from "@google/genai";
import type { PromptParts } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const generationModel = "gemini-2.5-flash";

export const generatePromptDetails = async (userInput: string): Promise<PromptParts> => {
    try {
        const response = await ai.models.generateContent({
            model: generationModel,
            contents: `Kembangkan ide sederhana ini "${userInput}" menjadi prompt gambar yang detail. Fokus pada tema karakter muda.`,
            config: {
                systemInstruction: `Anda adalah asisten kreatif yang berspesialisasi dalam menghasilkan prompt gambar terperinci untuk generator seni AI. Tema utamanya adalah 'karakter muda'. Pastikan karakter yang dideskripsikan berusia di atas 18 tahun. Kembangkan ide pengguna menjadi prompt yang kaya dan mendetail yang dipecah menjadi empat bagian: latar belakang, subjek, pose, dan kamera. Berikan jawaban HANYA dengan objek JSON yang valid dan sesuai dengan skema yang diberikan. Buat deskripsi dalam Bahasa Indonesia.`,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        background: {
                            type: Type.STRING,
                            description: "Deskripsi detail tentang latar belakang atau lingkungan adegan. Buatlah menjadi hidup dan menarik.",
                        },
                        subjek: {
                            type: Type.STRING,
                            description: "Deskripsi yang sangat detail tentang subjek utama, yang merupakan karakter muda. Jelaskan penampilan, pakaian, ekspresi, dan gaya mereka.",
                        },
                        pose: {
                            type: Type.STRING,
                            description: "Deskripsi detail tentang pose atau tindakan karakter. Haruskah dinamis, tenang, termenung, atau ceria?",
                        },
                        kamera: {
                            type: Type.STRING,
                            description: "Deskripsi tentang pengaturan kamera, termasuk jenis bidikan, sudut, dan pencahayaan. Selalu tentukan lensa berkualitas tinggi (misalnya, lensa prime, f/1.8, 85mm) dan pencahayaan sinematik untuk menghasilkan gambar yang tajam, detail, dan berkualitas profesional.",
                        },
                    },
                    required: ["background", "subjek", "pose", "kamera"],
                },
            },
        });
        
        const jsonText = response.text.trim();
        const parsedJson = JSON.parse(jsonText);

        // Validate the structure
        if (parsedJson.background && parsedJson.subjek && parsedJson.pose && parsedJson.kamera) {
            return parsedJson as PromptParts;
        } else {
            throw new Error("Invalid JSON structure received from API.");
        }
    } catch (error) {
        console.error("Error generating prompt details:", error);
        throw new Error("Failed to generate prompt details from Gemini API.");
    }
};

export const translateToEnglish = async (text: string): Promise<string> => {
    if (!text) return "";
    try {
        const response = await ai.models.generateContent({
            model: generationModel,
            contents: `Translate this to English: "${text}"`,
            config: {
                systemInstruction: "You are a translation assistant. Translate the given text from Indonesian to English. Respond ONLY with the translated text, without any additional explanations or formatting.",
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error translating text:", error);
        throw new Error("Failed to translate text.");
    }
};
