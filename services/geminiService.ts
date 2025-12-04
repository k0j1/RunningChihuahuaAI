import { GoogleGenAI, Type } from "@google/genai";
import { DogThought } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDogThought = async (context: string): Promise<DogThought> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `The user is watching a 3D chihuahua run. Current context: ${context}. Generate a short, funny, or philosophical thought (max 15 words) that the chihuahua is thinking right now.`,
      config: {
        systemInstruction: "You are a cute, high-energy, slightly philosophical Chihuahua. You love running, treats, and smells.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: {
              type: Type.STRING,
              description: "The thought text."
            },
            emotion: {
              type: Type.STRING,
              enum: ['happy', 'tired', 'excited', 'hungry', 'philosophical'],
              description: "The emotion associated with the thought."
            }
          },
          required: ["text", "emotion"]
        }
      }
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("No text response");
    
    return JSON.parse(jsonText) as DogThought;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      text: "Bark bark! (Thinking is hard right now...)",
      emotion: 'excited'
    };
  }
};