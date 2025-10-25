
export type DividerGlowProps = { className?: string };

export function DividerGlow({ className }: DividerGlowProps) {
  const classes = ['divider-glow', 'u-divider-aurora', className].filter(Boolean).join(' ');
  return <div className={classes} aria-hidden="true" />;
}

export default DividerGlow;