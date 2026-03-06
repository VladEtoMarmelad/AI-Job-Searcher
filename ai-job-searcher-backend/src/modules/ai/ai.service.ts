import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AiJobAnalysis } from 'src/types/AiJobAnalysis';
import { cleanAndParseJSON } from 'src/utils/cleanAndParseJSON';
import { JobSelectors } from 'src/types/JobSelectors';
import { ConfigService } from '@nestjs/config';
import Groq from "groq-sdk";

@Injectable()
export class AiService implements OnModuleInit {
  private readonly logger = new Logger(AiService.name);
  private groq: Groq;
  private modelName: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    this.modelName = this.configService.get<string>('AI_MODEL_NAME', 'llama-3.3-70b-versatile');

    if (!apiKey) {
      this.logger.error('GROQ_API_KEY is not defined in .env files!');
    }

    this.groq = new Groq({ apiKey });
  }

  async analyzeJob(resume: string, jobDescription: string, filters: string): Promise<AiJobAnalysis|undefined> {
    
    // System prompt defines the persona, rules, and output format
    const systemPrompt = `
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

      Response Requirements:
      - Respond strictly in valid JSON format.
      - The "reasoning" must start with the extracted levels.
      
      Format: 
      {
        "score": <number>,
        "reasoning": "<string>",
        "vacancyTitle": "<string>"
      }
    `;

    // User prompt contains the dynamic data to be processed
    const userPrompt = `
      Input Data for Analysis:
      - Resume: "${resume}"
      - Job Description: "${jobDescription}"
      - Filters: "${filters}"
    `;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        model: this.modelName, 
        temperature: 0.1,
        max_tokens: 5120,
        top_p: 1,
        stream: false,
        stop: null
      });

      const content = chatCompletion.choices[0]?.message?.content ?? "";
      return cleanAndParseJSON<AiJobAnalysis>(content);
    } catch (error) {
      this.logger.error(`Error using AI model (${this.modelName}):`, error);
    }
  }

  async analyzeJobHTML(html: string) {
        
    /**
     * System prompt for HTML analysis.
     * Instructs the AI to act as a Web Scraping Expert to identify CSS selectors.
     */
    const systemPrompt = `
      Role: You are a Web Scraping Expert specializing in DOM analysis. Your task is to analyze the provided HTML from a job board website and identify CSS selectors for navigation and data extraction.

      Objectives:
      1. Identify 'linkSelector': A CSS selector that matches the anchor (<a>) tags leading to individual job vacancy pages.
      2. Identify 'nextBtn': A CSS selector that matches the "Next Page" button or link in the pagination section.

      Rules:
      - Provide the most specific yet stable CSS selectors possible.
      - Focus on classes or attributes that look structural (e.g., job-link, pagination__next).
      - If a selector cannot be found, return an empty string for that field.
      - Respond strictly in valid JSON format.

      Format: 
      {
        "linkSelector": "<string>",
        "nextBtn": "<string>"
      }
    `;

    // User prompt passing the raw HTML content for analysis
    const userPrompt = `
      Analyze the following HTML snippet and extract the required CSS selectors:
      ---
      HTML: 
      ${html}
      ---
    `;

    try {
      const chatCompletion = await this.groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        model: this.modelName, 
        temperature: 0.1, // Low temperature for consistent and precise selector generation
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        stop: null
      });

      const content = chatCompletion.choices[0]?.message?.content ?? "";
      return cleanAndParseJSON<JobSelectors>(content);
    } catch (error) {
      this.logger.error(`Error analyzing HTML with AI model (${this.modelName}):`, error);
    }
  }
}