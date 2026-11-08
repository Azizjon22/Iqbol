import { Module } from '@nestjs/common';
import { ShoppingListsController } from './shopping-lists.controller';
import { ShoppingListsService } from './shopping-lists.service';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [AuditLogModule, TelegramModule],
  controllers: [ShoppingListsController],
  providers: [ShoppingListsService],
  exports: [ShoppingListsService],
})
export class ShoppingListsModule {}
