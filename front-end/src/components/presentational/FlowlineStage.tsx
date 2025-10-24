import * as React from 'react';

export type FlowlineStageProps = {
  className?: string;
  children: React.ReactNode;
  activated?: boolean;
};

export function FlowlineStage({ className, children, activated }: FlowlineStageProps) {
  const classes = ['flowline-stage', activated ? 'is-activated' : '', className].filter(Boolean).join(' ');
  return (
    <div className={classes} data-keep>
      {children}
    </div>
  );
}

export default FlowlineStage;