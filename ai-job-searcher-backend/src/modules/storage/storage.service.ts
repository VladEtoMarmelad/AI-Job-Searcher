import { Injectable, Logger } from '@nestjs/common';
import { JobSelectors } from 'src/types/JobSelectors';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly filePath = path.join(process.cwd(), 'stored_selectors.json');

  /**
   * Reads the entire selectors map from the JSON file.
   * Returns an empty object if the file doesn't exist or is corrupted.
   */
  async getAllSelectors(): Promise<Record<string, JobSelectors>> {
    try {
      const data = await fs.readFile(this.filePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return {};
    }
  }

  // Saves or updates selectors for a specific domain in the JSON file.
  async saveSelectors(domain: string, selectors: JobSelectors): Promise<void> {
    try {
      const allSelectors = await this.getAllSelectors();
      allSelectors[domain] = selectors;
      await fs.writeFile(this.filePath, JSON.stringify(allSelectors, null, 2));
      this.logger.log(`Selectors for ${domain} saved to storage.`);
    } catch (error) {
      this.logger.error(`Failed to save selectors for ${domain}: ${error.message}`);
    }
  }

  // Removes selectors for a specific domain if they are found to be invalid.
  async clearSelectors(domain: string): Promise<void> {
    try {
      const allSelectors = await this.getAllSelectors();
      if (allSelectors[domain]) {
        delete allSelectors[domain];
        await fs.writeFile(this.filePath, JSON.stringify(allSelectors, null, 2));
        this.logger.warn(`Invalid selectors for ${domain} cleared from storage.`);
      }
    } catch (error) {
      this.logger.error(`Failed to clear selectors for ${domain}: ${error.message}`);
    }
  }
}