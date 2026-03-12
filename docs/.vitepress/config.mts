import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AgentOJS',
  description: 'Agentic middleware for AI commerce',
  base: '/',

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/commerce-backend' },
      { text: 'GitHub', link: 'https://github.com/agentojs/agentojs' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Medusa', link: '/guide/medusa' },
            { text: 'WooCommerce', link: '/guide/woocommerce' },
            { text: 'Generic REST', link: '/guide/generic' },
            { text: 'Custom Backend', link: '/guide/custom-backend' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'CommerceBackend', link: '/api/commerce-backend' },
            { text: 'Core Types', link: '/api/types' },
            { text: 'Errors', link: '/api/errors' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/agentojs/agentojs' },
    ],
  },
})
