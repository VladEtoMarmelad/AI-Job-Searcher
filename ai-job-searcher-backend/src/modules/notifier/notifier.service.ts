import { Injectable, Logger } from '@nestjs/common';
import { AiJobAnalysis } from 'src/types/AiJobAnalysis';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifierService {
  private readonly logger = new Logger(NotifierService.name);

  // Create transporter with Gmail settings
  private transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER, // Your gmail address
      pass: process.env.GMAIL_PASS, // Your gmail app password
    },
  });

  async sendAlert(jobUrl: string, analysis: AiJobAnalysis) {
    const message = `
      **Matching Job Found!**
      **Score:** ${analysis.score}/10
      **Reason:** ${analysis.reason}
      **Link:** ${jobUrl}
    `;

    // Send to gmail
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: process.env.RECIPIENT_EMAIL, // Receiver's email address
      subject: 'New Job Vacancy Found',
      text: message,
    };

    try {
      // Execute the sending process
      await this.transporter.sendMail(mailOptions);
      this.logger.log('Email alert sent successfully');
    } catch (error) {
      // Error handling
      this.logger.error('Failed to send email alert:', error);
    }
  }
}