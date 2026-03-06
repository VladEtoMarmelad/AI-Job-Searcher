// Cleans a string from potential Markdown formatting and parses the extracted JSON into a generic type T.
export const cleanAndParseJSON = <T>(text: string): T => {
  // 1. Remove possible Markdown wrappers like ```json ... ```
  let cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();

  // 2. Find object boundaries
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No JSON object found");
  }

  // Extract the raw JSON string between the first and last curly braces
  const jsonRaw = cleaned.substring(start, end + 1);

  // Parse the extracted string and cast it to the provided generic type
  return JSON.parse(jsonRaw) as T;
}