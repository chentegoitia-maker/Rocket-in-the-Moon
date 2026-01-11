import React from 'react';

export const EffectLayer: React.FC<{type: any}> = ({type}) => {
  if (!type) return null;

  // Si hay una amenaza, la pantalla parpadeará en rojo suave
  return (
    <div className="fixed inset-0 z-[500] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-red-600/20 animate-pulse transition-opacity duration-75" />
    </div>
  );
};
