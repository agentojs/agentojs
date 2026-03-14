import { Module } from '@nestjs/common';
import { AgentOJSModule } from '@agentojs/nestjs';
import { MedusaProvider } from '@agentojs/medusa';

@Module({
  imports: [
    AgentOJSModule.register({
      store: {
        name: process.env.STORE_NAME || 'My Store',
        slug: process.env.STORE_SLUG || 'my-store',
        currency: process.env.STORE_CURRENCY || 'usd',
        country: process.env.STORE_COUNTRY || 'us',
        backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
      },
      provider: new MedusaProvider({
        backendUrl: process.env.MEDUSA_URL || 'http://localhost:9000',
        apiKey: process.env.MEDUSA_API_KEY || '',
      }),
      basePath: '/ai',
      enableMcp: true,
      enableUcp: true,
      enableAcp: true,
    }),
  ],
})
export class AppModule {}
