import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { GrammyExecutionContext } from '@grammyjs/nestjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if admin-only mode is enabled
    const adminsOnly = this.configService.get<string>('TG_BOT_ADMINS_ONLY') === 'true';

    // If admin-only mode is disabled, allow all access
    if (!adminsOnly) {
      return true;
    }

    const ctx = GrammyExecutionContext.create(context).getContext();
    const userId = ctx.from?.id;

    if (!userId) {
      return false;
    }

    // Get comma-separated admin IDs and parse them into an array
    const adminIdsString = this.configService.get<string>('TG_BOT_ADMIN_IDS') || '';
    const adminIds = adminIdsString
      .split(',')
      .map(id => Number(id.trim()))
      .filter(id => !isNaN(id));

    // Check if the user ID is in the list of admin IDs
    return adminIds.includes(userId);
  }
}