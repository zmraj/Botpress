import React from 'react'
import classnames from 'classnames'
import Layout from '@theme/Layout'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import useBaseUrl from '@docusaurus/useBaseUrl'
import styles from './styles.module.css'

const features = [
  {
    title: <>🚀 Getting Started</>,
    href: 'docs/introduction',
    description: <>New to Botpress? This documentation will help you learn the ropes quickly.</>
  },
  {
    title: <>💡 Tutorials</>,
    href: 'docs/tutorials/cluster-digital-ocean',
    description: <>Guides and examples solving typical issues you may run into.</>
  },
  {
    title: <>📘 SDK Reference</>,
    href: 'https://botpress.com/reference/',
    description: <>Find all the code references you need in this always up-to-date Botpress SDK Reference.</>
  },
  {
    title: <>💻 Code Examples</>,
    href: 'https://github.com/botpress/botpress/tree/master/examples',
    description: <>Advanced examples for developers on how you can use Botpress.</>
  }
]

function Feature({ title, href, description }) {
  return (
    <div className={classnames('col col--3', styles.feature)}>
      <h3>
        <a href={href}>{title}</a>
      </h3>
      <p>{description}</p>
    </div>
  )
}

function Home() {
  const context = useDocusaurusContext()
  const { siteConfig = {} } = context
  return (
    <Layout title={`Hello from ${siteConfig.title}`} description="Description will go into a meta tag in <head />">
      <header className={classnames('hero hero--primary', styles.heroBanner)}>
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
          <div className={styles.buttons}>
            <Link
              className={classnames('button button--outline button--secondary button--lg', styles.getStarted)}
              to={useBaseUrl('docs/doc1')}
            >
              Try it out
            </Link>
          </div>
        </div>
      </header>
      <main>
        {features && features.length && (
          <section className={styles.features}>
            <div className="container">
              <div className="row">
                {features.map((props, idx) => (
                  <Feature key={idx} {...props} />
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </Layout>
  )
}

export default Home
