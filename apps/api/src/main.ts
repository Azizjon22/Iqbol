import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';

// .env ships with obvious placeholders so a fresh checkout runs at all —
// they must never make it into a real deployment, since anyone who reads
// this repo (or its own history) can forge tokens signed with them.
const PLACEHOLDER_SECRETS: Record<string, string> = {
  JWT_ACCESS_SECRET: 'change-me-access',
  JWT_REFRESH_SECRET: 'change-me-refresh',
};

function assertProductionSecretsAreReal() {
  if (process.env.NODE_ENV !== 'production') return;
  for (const [key, placeholder] of Object.entries(PLACEHOLDER_SECRETS)) {
    const value = process.env[key];
    if (!value || value === placeholder || value.length < 20) {
      throw new Error(
        `${key} productionda haqiqiy, tasodifiy qiymatga ega bo'lishi kerak ` +
          `(hozir bo'sh yoki standart placeholder). Masalan: openssl rand -base64 32`,
      );
    }
  }
}

async function bootstrap() {
  assertProductionSecretsAreReal();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Number of proxies in front of the API whose X-Forwarded-For is believed
  // (1 = the web server). Set only when the API is unreachable from outside,
  // as in docker-compose.prod.yml — otherwise anyone could fake their IP.
  const trustProxy = Number(process.env.TRUST_PROXY ?? 0);
  if (trustProxy > 0) app.set('trust proxy', trustProxy);

  app.use(helmet());
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
