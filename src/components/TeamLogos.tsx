import React from 'react';

interface LogoImgProps {
  className?: string;
  alt?: string;
}

/**
 * 100% Real Broadcast Assets extracted directly from the Worlds 2026 1080p feed
 */
export const WorldsCrestLogo: React.FC<LogoImgProps> = ({
  className = 'w-12 h-12',
  alt = 'Worlds 2026 Official Crest',
}) => (
  <img
    src="assets/logos/worlds_crest.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const GenGRealLogo: React.FC<LogoImgProps> = ({
  className = 'w-32 h-28',
  alt = 'GEN.G Official Broadcast Logo',
}) => (
  <img
    src="assets/logos/gen_logo.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const BlgRealLogo: React.FC<LogoImgProps> = ({
  className = 'w-36 h-24',
  alt = 'BLG Bilibili Gaming Official Broadcast Logo',
}) => (
  <img
    src="assets/logos/blg_logo.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const Worlds26BottomLogo: React.FC<LogoImgProps> = ({
  className = 'h-12 w-auto',
  alt = 'Worlds 26 Official Lockup',
}) => (
  <img
    src="assets/logos/worlds_26_bottom.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const Lck1GenLockup: React.FC<LogoImgProps> = ({
  className = 'h-16 w-auto',
  alt = 'LCK #1 GEN',
}) => (
  <img
    src="assets/logos/lck1_gen.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const Lpl2BlgLockup: React.FC<LogoImgProps> = ({
  className = 'h-16 w-auto',
  alt = 'LPL #2 BLG',
}) => (
  <img
    src="assets/logos/lpl2_blg.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);

export const Bo5BadgeImg: React.FC<LogoImgProps> = ({
  className = 'h-6 w-auto',
  alt = 'BO5',
}) => (
  <img
    src="assets/logos/bo5.png"
    alt={alt}
    className={`object-contain select-none pointer-events-none ${className}`}
  />
);
