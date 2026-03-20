import React from "react";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * PrivacyIcon — Shield representing privacy protection.
 * Inspired by Phosphor Icons / Tabler Icons (MIT License).
 */
export const PrivacyIcon: React.FC<IconProps> = ({
  className,
  width = 80,
  height = 80,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 80 80"
    width={width}
    height={height}
    className={className}
    fill="none"
    aria-label="Privacy protection"
    role="img"
  >
    {/* Shield outer */}
    <path
      d="M40 8 L68 20 L68 44 Q68 62 40 72 Q12 62 12 44 L12 20 Z"
      fill="currentColor"
      opacity="0.12"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Lock body */}
    <rect
      x="28"
      y="38"
      width="24"
      height="18"
      rx="4"
      fill="currentColor"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="2.5"
    />
    {/* Lock shackle */}
    <path
      d="M31 38 L31 32 Q31 24 40 24 Q49 24 49 32 L49 38"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* Keyhole */}
    <circle cx="40" cy="46" r="3" fill="currentColor" />
    <rect x="38.5" y="46" width="3" height="5" rx="1" fill="currentColor" />
  </svg>
);

/**
 * FraudPreventionIcon — Chain-link with a lock representing fraud prevention.
 * Inspired by Tabler Icons (MIT License).
 */
export const FraudPreventionIcon: React.FC<IconProps> = ({
  className,
  width = 80,
  height = 80,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 80 80"
    width={width}
    height={height}
    className={className}
    fill="none"
    aria-label="Fraud prevention"
    role="img"
  >
    {/* Left chain link */}
    <rect
      x="8"
      y="28"
      width="28"
      height="24"
      rx="12"
      stroke="currentColor"
      strokeWidth="3"
      fill="currentColor"
      opacity="0.08"
    />
    {/* Right chain link */}
    <rect
      x="44"
      y="28"
      width="28"
      height="24"
      rx="12"
      stroke="currentColor"
      strokeWidth="3"
      fill="currentColor"
      opacity="0.08"
    />
    {/* Overlap / connection area (clipped for chain effect) */}
    <rect
      x="30"
      y="32"
      width="20"
      height="16"
      fill="currentColor"
      opacity="0.12"
    />
    {/* Lock on top */}
    <rect
      x="32"
      y="12"
      width="16"
      height="13"
      rx="3"
      fill="currentColor"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="2"
    />
    <path
      d="M35 12 L35 8 Q35 4 40 4 Q45 4 45 8 L45 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <circle cx="40" cy="18" r="2" fill="currentColor" />
    {/* Blocked X mark */}
    <line
      x1="56"
      y1="54"
      x2="72"
      y2="70"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.6"
    />
    <line
      x1="72"
      y1="54"
      x2="56"
      y2="70"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      opacity="0.6"
    />
    <circle
      cx="64"
      cy="62"
      r="10"
      stroke="currentColor"
      strokeWidth="2.5"
      opacity="0.5"
    />
  </svg>
);

/**
 * SpeedIcon — Lightning bolt representing fast settlement.
 * Inspired by Phosphor Icons (MIT License).
 */
export const SpeedIcon: React.FC<IconProps> = ({
  className,
  width = 80,
  height = 80,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 80 80"
    width={width}
    height={height}
    className={className}
    fill="none"
    aria-label="Speed and settlement"
    role="img"
  >
    {/* Lightning bolt */}
    <path
      d="M46 8 L22 44 L38 44 L34 72 L58 36 L42 36 Z"
      fill="currentColor"
      opacity="0.18"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinejoin="round"
    />
    {/* Speed lines */}
    <line
      x1="8"
      y1="26"
      x2="20"
      y2="26"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.5"
    />
    <line
      x1="6"
      y1="36"
      x2="16"
      y2="36"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.4"
    />
    <line
      x1="8"
      y1="46"
      x2="20"
      y2="46"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.3"
    />
  </svg>
);

/**
 * EmptyStateIcon — Minimal line drawing for empty list / no results states.
 * Custom inline SVG.
 */
export const EmptyStateIcon: React.FC<IconProps> = ({
  className,
  width = 120,
  height = 120,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 120 120"
    width={width}
    height={height}
    className={className}
    fill="none"
    aria-label="No items found"
    role="img"
  >
    {/* Inbox / tray outline */}
    <rect
      x="18"
      y="50"
      width="84"
      height="52"
      rx="8"
      stroke="currentColor"
      strokeWidth="2.5"
      opacity="0.4"
    />
    {/* Inbox opening divider */}
    <path
      d="M18 76 L38 76 Q42 76 44 80 L48 88 L72 88 L76 80 Q78 76 82 76 L102 76"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity="0.4"
    />
    {/* Document 1 */}
    <rect
      x="28"
      y="20"
      width="28"
      height="36"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.25"
    />
    <line x1="33" y1="30" x2="50" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
    <line x1="33" y1="37" x2="50" y2="37" stroke="currentColor" strokeWidth="1.5" opacity="0.25" strokeLinecap="round" />
    {/* Document 2 */}
    <rect
      x="64"
      y="14"
      width="28"
      height="36"
      rx="4"
      stroke="currentColor"
      strokeWidth="2"
      opacity="0.2"
    />
    <line x1="69" y1="24" x2="86" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    <line x1="69" y1="31" x2="86" y2="31" stroke="currentColor" strokeWidth="1.5" opacity="0.2" strokeLinecap="round" />
    {/* Magnifying glass */}
    <circle
      cx="60"
      cy="80"
      r="10"
      stroke="currentColor"
      strokeWidth="2.5"
      opacity="0.45"
    />
    <line
      x1="68"
      y1="88"
      x2="76"
      y2="96"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.45"
    />
    {/* Sad dash inside glass */}
    <line x1="56" y1="80" x2="64" y2="80" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
  </svg>
);
