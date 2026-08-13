import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner, 'bg-grid')}>
      <div className="container" style={{ position: 'relative', zIndex: 10 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          marginBottom: '1rem',
        }}>
          <span className="font-camiro" style={{
            fontSize: '0.875rem',
            fontWeight: 'bold',
            letterSpacing: '0.35em',
            color: 'var(--ifm-color-primary)',
            textTransform: 'uppercase'
          }}>— Live on Stellar Testnet —</span>
        </div>
        
        <h1 className="font-harabara" style={{
          fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
          lineHeight: 1.1,
          letterSpacing: '0.025em',
          marginBottom: '1.5rem',
          color: 'var(--accensa-title-color)'
        }}>
          <span style={{ display: 'block' }}>Trustless payments,</span>
          <span style={{ display: 'block', fontStyle: 'italic', fontWeight: 'normal', opacity: 0.7 }}>
            for AI agents.
          </span>
        </h1>
        <p style={{
          fontSize: '1.25rem',
          maxWidth: '42rem',
          margin: '0 auto 2rem',
          lineHeight: 1.6,
          color: 'var(--accensa-text-color)',
          fontWeight: 500
        }}>
          {siteConfig.tagline}
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/introduction">
            Get Started 🚀
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} Docs`}
      description="Merchant back-office for x402 sellers on Stellar">
      <HomepageHeader />
    </Layout>
  );
}
