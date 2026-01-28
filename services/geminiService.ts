
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function generateOneLineArt(base64Image: string, variant: number = 1): Promise<string> {
  const model = 'gemini-3-flash-preview';
  
  const data = base64Image.split(',')[1];
  const mimeType = base64Image.split(';')[0].split(':')[1];

  // Refined 1-10 complexity map focusing on artistic detail and path length
  const complexityPrompt = `
    Transform the subject of the image into a SINGLE, UNINTERRUPTED continuous line drawing.
    
    COMPLEXITY SCALE (Level ${variant} of 10):
    - Level 1-2: Ultra-minimalist. Focus only on the outermost silhouette. Very short path.
    - Level 3-4: Minimalist sketch. Outline plus 1 or 2 essential internal features.
    - Level 5-6: Artistic interpretation. Fluid curves capturing the primary form and secondary features (like eyes or major muscle lines).
    - Level 7-8: Detailed drawing. Complex winding lines that begin to describe volume and texture.
    - Level 9-10: Hyper-detailed masterpiece. Use intricate zig-zags, loops, and varying path density to simulate shading, fine textures, and every subtle detail of the original subject. The resulting path should be very long and wind through the entire form.

    YOUR GOAL:
    At level ${variant}, generate a path that is ${variant <= 3 ? 'clean and iconic' : variant <= 7 ? 'fluid and expressive' : 'intricate and representational'}.
    
    CRITICAL CONSTRAINTS:
    1. Output ONLY the 'd' attribute string of a single SVG path.
    2. Start with 'M', followed by a sequence of 'C', 'L', or 'Q' commands.
    3. The path MUST NEVER break. No 'M' commands after the first one.
    4. Coordinate space: 0 to 1000.
    5. Do not return any XML tags, JSON, or text besides the path data.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { inlineData: { data, mimeType } },
        { text: complexityPrompt }
      ]
    },
    config: {
      temperature: 0.4, // Lower temperature for more stable path structures
      topP: 0.8,
    }
  });

  let path = response.text?.trim() || "";
  
  // Strip potential wrapping quotes or common LLM markdown
  path = path.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "");
  path = path.replace(/^d=["'](.*)["']$/i, "$1");
  path = path.replace(/['"`]/g, "");

  if (!path.toLowerCase().startsWith('m')) {
      // Fallback: try to find the first 'M'
      const mIndex = path.toUpperCase().indexOf('M');
      if (mIndex !== -1) {
          path = path.substring(mIndex);
      } else {
          return "";
      }
  }
  
  return path;
}
