
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateOneLineArt(base64Image: string, variant: number = 1): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  // Map 1-10 scale to descriptive complexity levels
  const complexityMap: { [key: number]: string } = {
    1: "Ultra-Minimal: Use the absolute bare minimum points. A single primitive stroke suggesting only the outer silhouette.",
    2: "Extremely Simple: Minimal curves, focusing only on the most iconic shape of the subject.",
    3: "Simple: Basic outlines with very few internal details.",
    4: "Minimalist: Smooth flow, capturing the core structure with light abstraction.",
    5: "Balanced Abstraction: Clear representation with smooth, flowing lines and some key internal features.",
    6: "Moderate Detail: More descriptive curves that define the subject's form more clearly.",
    7: "Artistic Detail: Capturing significant contours and sub-shapes while remaining a continuous line.",
    8: "High Detail: Intricate pathing that represents textures and complex intersections of the subject.",
    9: "Very High Detail: Detailed tracing of almost all visible edges and features.",
    10: "Maximum Fidelity: The most complex path possible, tracing the subject with extreme precision to look exactly like the original photo."
  };

  const prompt = `
    Analyze the uploaded image and convert its main subject into a SINGLE continuous line drawing (one-line art).
    
    COMPLEXITY LEVEL: ${complexityMap[variant] || complexityMap[5]}
    
    CRITICAL INSTRUCTIONS:
    1. Output ONLY a valid SVG path 'd' attribute value.
    2. The path MUST be a single continuous stroke (one 'M' command followed by curves/lines).
    3. Use a normalized 0-1000 scale for coordinates.
    4. Do not include any text, headers, or other SVG tags. Just the string for the 'd' property.
    5. Ensure the line is fluid and connected.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: prompt }
      ]
    },
    config: {
      temperature: 0.5,
      topP: 0.9,
    }
  });

  const path = response.text?.trim().replace(/['"`]/g, '') || "";
  
  if (!path.toLowerCase().includes('m')) {
      return "";
  }
  
  const match = path.match(/d="([^"]+)"/i);
  if (match) return match[1];

  return path;
}
