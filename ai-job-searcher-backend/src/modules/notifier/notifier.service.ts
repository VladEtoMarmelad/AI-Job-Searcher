import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JobSelectors } from 'src/types/JobSelectors';
import { Transporter } from 'nodemailer';
import * as nodemailer from 'nodemailer';

@Injectable()
export class NotifierService implements OnModuleInit {
  private readonly logger = new Logger(NotifierService.name);
  private transporter!: Transporter;
  
  private gmailUser: string|undefined;
  private recipientEmail: string|undefined;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    // Configuration parameters are initialized via ConfigService to support environment-based settings
    this.gmailUser = this.configService.get<string>('GMAIL_USER');
    this.recipientEmail = this.configService.get<string>('RECIPIENT_EMAIL');
    const gmailPass = this.configService.get<string>('GMAIL_PASS');

    // Create transporter with Gmail settings once the configuration is loaded
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.gmailUser, // Your gmail address
        pass: gmailPass, // Your gmail app password
      },
    });
  }

  /**
   * Notifies the administrator when hardcoded selectors for a specific site become obsolete.
   * This allows for manual intervention or verification of the AI's fallback performance.
   */
  async sendHardcodedSelectorFailureAlert(site: string, url: string, failedSelectors: JobSelectors) {
    const message = `
      CRITICAL: Hardcoded selectors for ${site} have failed.
      
      Domain: ${site}
      Target URL: ${url}
      Failed linkSelector: ${failedSelectors.linkSelector}
      ${failedSelectors.nextBtn ? `Failed nextBtn: ${failedSelectors.nextBtn}` : ''}
      
      System has automatically switched to AI discovery and local storage verification.
    `;

    const mailOptions = {
      from: this.gmailUser,
      to: this.recipientEmail,
      subject: `Selector Failure Alert: ${site}`,
      text: message,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.warn(`Selector failure alert for ${site} sent to administrator.`);
    } catch (error) {
      this.logger.error(`Failed to send selector failure alert for ${site}:`, error);
    }
  }
}