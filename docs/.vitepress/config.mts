import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'AgentOJS',
  description: 'Agentic middleware for AI commerce — connect any e-commerce backend to Claude, ChatGPT, and Gemini via MCP, UCP, and ACP protocols',
  base: '/',

  head: [
    ['meta', { property: 'og:title', content: 'AgentOJS — Agentic Middleware for AI Commerce' }],
    ['meta', { property: 'og:description', content: 'Open-source agentic middleware — connect any e-commerce backend to Claude, ChatGPT, and Gemini. Pre-verified for MCP, UCP, and ACP protocols.' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://agentojs.com' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'AgentOJS — Agentic Middleware for AI Commerce' }],
    ['meta', { name: 'twitter:description', content: 'Connect any e-commerce backend to Claude, ChatGPT, and Gemini via MCP, UCP, and ACP protocols.' }],
    ['meta', { name: 'keywords', content: 'agentojs, mcp, ucp, acp, ai commerce, medusa, woocommerce, typescript, middleware, agentic middleware' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API Reference', link: '/api/commerce-provider' },
      { text: 'GitHub', link: 'https://github.com/agentojs/agentojs' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Guide',
          items: [
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Protocol Integration', link: '/guide/protocols' },
            { text: 'Medusa', link: '/guide/medusa' },
            { text: 'WooCommerce', link: '/guide/woocommerce' },
            { text: 'Generic REST', link: '/guide/generic' },
            { text: 'Custom Provider', link: '/guide/custom-provider' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'CommerceProvider', link: '/api/commerce-provider' },
            { text: 'Core Types', link: '/api/types' },
            { text: 'Errors', link: '/api/errors' },
            { text: 'MCP', link: '/api/mcp' },
            { text: 'UCP', link: '/api/ucp' },
            { text: 'ACP', link: '/api/acp' },
            { text: 'Express', link: '/api/express' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/agentojs/agentojs' },
    ],
  },
})
