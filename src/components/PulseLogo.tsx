import React from 'react';

interface PulseLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showBadge?: boolean;
}

export const PulseLogo: React.FC<PulseLogoProps> = ({ 
  size = 'md', 
  showText = false, 
  showBadge = false 
}) => {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  return (
    <div className="flex items-center gap-2.5 select-none">
      <div 
        className={`relative flex items-center justify-center rounded-xl transition-all duration-300 ${
          isLarge 
            ? 'w-16 h-16 bg-[#101726] border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.25)]' 
            : isSmall
            ? 'w-7 h-7 bg-[#101726] border border-cyan-500/30 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
            : 'w-8 h-8 bg-[#101726] border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
        }`}
      >
        {/* Glowing pulse line SVG */}
        <svg 
          viewBox="0 0 40 40" 
          className={isLarge ? 'w-9 h-9' : isSmall ? 'w-4 h-4' : 'w-5 h-5'} 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle glow filter */}
          <defs>
            <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#38bdf8" />
            </filter>
          </defs>
          <path 
            d="M5 20H13L16 12L20 28L24 15L27 22H35" 
            stroke="#38bdf8" 
            strokeWidth={isLarge ? "2.75" : "2.2"} 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            filter="url(#cyanGlow)"
          />
        </svg>
      </div>

      {showText && (
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-tight text-white text-[17px]">
            LogPulse
          </span>
          {showBadge && (
            <span className="bg-[#1a2538] text-[#38bdf8] border border-[#2b3b55] text-[10px] font-semibold px-2 py-0.5 rounded tracking-wider uppercase">
              LOG VIEWER
            </span>
          )}
        </div>
      )}
    </div>
  );
};
