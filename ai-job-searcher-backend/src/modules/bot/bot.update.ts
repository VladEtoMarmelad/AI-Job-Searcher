import { Update, Ctx, Start, Command, InjectBot } from '@grammyjs/nestjs';
import { Context, Bot } from 'grammy';
import { DbService } from 'src/modules/db/db.service';
import { OnModuleInit } from '@nestjs/common'; // Required for lifecycle hook

@Update()
export class BotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>, // Injecting the bot instance to access API methods
    private readonly dbService: DbService
  ) {}

  // Registers commands in the Telegram menu button on module initialization
  async onModuleInit(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'vacanciesamount', description: 'View vacancy statistics' },
    ]);
  }

  // Handles the /start command
  @Start()
  async onStart(@Ctx() ctx: Context): Promise<void> {
    await ctx.reply('Welcome! I am your NestJS bot.');
  }

  @Command('vacanciesamount')
  async onVacanciesAmount(@Ctx() ctx: Context): Promise<void> {
    const vacancies = await this.dbService.getVacancies();
    const totalCount = vacancies.length;
    const viewedCount = vacancies.filter((v) => v.viewed).length;
    const notViewedCount = vacancies.filter((v) => !v.viewed).length;

    const message = `
      📊 Vacancy Statistics:
      ━━━━━━━━━━━━━━━━━━━━━
      📈 Total: ${totalCount}
      ✅ Viewed: ${viewedCount}
      ❌ Not Viewed: ${notViewedCount}
    `.trim();

    await ctx.reply(message);
  }
}