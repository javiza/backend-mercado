import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  for (const k of ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!process.env[k]) throw new Error(`Falta la variable de entorno ${k}`);
  }
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({ origin: (process.env.CORS_ORIGIN || '').split(',').filter(Boolean), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Oculta campos @Exclude() (hash de contraseña, tokens) en TODAS las respuestas.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  const doc = new DocumentBuilder().setTitle('Supermercado API').addBearerAuth({ type: 'http', scheme: 'bearer' }, 'JWT-auth').build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, doc));
  await app.listen(process.env.PORT || 3001, '0.0.0.0');
}
bootstrap();
