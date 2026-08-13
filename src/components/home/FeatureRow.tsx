const FEATURES = [
  {
    title: "Friends",
    description: "Find other XOrA players by username and keep a friends list.",
  },
  {
    title: "Messaging",
    description: "Send messages to friends from the launcher and this account site.",
  },
  {
    title: "Netplay Invites",
    description: "Invite friends into Libretro netplay sessions from XOrA.",
  },
  {
    title: "Cloud Saves",
    description: "Keep save files with your XOrA Network account.",
  },
  {
    title: "XOrA Network Sharing",
    description: "Share screenshots, profiles, and launcher moments with the network.",
  },
] as const;

export function FeatureRow() {
  return (
    <section className="feature-row" aria-labelledby="features-heading">
      <div className="section-heading">
        <p className="eyebrow">Network</p>
        <h2 id="features-heading">What XOrA Network will unlock</h2>
      </div>
      <ul className="feature-list">
        {FEATURES.map((feature) => (
          <li key={feature.title}>
            <article className="feature-card" data-nav-item tabIndex={0}>
              <div className="feature-orb" aria-hidden="true" />
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
              {feature.title === "Friends" ? (
                <span className="badge">Available</span>
              ) : (
                <span className="badge">Coming Soon</span>
              )}
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
