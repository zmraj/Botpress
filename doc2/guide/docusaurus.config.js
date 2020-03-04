module.exports = {
  title: "Developer's Guide",
  tagline: 'The tagline of my site',
  url: 'https://your-docusaurus-test-site.com',
  baseUrl: '/',
  favicon: 'img/favicon.ico',
  organizationName: 'facebook', // Usually your GitHub org/user name.
  projectName: 'docusaurus', // Usually your repo name.
  themeConfig: {
    navbar: {
      title: "| Developer's Guide",
      logo: {
        alt: 'Botpress',
        src: 'img/logo.svg'
      },
      links: [
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
          editUrl: 'https://github.com/facebook/docusaurus/edit/master/website/'
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css')
        }
      }
    ]
  ]
}
