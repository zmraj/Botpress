const versions = require('./versions.json')

module.exports = {
  title: "Developer's Guide",
  tagline: 'Guides and references for all you need to know about Botpress',
  url: 'https://botpress.com',
  baseUrl: '/docs2/',
  favicon: 'img/favicon.ico',
  organizationName: 'botpress', // Usually your GitHub org/user name.
  projectName: 'botpress', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: "| Developer's Guide",
      logo: {
        alt: 'Botpress',
        src: 'img/logo.svg'
      },
      links: [
        {
          to: 'versions',
          label: `${versions[0]}`,
          position: 'left',
          style: {
            whiteSpace: 'nowrap',
            padding: '0.25rem 0.5rem 0.2rem 0.25rem',
            fontSize: 'calc(0.9 * var(--ifm-font-size-base))',
            textDecoration: 'underline'
          }
        },
        { to: 'docs/overview', label: 'Docs', position: 'right' },
        { to: 'https://botpress.com/reference/', label: 'SDK', position: 'right' },
        { to: 'https://forum.botpress.com/', label: 'Community', position: 'right' },
        {
          href: 'https://github.com/botpress/botpress',
          label: 'GitHub',
          position: 'right'
        }
      ]
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            {
              label: 'Getting Started',
              to: 'docs/introduction'
            },
            {
              label: 'API Reference',
              to: 'https://botpress.com/reference/'
            }
          ]
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Forum',
              href: 'https://forum.botpress.com/'
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/search?q=botpress'
            }
          ]
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              to: 'https://github.com/botpress'
            },
            {
              label: 'Twitter',
              href: 'https://twitter.com/getbotpress'
            }
          ]
        }
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Botpress, Inc.`
    }
  },
  presets: [
    [
      '@docusaurus/preset-classic',
      {
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/botpress/botpress/edit/master/docs/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
}
