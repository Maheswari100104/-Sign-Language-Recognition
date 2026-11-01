
import "./Home.css";

const features = [
  {
    icon: "✋",
    title: "AI Sign Recognition",
    text: "Recognize supported hand-sign alphabet gestures through your webcam.",
    color: "lavender",
  },
  {
    icon: "Aa",
    title: "Text Conversion",
    text: "Convert recognized letters into readable, editable text.",
    color: "pink",
  },
  {
    icon: "🔊",
    title: "Text to Speech",
    text: "Speak your composed message aloud using speech output.",
    color: "blue",
  },
];

export default function Home({ onGetStarted = () => {} }) {
  const scrollTo = (id) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <main className="signora-home">
      <header className="sh-header">
        <a className="sh-brand" href="#home">
          SIGNORA <span>AI</span>
        </a>

        <nav className="sh-nav">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            Home
          </button>
          <button onClick={() => scrollTo("about")}>About Us</button>
          <button onClick={() => scrollTo("features")}>Features</button>
          <button onClick={() => scrollTo("how")}>How It Works</button>
        </nav>

        <button className="sh-login" onClick={onGetStarted}>
          Login <span>→</span>
        </button>
      </header>

      <section className="sh-hero" id="home">
        <div className="sh-hero-copy">
          <div className="sh-eyebrow">
            <span /> AI POWERED SIGN LANGUAGE COMMUNICATION
          </div>

          <h1>
            Sign.
            <br />
            <span>Speak.</span>
            <br />
            Connect.
          </h1>

          <p>
            SIGNORA AI connects sign language, readable text and voice to make
            communication easier, faster and more accessible.
          </p>

          <div className="sh-actions">
            <button className="sh-primary" onClick={onGetStarted}>
              Start Communicating <span>→</span>
            </button>
            <button className="sh-secondary" onClick={() => scrollTo("features")}>
              Explore Features
            </button>
          </div>

          <div className="sh-trust">
            <span>✦</span> Designed with accessibility in mind
          </div>
        </div>

        <div className="sh-flow-card">
          <div className="sh-flow-header">
            <strong>SIGNORA AI Communication</strong>
            <span className="sh-live"><i /> Live Flow</span>
          </div>

          <div className="sh-flow">
            <div className="sh-flow-tile sh-lavender">
              <div className="sh-flow-icon">✋</div>
              <strong>Sign Language</strong>
              <small>Show a gesture</small>
            </div>
            <span className="sh-flow-line" />
            <div className="sh-flow-tile sh-pink">
              <div className="sh-flow-icon">Aa</div>
              <strong>Text</strong>
              <small>Meaning detected</small>
            </div>
            <span className="sh-flow-line" />
            <div className="sh-flow-tile sh-blue">
              <div className="sh-flow-icon">🔊</div>
              <strong>Voice</strong>
              <small>Message spoken</small>
            </div>
          </div>

          <div className="sh-flow-caption">
            <span>✋ Sign</span><b>→</b>
            <span className="sh-caption-pink">Aa Text</span><b>→</b>
            <span className="sh-caption-blue">🔊 Voice</span>
          </div>

          <div className="sh-pills">
            <span>✦ AI Recognition</span>
            <span>ϟ Real-Time</span>
            <span>▣ Accessible</span>
          </div>
        </div>
      </section>

      <section className="sh-section" id="about">
        <div className="sh-section-label">ABOUT SIGNORA AI</div>
        <h2>Communication should have <span>no barriers.</span></h2>
        <p>
          SIGNORA AI helps turn supported hand-sign alphabet gestures into text
          and spoken output. It combines computer vision with a simple,
          accessible communication workspace.
        </p>
      </section>

      <section className="sh-section sh-features" id="features">
        <div className="sh-section-label">WHAT YOU CAN DO</div>
        <h2>Simple tools. More ways to connect.</h2>
        <p className="sh-intro">
          Explore the key features of the SIGNORA AI workspace.
        </p>

        <div className="sh-feature-grid">
          {features.map((feature) => (
            <article className="sh-feature-card" key={feature.title}>
              <div className={`sh-feature-icon ${feature.color}`}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="sh-section" id="how">
        <div className="sh-section-label">HOW IT WORKS</div>
        <h2>From gesture to message.</h2>

        <div className="sh-how-grid">
          <article>
            <span>01</span>
            <h3>Show a sign</h3>
            <p>Allow camera access and show a supported hand gesture.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Recognize and compose</h3>
            <p>The model predicts letters that can be collected into text.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Express your message</h3>
            <p>Edit your message and use speech output to read it aloud.</p>
          </article>
        </div>

        <button className="sh-primary sh-bottom-cta" onClick={onGetStarted}>
          Get Started <span>→</span>
        </button>
      </section>

      <footer className="sh-footer">
        <a className="sh-brand" href="#home">
          SIGNORA <span>AI</span>
        </a>
        <p>Accessible communication through technology.</p>
        <small>© SIGNORA AI</small>
      </footer>
    </main>
  );
}
