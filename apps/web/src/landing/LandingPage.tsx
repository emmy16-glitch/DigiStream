const workflowSteps = [
  {
    number: '01',
    title: 'Create a channel',
    description: 'Name it and choose who can listen.',
  },
  {
    number: '02',
    title: 'Go live',
    description: 'Use your microphone from the browser.',
  },
  {
    number: '03',
    title: 'Share the link',
    description: 'Public listeners can join without an account.',
  },
];

function BrandMark() {
  return (
    <span className="landing-brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <i />
    </span>
  );
}

function AudioBars() {
  const heights = [8, 14, 22, 12, 28, 18, 10, 24, 16, 30, 12, 20, 9, 18, 12];

  return (
    <span className="landing-audio-bars" aria-hidden="true">
      {heights.map((height, index) => (
        <i key={`${height}-${index}`} style={{ height }} />
      ))}
    </span>
  );
}

function EditorialVisual() {
  return (
    <div className="landing-editorial-visual" aria-hidden="true">
      <div className="landing-warm-light" />
      <div className="landing-table-surface" />
      <div className="landing-table-edge" />

      <div className="landing-vase">
        <i className="landing-stem landing-stem-one" />
        <i className="landing-stem landing-stem-two" />
        <i className="landing-stem landing-stem-three" />
        <i className="landing-leaf landing-leaf-one" />
        <i className="landing-leaf landing-leaf-two" />
        <i className="landing-leaf landing-leaf-three" />
      </div>

      <div className="landing-microphone">
        <span className="landing-microphone-head">
          <i />
          <i />
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="landing-microphone-stand" />
        <span className="landing-microphone-base" />
      </div>
      <div className="landing-cable" />

      <article className="landing-broadcast-preview">
        <span className="landing-preview-status">EXAMPLE · UPCOMING</span>
        <strong>Your next service</strong>
        <small>Your organisation</small>
        <div className="landing-preview-player">
          <AudioBars />
          <span className="landing-preview-play" />
        </div>
      </article>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">
        Skip to main content
      </a>

      <header className="landing-header">
        <a className="landing-brand" href="/" aria-label="DigiStream home">
          <BrandMark />
          <span>DIGISTREAM</span>
        </a>

        <nav className="landing-navigation" aria-label="Main navigation">
          <a href="/listen">Discover</a>
          <a href="/signup">For creators</a>
          <a href="/login">Sign in</a>
          <a className="landing-button landing-button-primary landing-header-cta" href="/signup">
            Create account
          </a>
        </nav>
      </header>

      <main id="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-copy">
            <p className="landing-eyebrow">LIVE AUDIO, SIMPLY</p>
            <h1 id="landing-title">
              Live audio.
              <span>Real connection.</span>
            </h1>
            <p className="landing-hero-description">
              Broadcast a service, meeting or community event.
            </p>

            <div className="landing-hero-actions">
              <a className="landing-button landing-button-primary" href="/signup">
                Start a broadcast
              </a>
              <a className="landing-button landing-button-secondary" href="/listen">
                Listen now
              </a>
            </div>

            <p className="landing-listener-note">
              <span aria-hidden="true" />
              Listeners open one link. No account required for public broadcasts.
            </p>
          </div>

          <EditorialVisual />
        </section>

        <section
          className="landing-how-it-works"
          id="how-it-works"
          aria-labelledby="landing-workflow-title"
        >
          <h2 id="landing-workflow-title">How DigiStream works</h2>
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
      </main>

      <footer className="landing-footer">
        <div>
          <strong>DIGISTREAM</strong>
          <p>Live audio for services, meetings and community events.</p>
        </div>
        <nav aria-label="Footer navigation">
          <span title="A production privacy notice will be published before launch">Privacy</span>
          <span title="Production terms will be published before launch">Terms</span>
          <a href="/login">Sign in</a>
        </nav>
      </footer>
    </div>
  );
}
