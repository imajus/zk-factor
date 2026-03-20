interface IconProps {
  className?: string;
  size?: number;
}

export function ZKPrivacyIcon({ className, size = 64 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      <g
        transform="translate(4, 4)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        {/* shield outline */}
        <path d="M12 3a12 12 0 0 0 8.5 3A12 12 0 0 1 12 21A12 12 0 0 1 3.5 6A12 12 0 0 0 12 3" />
        {/* lock keyhole inside shield */}
        <path d="M11 11a1 1 0 1 0 2 0a1 1 0 1 0-2 0m1 1v2.5" />
      </g>
    </svg>
  );
}

export function AntiDoubleFactorIcon({ className, size = 64 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      {/* file-x — document with X mark */}
      <g
        transform="translate(2, 3) scale(0.9)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        opacity={0.55}
      >
        <path d="M14 3v4a1 1 0 0 0 1 1h4" />
        <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v11a2 2 0 0 1-2 2m-7-9l4 4m0-4l-4 4" />
      </g>
      {/* ban circle — bottom-right overlay */}
      <g
        transform="translate(14, 14) scale(0.75)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
      >
        <circle cx="9" cy="9" r="9" fill="currentColor" fillOpacity={0.1} stroke="none" />
        <path d="M3 9a9 9 0 1 0 18 0a9 9 0 1 0-18 0m2.7-6.3l12.6 12.6" />
      </g>
    </svg>
  );
}

export function InstantSettlementIcon({ className, size = 64 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      {/* coins — background right */}
      <g
        transform="translate(12, 7) scale(0.75)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        opacity={0.55}
      >
        <path d="M9 14c0 1.657 2.686 3 6 3s6-1.343 6-3s-2.686-3-6-3s-6 1.343-6 3" />
        <path d="M9 14v4c0 1.656 2.686 3 6 3s6-1.344 6-3v-4" />
        <path d="M3 6c0 1.072 1.144 2.062 3 2.598s4.144.536 6 0S15 7.072 15 6s-1.144-2.062-3-2.598s-4.144-.536-6 0S3 4.928 3 6" />
        <path d="M3 6v10c0 .888.772 1.45 2 2" />
        <path d="M3 11c0 .888.772 1.45 2 2" />
      </g>
      {/* bolt — foreground left */}
      <g
        transform="translate(3, 2)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M13 3v7h6l-8 11v-7H5z" />
      </g>
    </svg>
  );
}

export function EmptyStateIcon({ className, size = 64 }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
    >
      <g
        transform="translate(4, 4)"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        {/* inbox-off — inbox with diagonal slash */}
        <path d="M8 4h10a2 2 0 0 1 2 2v10m-.593 3.422A2 2 0 0 1 18 20H6a2 2 0 0 1-2-2V6c0-.554.225-1.056.59-1.418" />
        <path d="M4 13h3l3 3h4l.987-.987M17 13h3M3 3l18 18" />
      </g>
    </svg>
  );
}
