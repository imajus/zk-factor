import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'index',
    'getting-started',
    {
      type: 'category',
      label: 'For Businesses',
      items: [
        'business/create-invoice',
        'business/factor-invoice',
        // 'business/recourse',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'For Factors',
      items: [
        'factor/register',
        'factor/dashboard',
        'factor/pools',
        'factor/settlement',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'For Debtors',
      items: [
        'debtor/pay-invoice',
      ],
      collapsed: false,
    },
    {
      type: 'category',
      label: 'Platform Features',
      items: [
        'features/documents',
        // 'features/notifications',
        'features/usdcx',
      ],
      collapsed: false,
    },
  ],
};

export default sidebars;
