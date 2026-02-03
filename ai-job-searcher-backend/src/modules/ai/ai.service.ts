import { Injectable, Logger } from '@nestjs/common';
import { Ollama } from 'ollama';
import { AiJobAnalysis } from 'src/types/AiJobAnalysis';
import { cleanAndParseJSON } from 'src/utils/cleanAndParseJSON';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly ollama = new Ollama({ host: 'http://localhost:11434' });
  private readonly model = "llama3";

  async analyzeJob(resume: string, jobDescription: string): Promise<AiJobAnalysis|undefined> {
    const prompt = `
      У меня есть резюме: "${resume}"
      И описание вакансии: "${jobDescription}"
      
      Оцени соответствие кандидата вакансии от 0 до 10. 
      Ответь строго в формате JSON: {"score": 8, "reason": "краткое пояснение почему"}
    `;

    try {
      const response = await this.ollama.chat({
        model: this.model,
        messages: [{ role: 'user', content: prompt }],
      });

      return cleanAndParseJSON(response.message.content)
    } catch (error) {
      this.logger.error("Error using local AI model:", error);
    }
  }
}