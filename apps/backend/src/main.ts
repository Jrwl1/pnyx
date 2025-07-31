import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);
   app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // strips unrecognized properties
      forbidNonWhitelisted: true, // throws if extra properties are sent
      transform: true, // auto-transforms payloads to DTO classes
    }),
  );
  await app.listen(4000);
}
bootstrap();
