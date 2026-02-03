import { AiJobAnalysis } from '../types/AiJobAnalysis';

export const cleanAndParseJSON = (text: string): AiJobAnalysis => {
  // 1. Remove possible Markdown wrappers like ```json ... ```
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  // 2. Find object boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found");
  }

  const jsonRaw = cleaned.substring(start, end + 1);
  return JSON.parse(jsonRaw) as AiJobAnalysis;
}