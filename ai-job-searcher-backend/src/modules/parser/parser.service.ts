import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';

@Injectable()
export class ParserService {
  async extractJobDescription(url: string): Promise<string> {
    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);
      
      // Удаляем скрипты и стили
      $('script, style').remove();
      
      // Обычно текст вакансии лежит в main или конкретных селекторах
      // Для универсальности берем body и чистим лишние пробелы
      const text = $('body').text().replace(/\s\s+/g, ' ').trim();
      
      return text.substring(0, 5000); // Ограничиваем длину для контекста ИИ
    } catch (e) {
      return '';
    }
  }
}