import * as React from 'react';

export type AuroraHeroProps = {
  className?: string;
  children: React.ReactNode;
  activated?: boolean;
  showScrollIndicator?: boolean;
};

export function AuroraHero({ className, children, activated, showScrollIndicator = true }: AuroraHeroProps) {
  const classes = ['hero-aurora', activated ? 'is-activated' : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} data-keep>
      {children}
      {showScrollIndicator ? <div className="hero-scroll-indicator" aria-hidden="true" /> : null}
    </div>
  );
}

export default AuroraHero;