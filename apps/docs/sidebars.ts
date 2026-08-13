import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'introduction',
    {
      type: 'category',
      label: 'Accensa App',
      items: [
        'app/overview',
        'onboarding',
        'user-guides',
      ],
    },
    {
      type: 'category',
      label: 'Smart Contracts',
      items: [
        'contracts/overview',
        {
          type: 'link',
          label: 'Mechanics',
          href: 'https://github.com/accensa/accensa-contracts/blob/main/docs/mechanics.md',
        },
        {
          type: 'link',
          label: 'Contracts',
          href: 'https://github.com/accensa/accensa-contracts/blob/main/docs/contracts.md',
        },
      ],
    },
    {
      type: 'category',
      label: 'Facilitator Middleware',
      items: [
        'facilitator/overview',
      ],
    },
    {
      type: 'category',
      label: 'General Guides',
      items: [
        'developer',
        'contributing',
        'troubleshooting',
      ],
    }
  ],
};

export default sidebars;
