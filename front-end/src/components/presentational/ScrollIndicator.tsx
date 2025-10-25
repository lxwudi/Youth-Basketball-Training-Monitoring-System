
export type ScrollIndicatorProps = { className?: string };

export function ScrollIndicator({ className }: ScrollIndicatorProps) {
  const classes = ['scroll-indicator', className].filter(Boolean).join(' ');
  return <div className={classes} aria-hidden="true" />;
}

export default ScrollIndicator;