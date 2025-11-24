import { GoogleGenAI } from "@google/genai";

export const generateImage = async (
  prompt: string, 
  size: '1K' | '2K' | '4K' = '1K'
): Promise<{ imageUrl: string }> => {
  
  // Use process.env.API_KEY as strictly required by system guidelines.
  // The API key must be selected by the user via the UI if using paid models.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Use the specific model requested
  const modelName = 'gemini-3-pro-image-preview';

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
          imageSize: size
        }
      }
    });

    let imageUrl = '';
    
    // Iterate to find image part
    if (response.candidates && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                const base64EncodeString = part.inlineData.data;
                imageUrl = `data:image/png;base64,${base64EncodeString}`;
                break;
            }
        }
    }

    if (!imageUrl) {
        throw new Error("No image generated in response");
    }

    return { imageUrl };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};