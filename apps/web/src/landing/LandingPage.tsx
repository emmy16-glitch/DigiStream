import { BrandLockup } from '../design-system/components';
import { Icon, type IconName } from '../design-system/Icon';

const features: Array<{
  icon: IconName;
  title: string;
  description: string;
}> = [
  {
    icon: 'broadcast',
    title: 'Live Broadcast',
    description: 'Go live in seconds',
  },
  {
    icon: 'headphones',
    title: 'HD Audio',
    description: 'Clear listener playback',
  },
  {
    icon: 'audience',
    title: 'Private Calls',
    description: 'Invite guests to the Studio Lobby',
  },
  {
    icon: 'recording',
    title: 'Record & Share',
    description: 'Publish replays when ready',
  },
];

const workflowSteps = [
  {
    number: '01',
    title: 'Create a channel',
    description: 'Set up the home for your broadcasts.',
  },
  {
    number: '02',
    title: 'Go live',
    description: 'Prepare your microphone, verify delivery and start broadcasting.',
  },
  {
    number: '03',
    title: 'Share the link',
    description: 'Public listeners can open your broadcast without creating an account.',
  },
];

function LandingCreatorArtwork() {
  return (
    <svg
      aria-label="Creator wearing headphones and speaking into a studio microphone"
      className="landing-creator-artwork"
      role="img"
      viewBox="0 0 760 760"
    >
      <defs>
        <linearGradient id="landingHeroBg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8eceb" />
          <stop offset="0.58" stopColor="#f0d2d1" />
          <stop offset="1" stopColor="#e7b6b6" />
        </linearGradient>
        <linearGradient id="landingShirt" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8eceb" />
          <stop offset="1" stopColor="#e7b6b6" />
        </linearGradient>
        <radialGradient id="landingFace" cx="45%" cy="35%" r="70%">
          <stop offset="0" stopColor="#9a6651" />
          <stop offset="1" stopColor="#4d2d26" />
        </radialGradient>
        <filter id="landingSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" />
        </filter>
      </defs>

      <rect width="760" height="760" fill="url(#landingHeroBg)" />
      <g opacity="0.7" filter="url(#landingSoft)">
        <circle cx="102" cy="150" r="116" fill="#f8eceb" />
        <circle cx="655" cy="110" r="104" fill="#fdf6f4" />
        <circle cx="655" cy="624" r="154" fill="#d58f97" />
      </g>

      <path d="M120 760c33-165 127-249 278-249 145 0 240 84 274 249Z" fill="url(#landingShirt)" />
      <ellipse cx="365" cy="345" rx="126" ry="153" fill="url(#landingFace)" />
      <path d="M251 330c8-104 50-171 127-171 75 0 121 56 128 139-36-48-95-74-174-59-34 7-61 37-81 91Z" fill="#1f2025" />

      <path d="M244 310c-30 18-44 58-32 99 7 26 24 44 46 52" fill="none" stroke="#1f2025" strokeWidth="28" strokeLinecap="round" />
      <path d="M496 301c32 18 47 60 34 102-8 27-25 46-49 54" fill="none" stroke="#1f2025" strokeWidth="28" strokeLinecap="round" />
      <path d="M236 307c22-89 73-139 139-139 72 0 124 50 143 137" fill="none" stroke="#3d3f47" strokeWidth="26" strokeLinecap="round" />

      <g fill="none" stroke="#1f2025" strokeWidth="11">
        <rect x="267" y="326" width="88" height="55" rx="25" />
        <rect x="382" y="326" width="88" height="55" rx="25" />
        <path d="M355 349h27" />
      </g>
      <circle cx="311" cy="352" r="12" fill="#f8eceb" opacity="0.64" />
      <circle cx="427" cy="352" r="12" fill="#f8eceb" opacity="0.64" />
      <path d="M335 429c27 21 66 21 93-3" fill="none" stroke="#f2c7b5" strokeWidth="12" strokeLinecap="round" />
      <path d="M363 375c-9 28-14 43-13 52 11 8 25 10 40 5" fill="none" stroke="#3c211e" strokeWidth="9" strokeLinecap="round" />

      <g transform="translate(514 417) rotate(-8)">
        <rect x="0" y="0" width="98" height="178" rx="48" fill="#1f2025" />
        <rect x="17" y="20" width="64" height="104" rx="32" fill="#3d3f47" />
        <g stroke="#d58f97" strokeWidth="5" opacity="0.85">
          <path d="M27 42h44M23 61h52M22 80h54M25 99h48" />
        </g>
        <path d="M49 178v92M-10 268h120" stroke="#1f2025" strokeWidth="18" strokeLinecap="round" />
      </g>
      <path d="M515 491c-67 9-111 6-156-10" fill="none" stroke="#3d3f47" strokeWidth="16" strokeLinecap="round" />

      <circle cx="674" cy="116" r="44" fill="#e7b6b6" opacity="0.92" />
      <circle cx="102" cy="595" r="62" fill="#f8eceb" opacity="0.88" />
    </svg>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        Skip to main content
      </a>

      <div className="landing-frame">
        <header className="landing-header">
          <a className="landing-brand" href="/" aria-label="DigiStream home">
            <BrandLockup />
          </a>

          <nav className="landing-navigation" aria-label="Main navigation">
            <a href="#features">Features</a>
            <a href="#how-it-works">How it works</a>
            <a href="#pricing">Pricing</a>
            <a href="#about">About</a>
          </nav>

          <div className="landing-account-actions">
            <a className="landing-login-link" href="/login">
              Login
            </a>
            <a className="landing-button landing-button-primary landing-header-cta" href="/signup">
              Sign up
            </a>
          </div>
        </header>

        <main id="landing-main">
          <section className="landing-hero" aria-labelledby="landing-title">
            <div className="landing-hero-copy">
              <h1 id="landing-title">
                Live audio.
                <span>Real connection.</span>
                <span>Zero limits.</span>
              </h1>

              <p className="landing-hero-description">
                Create, listen and share live audio with your audience anywhere.
              </p>

              <div className="landing-hero-actions">
                <a className="landing-button landing-button-primary" href="/signup">
                  Start a broadcast
                </a>
                <a className="landing-button landing-button-secondary" href="/listen">
                  Listen now
                </a>
              </div>

              <div className="landing-trust-block" aria-label="DigiStream community">
                <span>Built for creators and communities</span>
                <div className="landing-trust-row" aria-hidden="true">
                  <span className="landing-avatar landing-avatar-one" />
                  <span className="landing-avatar landing-avatar-two" />
                  <span className="landing-avatar landing-avatar-three" />
                  <span className="landing-avatar landing-avatar-four" />
                  <span className="landing-avatar landing-avatar-more">+</span>
                </div>
              </div>
            </div>

            <div className="landing-hero-visual">
              <LandingCreatorArtwork />
            </div>
          </section>

          <section className="landing-feature-grid" id="features" aria-label="DigiStream features">
            {features.map((feature) => (
              <article className="landing-feature-card" key={feature.title}>
                <span className="landing-feature-icon" aria-hidden="true">
                  <Icon name={feature.icon} size={28} />
                </span>
                <div>
                  <h2>{feature.title}</h2>
                  <p>{feature.description}</p>
                </div>
              </article>
            ))}
          </section>
        </main>
      </div>

      <section
        className="landing-how-it-works"
        id="how-it-works"
        aria-labelledby="landing-workflow-title"
      >
        <div className="landing-section-heading">
          <span>How it works</span>
          <h2 id="landing-workflow-title">From setup to live audio in a clear flow.</h2>
        </div>
        <div className="landing-workflow-grid">
          {workflowSteps.map((step) => (
            <article className="landing-workflow-step" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-pricing-note" id="pricing" aria-label="Pricing">
        <strong>Pricing</strong>
        <p>Launch pricing will be published before paid plans are enabled.</p>
      </section>

      <footer className="landing-footer" id="about">
        <div className="landing-footer-brand">
          <BrandLockup />
          <p>Live audio for creators, churches and communities.</p>
        </div>

        <div className="landing-footer-groups" aria-label="Footer navigation">
          <nav className="landing-footer-group" aria-label="Product">
            <strong>Product</strong>
            <a href="/listen">Discover</a>
            <a href="/login">Sign in</a>
          </nav>

          <nav className="landing-footer-group" aria-label="Company">
            <strong>Company</strong>
            <a href="/about">About</a>
          </nav>

          <div className="landing-footer-group" aria-label="Legal">
            <strong>Legal</strong>
            <span title="A production privacy notice will be published before launch">Privacy</span>
            <span title="Production terms will be published before launch">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
