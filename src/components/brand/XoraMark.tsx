type XoraMarkProps = {
  size?: number;
  className?: string;
};

export function XoraMark({ size = 44, className }: XoraMarkProps) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="29" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="21" stroke="rgba(255,255,255,0.88)" strokeWidth="1.25" />
      <path
        d="M18 18 L46 46 M46 18 L18 46"
        stroke="white"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="4.5" fill="white" />
    </svg>
  );
}
