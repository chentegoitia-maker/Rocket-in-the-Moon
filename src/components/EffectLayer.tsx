import React from 'react';

export const EffectLayer: React.FC<{type: any}> = ({ type }) => {
  if (!type) return null;
  return (
    <div className="fixed inset-0 z-[500] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-red-600/10 animate-pulse" />
    </div>
  );
};
