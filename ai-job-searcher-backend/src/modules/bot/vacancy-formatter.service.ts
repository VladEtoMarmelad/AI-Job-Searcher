import { Injectable } from '@nestjs/common';
import { Vacancy } from '@sharedTypes/Vacancy';

@Injectable()
export class VacancyFormatterService {
  // Format vacancy details for Telegram message display
  formatVacancyMessage(vacancy: Vacancy, currentIndex: number, totalCount: number): string {
    return `
<b>📌 Vacancy ${currentIndex + 1}/${totalCount}</b>

<b>Title:</b> ${this.escapeHtml(vacancy.title)}
<b>Domain:</b> ${this.escapeHtml(vacancy.domain)}
<b>Score:</b> ${vacancy.score}

<b>Description:</b>
${this.escapeHtml(vacancy.description)}

<b>URL:</b> <code>${this.escapeHtml(vacancy.url)}</code>
    `.trim();
  }

  // Escape HTML special characters for safe Telegram message display
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
