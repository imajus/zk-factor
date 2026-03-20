import React from "react";

interface IconProps {
  className?: string;
  width?: number;
  height?: number;
}

/**
 * BusinessIcon — Illustrative SVG for the Creditor/Business role.
 * Theme: invoice / document.
 * Inspired by Phosphor Icons (MIT License).
 */
export const BusinessIcon: React.FC<IconProps> = ({
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
    aria-label="Business / Creditor role"
    role="img"
  >
    {/* Document body */}
    <rect
      x="20"
      y="10"
      width="66"
      height="86"
      rx="6"
      ry="6"
      fill="currentColor"
      opacity="0.12"
      stroke="currentColor"
      strokeWidth="3"
    />

    {/* Folded corner */}
    <path
      d="M70 10 L86 26 L70 26 Z"
      fill="currentColor"
      opacity="0.25"
    />
    <path
      d="M70 10 L86 26"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Invoice lines */}
    <line
      x1="32"
      y1="42"
      x2="74"
      y2="42"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="32"
      y1="54"
      x2="74"
      y2="54"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />
    <line
      x1="32"
      y1="66"
      x2="56"
      y2="66"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
    />

    {/* Currency badge */}
    <circle
      cx="88"
      cy="88"
      r="18"
      fill="currentColor"
      opacity="0.15"
      stroke="currentColor"
      strokeWidth="3"
    />
    <text
      x="88"
      y="94"
      textAnchor="middle"
      fontSize="20"
      fontWeight="bold"
      fill="currentColor"
    >
      $
    </text>
  </svg>
);

/**
 * FactorIcon — Illustrative SVG for the Factor role.
 * Theme: investment / briefcase.
 * Inspired by Tabler Icons (MIT License).
 */
export const FactorIcon: React.FC<IconProps> = ({
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
    aria-label="Factor / Investor role"
    role="img"
  >
    {/* Briefcase body */}
    <rect
      x="14"
      y="42"
      width="92"
      height="60"
      rx="8"
      ry="8"
      fill="currentColor"
      opacity="0.12"
      stroke="currentColor"
      strokeWidth="3"
    />

    {/* Briefcase handle */}
    <path
      d="M42 42 L42 30 Q42 22 60 22 Q78 22 78 30 L78 42"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Center latch bar */}
    <line
      x1="14"
      y1="68"
      x2="106"
      y2="68"
      stroke="currentColor"
      strokeWidth="3"
      opacity="0.5"
    />
    <rect
      x="50"
      y="62"
      width="20"
      height="12"
      rx="3"
      fill="currentColor"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="2"
    />

    {/* Upward trend arrow */}
    <polyline
      points="28,88 46,72 60,80 86,58"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <polyline
      points="78,58 86,58 86,66"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
