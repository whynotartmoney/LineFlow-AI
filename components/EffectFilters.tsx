
import React from 'react';

const EffectFilters: React.FC = () => {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden="true" focusable="false">
      <defs>
        {/* Glow Effect */}
        <filter id="glow-effect" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Metal Effect */}
        <filter id="metal-effect">
          <feSpecularLighting surfaceScale="5" specularConstant=".75" specularExponent="20" lightingColor="#bbbbbb" result="specOut">
            <fePointLight x="-5000" y="-10000" z="20000" />
          </feSpecularLighting>
          <feComposite in="SourceGraphic" in2="specOut" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" />
        </filter>

        {/* Glass Effect */}
        <filter id="glass-effect">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
          <feComponentTransfer in="blur" result="faded">
            <feFuncA type="linear" slope="0.7" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="faded" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Neon Effect (Double Glow) */}
        <filter id="neon-effect" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Sketch Effect (Displacement) */}
        <filter id="sketch-effect">
          <feTurbulence type="fractalNoise" baseFrequency="0.5" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Shadow Effect */}
        <filter id="shadow-effect">
          <feDropShadow dx="8" dy="8" stdDeviation="5" floodOpacity="0.5" />
        </filter>

        {/* Emboss Effect */}
        <filter id="emboss-effect">
          <feConvolveMatrix order="3" kernelMatrix="-1 -1 0 -1 7 1 0 1 1" />
        </filter>
        
        <linearGradient id="metal-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#777', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#eee', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#777', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default EffectFilters;
