/**
 * Pixel-crisp 16x16 inline SVG Companion Lens Micro-Icons (Story 12.1).
 *
 * Built on an exact integer 16x16 grid with `shapeRendering="crispEdges"` so
 * icons stay razor-sharp alongside Newsreader / DM Sans / JetBrains Mono UI
 * copy in both Light and Dark Editorial Atlas themes and forced-colors mode.
 *
 * Zero external URLs; mirrors `client/public/assets/trail/lens-micro-icons.svg`.
 */

import React from 'react';

export type CompanionLensKey =
  | 'hoodoo-folk'
  | 'historical-classic'
  | 'community';

export interface LensMicroIconProps {
  size?: number;
  className?: string;
  title?: string;
  'aria-hidden'?: boolean;
  'aria-label'?: string;
}

export const LENS_MICRO_ICONS_SVG_PATH = '/assets/trail/lens-micro-icons.svg';

/**
 * Herb Sprig (`hoodoo-folk`) — Tied hyssop & botanical sage sprig bound with ochre twine.
 */
export const HerbSprigIcon: React.FC<LensMicroIconProps> = ({
  size = 16,
  className,
  title,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
}) => {
  const isDecorative = ariaHidden ?? (!ariaLabel && !title);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={ariaLabel}
      data-lens-icon="hoodoo-folk"
    >
      {title ? <title>{title}</title> : null}
      {/* Central hyssop/sage stem & balanced leaves */}
      <g fill="currentColor">
        <rect x="7" y="3" width="2" height="11" />
        <rect x="4" y="3" width="3" height="2" />
        <rect x="3" y="4" width="1" height="1" />
        <rect x="9" y="3" width="3" height="2" />
        <rect x="12" y="4" width="1" height="1" />
        <rect x="3" y="7" width="4" height="2" />
        <rect x="2" y="8" width="1" height="1" />
        <rect x="9" y="7" width="4" height="2" />
        <rect x="13" y="8" width="1" height="1" />
      </g>
      {/* Crown bud & ochre twine tie */}
      <g fill="var(--accent-ochre, #8A6A2F)">
        <rect x="7" y="1" width="2" height="2" />
        <rect x="5" y="11" width="6" height="2" />
        <rect x="6" y="13" width="1" height="2" />
        <rect x="9" y="13" width="1" height="2" />
      </g>
    </svg>
  );
};

/**
 * Open Codex (`historical-classic`) — Illuminated open scripture volume with bookmark ribbon.
 */
export const OpenCodexIcon: React.FC<LensMicroIconProps> = ({
  size = 16,
  className,
  title,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
}) => {
  const isDecorative = ariaHidden ?? (!ariaLabel && !title);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={ariaLabel}
      data-lens-icon="historical-classic"
    >
      {title ? <title>{title}</title> : null}
      {/* Outer cover, open page tops, center spine & scripture lines */}
      <g fill="currentColor">
        <rect x="1" y="3" width="1" height="10" />
        <rect x="14" y="3" width="1" height="10" />
        <rect x="1" y="12" width="14" height="2" />
        <rect x="2" y="2" width="5" height="1" />
        <rect x="9" y="2" width="5" height="1" />
        <rect x="7" y="3" width="2" height="10" />
        <rect x="3" y="5" width="3" height="1" />
        <rect x="3" y="7" width="3" height="1" />
        <rect x="3" y="9" width="3" height="1" />
        <rect x="10" y="5" width="3" height="1" />
        <rect x="10" y="7" width="3" height="1" />
        <rect x="10" y="9" width="3" height="1" />
      </g>
      {/* Illuminated slate-blue bookmark ribbon */}
      <g fill="var(--accent-slate-blue, #345474)">
        <rect x="7" y="13" width="2" height="2" />
        <rect x="7" y="15" width="1" height="1" />
      </g>
    </svg>
  );
};

/**
 * Lantern Circle (`community`) — Warm brass lantern encircled by fellowship sparks.
 */
export const LanternCircleIcon: React.FC<LensMicroIconProps> = ({
  size = 16,
  className,
  title,
  'aria-hidden': ariaHidden,
  'aria-label': ariaLabel,
}) => {
  const isDecorative = ariaHidden ?? (!ariaLabel && !title);
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      shapeRendering="crispEdges"
      className={className}
      role={isDecorative ? undefined : 'img'}
      aria-hidden={isDecorative ? true : undefined}
      aria-label={ariaLabel}
      data-lens-icon="community"
    >
      {title ? <title>{title}</title> : null}
      {/* Central brass lantern frame */}
      <g fill="currentColor">
        <rect x="6" y="3" width="4" height="1" />
        <rect x="5" y="4" width="6" height="1" />
        <rect x="5" y="5" width="1" height="6" />
        <rect x="10" y="5" width="1" height="6" />
        <rect x="5" y="11" width="6" height="1" />
        <rect x="6" y="12" width="4" height="1" />
      </g>
      {/* Flame core & welcoming terracotta/amber fellowship ring */}
      <g fill="var(--accent-terracotta, #B84A39)">
        <rect x="7" y="1" width="2" height="1" />
        <rect x="2" y="3" width="2" height="2" />
        <rect x="12" y="3" width="2" height="2" />
        <rect x="1" y="7" width="1" height="2" />
        <rect x="14" y="7" width="1" height="2" />
        <rect x="2" y="11" width="2" height="2" />
        <rect x="12" y="11" width="2" height="2" />
        <rect x="7" y="14" width="2" height="1" />
        <rect x="7" y="6" width="2" height="4" />
        <rect x="6" y="7" width="4" height="2" />
      </g>
    </svg>
  );
};

export interface LensMicroIconDispatchProps extends LensMicroIconProps {
  lens: CompanionLensKey;
}

/**
 * Convenience dispatcher rendering the matching 16x16 micro-icon for a Companion lens.
 */
export const LensMicroIcon: React.FC<LensMicroIconDispatchProps> = ({
  lens,
  ...props
}) => {
  switch (lens) {
    case 'hoodoo-folk':
      return <HerbSprigIcon {...props} />;
    case 'historical-classic':
      return <OpenCodexIcon {...props} />;
    case 'community':
      return <LanternCircleIcon {...props} />;
  }
};
