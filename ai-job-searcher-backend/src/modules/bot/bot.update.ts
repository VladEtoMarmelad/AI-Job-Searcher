import { Update, Ctx, Start, Command, InjectBot, On, Admin } from '@grammyjs/nestjs';
import { Context, Bot, InlineKeyboard } from 'grammy';
import { DbService } from 'src/modules/db/db.service';
import { OnModuleInit, UseGuards } from '@nestjs/common'; // Required for lifecycle hook
import { Vacancy } from '@sharedTypes/Vacancy';
import { AdminGuard } from './admin.guard';

@Update()
@UseGuards(AdminGuard)
export class BotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>, // Injecting the bot instance to access API methods
    private readonly dbService: DbService
  ) {}

  // Stores browsing state for each user: userId -> {vacancies, currentIndex}
  private userBrowsingState = new Map<number, { vacancies: Vacancy[]; currentIndex: number }>();

  // Registers commands in the Telegram menu button on module initialization
  async onModuleInit(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'vacanciesamount', description: 'View vacancy statistics' },
      { command: 'browse', description: 'Browse unviewed vacancies' },
      { command: 'stopbrowse', description: 'Stop browsing mode' },
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

  @Command('browse')
  async onBrowse(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const vacancies = await this.dbService.getVacancies();
    const notViewedVacancies = await vacancies.filter((v) => !v.viewed);

    if (notViewedVacancies.length === 0) {
      await ctx.reply('🎉 No more vacancies to view!');
      return;
    }

    // Initialize browsing state for this user
    this.userBrowsingState.set(userId, {
      vacancies: notViewedVacancies,
      currentIndex: 0,
    });

    // Display the first vacancy
    await this.displayVacancy(ctx, userId);
  }

  @Command('stopbrowse')
  async onStopBrowse(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const state = this.userBrowsingState.get(userId);
    if (!state) {
      await ctx.reply('❌ browse mode is not active. Use /browse to start.');
      return;
    }

    this.userBrowsingState.delete(userId);
    await ctx.reply('👋 Browsing mode stopped.');
  }

  @On('callback_query')
  async onCallbackQuery(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const data = ctx.callbackQuery?.data;
    if (!data) return;

    if (data === 'open_url') {
      const state = this.userBrowsingState.get(userId);
      if (state) {
        const vacancy = state.vacancies[state.currentIndex];
        // Answer callback to remove loading state
        await ctx.answerCallbackQuery({
          text: '🔗 Opening URL in a new tab',
          show_alert: false,
        });
      }
    } else if (data === 'mark_viewed') {
      const state = this.userBrowsingState.get(userId);
      if (!state) return;

      const vacancy = state.vacancies[state.currentIndex];
      if (vacancy._id) {
        // Mark current vacancy as viewed
        await this.dbService.updateVacancyStatus(vacancy._id, true);

        // Move to next vacancy
        state.currentIndex++;

        // Answer callback
        await ctx.answerCallbackQuery({
          text: '✅ Marked as viewed',
          show_alert: false,
        });

        // Display next vacancy or show completion message
        if (state.currentIndex < state.vacancies.length) {
          await this.displayVacancy(ctx, userId);
        } else {
          await ctx.editMessageText('🎉 You have viewed all vacancies!');
          this.userBrowsingState.delete(userId);
        }
      }
    }
  }

  // Helper method to display a vacancy with inline buttons
  private async displayVacancy(ctx: Context, userId: number): Promise<void> {
    const state = this.userBrowsingState.get(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    const messageText = this.formatVacancyMessage(vacancy, state.currentIndex, state.vacancies.length);

    // Create inline keyboard with buttons
    const keyboard = new InlineKeyboard()
      .url('🌐 Open URL', vacancy.url)
      .row()
      .text('✅ Mark as Viewed', 'mark_viewed');

    await ctx.reply(messageText, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  // Helper method to format vacancy details for display
  private formatVacancyMessage(vacancy: Vacancy, currentIndex: number, totalCount: number): string {
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

  // Helper method to escape HTML special characters for Telegram
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}