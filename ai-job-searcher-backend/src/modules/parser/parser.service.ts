import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ParserService {
  // Max text length for AI context window management
  private readonly maxTextLength = parseInt(process.env.MAX_PARSER_LENGTH || '5000', 10);

  async extractJobDescription(url: string): Promise<string> {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      
      // Remove non-content elements to reduce noise
      $('script, style, nav, footer, header').remove();
      
      // Normalize whitespace and extract text from body
      const text = $('body').text().replace(/\s\s+/g, ' ').trim();
      
      return text.substring(0, this.maxTextLength);
    } catch (e) {
      return '';
    }
  }
}