import { GoogleGenAI, Type } from "@google/genai";
import { DogThought } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDogThought = async (context: string): Promise<DogThought> => {
  try {
    // Using gemini-3-flash-preview as recommended for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User is playing 'Running Chihuahua'. The dog is running from a GORILLA and dodging cars, animals, and rocks.
      Context: ${context}. 
      Generate a short, funny, scared, or philosophical thought (max 10 words).`,
      config: {
        systemInstruction: "You are a Chihuahua. You are running for your life from a giant Gorilla, but you are also easily distracted by cars and squirrels. If lives are low, be scared. If score is high, be proud.",
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
              enum: ['happy', 'tired', 'excited', 'hungry', 'philosophical', 'scared'],
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
      text: "Is that a banana??",
      emotion: 'excited'
    };
  }
};