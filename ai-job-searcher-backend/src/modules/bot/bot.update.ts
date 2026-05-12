import { Update, Ctx, Start, Command, InjectBot, On } from '@grammyjs/nestjs';
import { Context, Bot, InlineKeyboard } from 'grammy';
import { DbService } from 'src/modules/db/db.service';
import { JobsService } from 'src/modules/jobs/jobs.service';
import { OnModuleInit, UseGuards } from '@nestjs/common'; // Required for lifecycle hook
import { AdminGuard } from './admin.guard';
import { VacancyFormatterService } from './vacancy-formatter.service';
import { BrowsingStateService } from './browsing-state.service';

@Update()
@UseGuards(AdminGuard)
export class BotUpdate implements OnModuleInit {
  constructor(
    @InjectBot() private readonly bot: Bot<Context>,
    private readonly dbService: DbService,
    private readonly jobsService: JobsService,
    private readonly vacancyFormatterService: VacancyFormatterService,
    private readonly browsingStateService: BrowsingStateService,
  ) {}

  // Registers commands in the Telegram menu button on module initialization
  async onModuleInit(): Promise<void> {
    await this.bot.api.setMyCommands([
      { command: 'start', description: 'Start the bot' },
      { command: 'vacanciesamount', description: 'View vacancy statistics' },
      { command: 'browse', description: 'Browse unviewed vacancies' },
      { command: 'stopbrowse', description: 'Stop browsing mode' },
      { command: 'favorites', description: 'Browse favorite vacancies' },
      { command: 'stopfavorites', description: 'Stop browsing favorites' },
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
    const notViewedVacancies = vacancies.filter((v) => !v.viewed && !v.favorite);

    if (notViewedVacancies.length === 0) {
      await ctx.reply('🎉 No more vacancies to view!');
      return;
    }

    this.browsingStateService.initializeBrowsingState(userId, notViewedVacancies);
    await this.displayVacancy(ctx, userId);
  }

  @Command('stopbrowse')
  async onStopBrowse(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!this.browsingStateService.getBrowsingState(userId)) {
      await ctx.reply('❌ browse mode is not active. Use /browse to start.');
      return;
    }

    this.browsingStateService.clearBrowsingState(userId);
    await ctx.reply('👋 Browsing mode stopped.');
  }

  @Command('favorites')
  async onFavorites(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const vacancies = await this.dbService.getVacancies();
    const favoriteVacancies = vacancies.filter((v) => v.favorite);

    if (favoriteVacancies.length === 0) {
      await ctx.reply('🎉 No favorite vacancies yet!');
      return;
    }

    this.browsingStateService.initializeFavoritesBrowsingState(userId, favoriteVacancies);
    await this.displayFavoriteVacancy(ctx, userId);
  }

  @Command('stopfavorites')
  async onStopFavorites(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (!this.browsingStateService.getFavoritesBrowsingState(userId)) {
      await ctx.reply('❌ Favorites browsing mode is not active. Use /favorites to start.');
      return;
    }

    this.browsingStateService.clearFavoritesBrowsingState(userId);
    await ctx.reply('👋 Favorites browsing mode stopped.');
  }

  @Command('customsearch')
  async onCustomSearch(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    this.browsingStateService.initializeSearchInputState(userId);
    await ctx.reply('🔍 Enter search keyword for job search:');
  }

  @On('message:text')
  async onTextMessage(@Ctx() ctx: Context): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    const inputState = this.browsingStateService.getSearchInputState(userId);
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

      this.browsingStateService.clearSearchInputState(userId);

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
      this.browsingStateService.getBrowsingState(userId);
      await ctx.answerCallbackQuery({
        text: '🔗 Opening URL in a new tab',
        show_alert: false,
      });
    } else if (data === 'mark_viewed') {
      await this.handleMarkViewed(ctx, userId);
    } else if (data === 'add_to_favorite') {
      await this.handleAddToFavorite(ctx, userId);
    } else if (data === 'next_favorite') {
      await this.handleNextFavorite(ctx, userId);
    } else if (data === 'remove_from_favorite') {
      await this.handleRemoveFromFavorite(ctx, userId);
    }
  }

  private async handleMarkViewed(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getBrowsingState(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    if (vacancy._id) {
      await this.dbService.updateVacancyStatus(vacancy._id, true);
      state.currentIndex++;

      await ctx.answerCallbackQuery({
        text: '✅ Marked as viewed',
        show_alert: false,
      });

      if (state.currentIndex < state.vacancies.length) {
        await this.displayVacancy(ctx, userId);
      } else {
        await ctx.editMessageText('🎉 You have viewed all vacancies!');
        this.browsingStateService.clearBrowsingState(userId);
      }
    }
  }

  private async handleAddToFavorite(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getBrowsingState(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    if (vacancy._id) {
      await this.dbService.updateVacancyFavorite(vacancy._id, true);
      state.currentIndex++;

      await ctx.answerCallbackQuery({
        text: '⭐ Added to favorites',
        show_alert: false,
      });

      if (state.currentIndex < state.vacancies.length) {
        await this.displayVacancy(ctx, userId);
      } else {
        await ctx.editMessageText('🎉 You have viewed all vacancies!');
        this.browsingStateService.clearBrowsingState(userId);
      }
    }
  }

  private async handleNextFavorite(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getFavoritesBrowsingState(userId);
    if (!state) return;

    state.currentIndex++;

    await ctx.answerCallbackQuery({
      text: '⏭️ Next favorite',
      show_alert: false,
    });

    if (state.currentIndex < state.vacancies.length) {
      await this.displayFavoriteVacancy(ctx, userId);
    } else {
      await ctx.editMessageText('🎉 You have reviewed all favorite vacancies!');
      this.browsingStateService.clearFavoritesBrowsingState(userId);
    }
  }

  private async handleRemoveFromFavorite(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getFavoritesBrowsingState(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    if (vacancy._id) {
      await this.dbService.updateVacancyFavorite(vacancy._id, false);
      this.browsingStateService.removeFavoriteAtIndex(userId, state.currentIndex);

      await ctx.answerCallbackQuery({
        text: '❌ Removed from favorites',
        show_alert: false,
      });

      if (state.currentIndex < state.vacancies.length) {
        await this.displayFavoriteVacancy(ctx, userId);
      } else {
        await ctx.editMessageText('🎉 You have reviewed all favorite vacancies!');
        this.browsingStateService.clearFavoritesBrowsingState(userId);
      }
    }
  }

  // Display vacancy with action buttons for browsing
  private async displayVacancy(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getBrowsingState(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    const messageText = this.vacancyFormatterService.formatVacancyMessage(
      vacancy,
      state.currentIndex,
      state.vacancies.length,
    );

    const keyboard = new InlineKeyboard()
      .url('🌐 Open URL', vacancy.url)
      .row()
      .text('⭐ Add to Favorites', 'add_to_favorite')
      .row()
      .text('✅ Mark as Viewed', 'mark_viewed');

    await ctx.reply(messageText, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }

  // Display favorite vacancy with action buttons
  private async displayFavoriteVacancy(ctx: Context, userId: number): Promise<void> {
    const state = this.browsingStateService.getFavoritesBrowsingState(userId);
    if (!state) return;

    const vacancy = state.vacancies[state.currentIndex];
    const messageText = this.vacancyFormatterService.formatVacancyMessage(
      vacancy,
      state.currentIndex,
      state.vacancies.length,
    );

    const keyboard = new InlineKeyboard()
      .url('🌐 Open URL', vacancy.url)
      .row()
      .text('⏭️ Next Favorite', 'next_favorite')
      .row()
      .text('❌ Remove from Favorites', 'remove_from_favorite');

    await ctx.reply(messageText, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }
}