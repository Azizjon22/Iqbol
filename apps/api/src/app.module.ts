import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MustChangeCredentialGuard } from './common/guards/must-change-credential.guard';
import { StaffUsersModule } from './staff-users/staff-users.module';
import { WorkersModule } from './workers/workers.module';
import { MenusModule } from './menus/menus.module';
import { EventsModule } from './events/events.module';
import { InventoryModule } from './inventory/inventory.module';
import { ShoppingListsModule } from './shopping-lists/shopping-lists.module';
import { SettingsModule } from './settings/settings.module';
import { PaymentsModule } from './payments/payments.module';
import { EventExpensesModule } from './event-expenses/event-expenses.module';
import { UploadsModule } from './uploads/uploads.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditLogModule } from './audit-log/audit-log.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    AuthModule,
    StaffUsersModule,
    WorkersModule,
    MenusModule,
    EventsModule,
    InventoryModule,
    ShoppingListsModule,
    SettingsModule,
    PaymentsModule,
    EventExpensesModule,
    UploadsModule,
    DashboardModule,
    AuditLogModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: MustChangeCredentialGuard },
  ],
})
export class AppModule {}
