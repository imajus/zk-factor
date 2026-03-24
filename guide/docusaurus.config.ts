import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'ZK Factor',
  tagline: 'Privacy-Preserving Invoice Factoring on Aleo',
  favicon: 'img/favicon.ico',

  url: 'https://docs.zkfactor.xyz',
  baseUrl: '/docs/',

  organizationName: 'imajus',
  projectName: 'zk-factor',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/', // Serve the docs at the site's root
          editUrl: 'https://github.com/imajus/zk-factor/tree/main/guide/',
        },
        blog: false, // Disable the blog for now
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    async function tailwindPlugin(context, options) {
      return {
        name: 'docusaurus-tailwindcss',
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('@tailwindcss/postcss'));
          postcssOptions.plugins.push(require('autoprefixer'));
          return postcssOptions;
        },
      };
    },
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'ZK Factor Guide',
      logo: {
        alt: 'ZK Factor Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/imajus/zk-factor',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Guide',
          items: [
            {
              label: 'Introduction',
              to: '/',
            },
            {
              label: 'Getting Started',
              to: '/getting-started',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'X (Twitter)',
              href: 'https://x.com/zkfctr',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/imajus/zk-factor',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ZK Factor. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
