import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AgentOJS',
  description: 'Agentic middleware for AI commerce — connect any e-commerce backend to Claude, ChatGPT, and Gemini via MCP, UCP, and ACP protocols',
  base: '/',

  head: [
    ['meta', { property: 'og:title', content: 'AgentOJS — Agentic Middleware for AI Commerce' }],
    ['meta', { property: 'og:description', content: 'Connect any e-commerce backend to Claude, ChatGPT, and Gemini via MCP, UCP, and ACP protocols. Open-source TypeScript SDK.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://agentojs.com' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'AgentOJS — Agentic Middleware for AI Commerce' }],
    ['meta', { name: 'twitter:description', content: 'Connect any e-commerce backend to Claude, ChatGPT, and Gemini via MCP, UCP, and ACP protocols.' }],
    ['meta', { name: 'keywords', content: 'agentojs, mcp, ucp, acp, ai commerce, medusa, woocommerce, typescript, sdk' }],
  ],

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
