import { Update, Ctx, Start, Command, InjectBot, On } from '@grammyjs/nestjs';
import { Context, Bot, InlineKeyboard } from 'grammy';
import { DbService } from 'src/modules/db/db.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { OnModuleInit, UseGuards } from '@nestjs/common'; // Required for lifecycle hook
import { Vacancy } from '@sharedTypes/Vacancy';
import { AdminGuard } from './admin.guard';

@Update()
@UseGuards(AdminGuard)
export class BotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>, // Injecting the bot instance to access API methods
    private readonly dbService: DbService,
    private readonly jobsService: JobsService,
  ) {}

  // Stores browsing state for each user: userId -> {vacancies, currentIndex}
  private userBrowsingState = new Map<number, { vacancies: Vacancy[]; currentIndex: number }>();

  // Tracks search cycle argument collection state for each user
  private userSearchInputState = new Map<number, {
    step: 'awaiting_keyword' | 'awaiting_resume' | 'awaiting_filters';
    searchKeyword?: string;
    resume?: string;
  }>();

  // Registers commands in the Telegram menu button on module initialization
  async onModuleInit(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'vacanciesamount', description: 'View vacancy statistics' },
      { command: 'browse', description: 'Browse unviewed vacancies' },
      { command: 'stopbrowse', description: 'Stop browsing mode' },
      { command: 'customsearch', description: 'Run search with custom parameters' },
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

  @Command('customsearch')
  async onCustomSearch(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    // Initialize search input state
    this.userSearchInputState.set(userId, {
      step: 'awaiting_keyword',
    });

    await ctx.reply('🔍 Enter search keyword for job search:');
  }

  @On('message:text')
  async onTextMessage(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const inputState = this.userSearchInputState.get(userId);
    if (!inputState) return;

    const text = ctx.message?.text;
    if (!text) return;

    if (inputState.step === 'awaiting_keyword') {
      inputState.searchKeyword = text;
      inputState.step = 'awaiting_resume';
      await ctx.reply('📄 Enter your resume content:');
    } else if (inputState.step === 'awaiting_resume') {
      inputState.resume = text;
      inputState.step = 'awaiting_filters';
      await ctx.reply('🎯 Enter filters (or send "-" for empty):');
    } else if (inputState.step === 'awaiting_filters') {
      const filters = text === '-' ? '' : text;

      // Clean up the input state
      this.userSearchInputState.delete(userId);

      try {
        await ctx.reply('⏳ Starting custom search...');

        await this.jobsService.runSearchCycle({
          searchKeyword: inputState.searchKeyword,
          resume: inputState.resume,
          filters,
        });

        await ctx.reply('✅ Custom search completed successfully!');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        await ctx.reply(`❌ Error during search: ${errorMessage}`);
      }
    }
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