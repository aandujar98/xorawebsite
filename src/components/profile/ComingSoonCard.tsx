type ComingSoonCardProps = {
  title: string;
  description: string;
};

export function ComingSoonCard({ title, description }: ComingSoonCardProps) {
  return (
    <article className="preview-card">
      <div className="preview-icon" aria-hidden="true" />
      <div>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <span className="badge">Coming Soon</span>
    </article>
  );
}
