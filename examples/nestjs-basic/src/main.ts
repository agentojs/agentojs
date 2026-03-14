import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3100;
  await app.listen(port);

  console.log(`NestJS + AgentOJS server running on http://localhost:${port}`);
  console.log(`  MCP (Claude):  POST http://localhost:${port}/ai/mcp`);
  console.log(`  UCP (Gemini):  GET  http://localhost:${port}/ai/ucp/products`);
  console.log(`  ACP (ChatGPT): POST http://localhost:${port}/ai/acp/checkout_sessions`);
}

bootstrap();
