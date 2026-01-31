
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateOneLineArt(base64Image: string, variant: number = 1): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  /**
   * Complexity Mapping:
   * 1-2: Silhouette (minimalist boundary).
   * 3-5: Expressive (major features).
   * 6-8: Detailed (textures and volume).
   * 9-10: Masterpiece (scribble-art, dense winding, shading simulation).
   */
  const complexityPrompt = `
    TASK: Convert the main subject of the provided image into ONE SINGLE CONTINUOUS SVG PATH.
    
    ARTISTIC COMPLEXITY: Level ${variant} out of 10.
    
    LEVEL SPECIFIC RULES:
    - Level 1: Extreme minimalism. Only the most basic outer silhouette. Use very few points.
    - Level 5: Balanced artistic line. Captures the silhouette and the most important internal features with flowing curves.
    - Level 10: Hyper-detailed masterpiece. Use an extremely long, intricate path that winds back and forth. Use dense scribbling, loops, and micro-zigzags to simulate shading, fine textures, and every subtle detail of the original subject. It should look like a complex professional ink drawing made with one continuous stroke.

    TECHNICAL CONSTRAINTS:
    1. Output ONLY the raw 'd' attribute string (no tags, no quotes).
    2. The path MUST be 100% continuous. Use 'M' only once at the beginning.
    3. Coordinate system: 0 to 1000.
    4. Provide no explanation or markdown. Just the path data.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data, mimeType } },
          { text: complexityPrompt }
        ]
      },
      config: {
        temperature: 0.2, // Higher predictability for clean paths
        topP: 0.8,
      }
    });

    let path = response.text?.trim() || "";
    
    // Cleanup for LLM output variance
    path = path.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
    path = path.replace(/^d=["'](.*)["']$/i, "$1");
    path = path.replace(/['"`]/g, "");

    if (!path.toLowerCase().startsWith('m')) {
      const mIndex = path.toUpperCase().indexOf('M');
      if (mIndex !== -1) {
        path = path.substring(mIndex);
      } else {
        return "";
      }
    }
    
    return path;
  } catch (err) {
    console.error("Gemini API Error:", err);
    throw err;
  }
}
