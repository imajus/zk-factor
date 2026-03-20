interface IconProps {
  className?: string;
  size?: number;
}

export function CreditorIcon({ className, size = 96 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity={0.08} />
      <g
        transform="translate(12, 12)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        {/* folded corner tab */}
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        {/* document body + ruled lines */}
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2M9 7h1m-1 6h6m-2 4h2" />
      </g>
    </svg>
  );
}

export function FactorIcon({ className, size = 96 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={className}
    >
      <circle cx="24" cy="24" r="22" fill="currentColor" fillOpacity={0.08} />
      {/* briefcase body */}
      <g
        transform="translate(12, 14)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        <path d="M12 12v.01" />
        <path d="M3 13a20 20 0 0 0 18 0" />
      </g>
      {/* trending-up badge — bottom-right */}
      <circle cx="36" cy="37" r="9" fill="currentColor" fillOpacity={0.12} />
      <g
        transform="translate(30, 30) scale(0.625)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      >
        <path d="m3 17l6-6l4 4l8-8" />
        <path d="M14 7h7v7" />
      </g>
    </svg>
  );
}
