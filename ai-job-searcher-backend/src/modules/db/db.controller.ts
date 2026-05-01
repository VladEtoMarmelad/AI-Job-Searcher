import { Controller, Delete, Get, Patch, Query } from '@nestjs/common';
import { DbService } from './db.service';

@Controller('db')
export class DbController {
  constructor(private readonly dbService: DbService) {}

  @Get('/vacancies')
  async getVacancies () {
    return await this.dbService.getVacancies();
  }

  @Delete('/vacancy/delete')
  async deleteVacancy (@Query("id") id: string) {
    await this.dbService.deleteVacancy(id)
  }

  @Delete('/vacancies')
  async deleteAllVacancies () {
    await this.dbService.deleteAllVacancies()
  }

  @Patch('/vacancy/updateStatus') 
  async updateVacancyStatus (
    @Query('id') id: string,
    @Query('viewed') viewed: boolean,
  ) {
    await this.dbService.updateVacancyStatus(id, viewed)
  }
}
