import { Injectable, Logger } from '@nestjs/common';
import { AiJobAnalysis } from 'src/types/AiJobAnalysis';
import { cleanAndParseJSON } from 'src/utils/cleanAndParseJSON';
import Groq from "groq-sdk";

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  
  // Model parameters externalized for easy switching between local models
  private readonly modelName = process.env.AI_MODEL_NAME || 'compound-beta';
  
  private readonly groq = new Groq({apiKey: process.env.GROQ_API_KEY});

  async analyzeJob(resume: string, jobDescription: string, filters: string): Promise<AiJobAnalysis|undefined> {
    // Structured prompt with injected variables
    const prompt = `
      Role: You are an objective Technical Recruitment Evaluator. Your task is to accurately match candidate seniority and skills to the Job Description.

      Evaluation Process:
      1. Extract JD_Level: Identify the required seniority from the Job Description (Trainee, Junior, Mid, Senior, Lead).
      2. Extract Candidate_Level: Identify the candidate's current level from the Resume.
      3. Compare: 
      - If Candidate_Level >= JD_Level: Match is successful.
      - If Candidate_Level < JD_Level: This is a mismatch.

      Scoring Logic:
      - Match (Candidate_Level >= JD_Level): Score 8-10 based on skill match.
      - Partial Match (Candidate is 1 level below JD_Level): Max score 5.
      - Critical Mismatch (Candidate is 2+ levels below JD_Level, e.g., Junior applying for Senior): Max score 3.
      - If JD_Level is "Junior" and Candidate_Level is "Junior" or "Strong Junior", this is a MATCH (Score 8-10).
      - If JD mismatch filters Max score: 5.

      Input Data:
      - Resume: "${resume}"
      - Job Description: "${jobDescription}"
      - Filters: "${filters}"

      Response Requirements:
      - Respond strictly in JSON.
      - The "reasoning" must start with the extracted levels.

      Format: 
      {
        "extracted_levels": {
          "job": "<string>",
          "candidate": "<string>"
        },
        "score": <number>,
        "reasoning": "<string>"
      }
    `;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        model: process.env.AI_MODEL_NAME ?? "compound-beta", 
        temperature: 0.1,
        max_tokens: 5120,
        top_p: 1,
        stream: false,
        stop: null
      });

      return cleanAndParseJSON(chatCompletion.choices[0]?.message?.content ?? "")
    } catch (error) {
      this.logger.error(`Error using local AI model (${this.modelName}):`, error);
    }
  }
}