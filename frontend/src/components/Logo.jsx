import React from 'react';

/**
 * Product Hunt Scraper — Custom Brand Logo
 * 
 * Features:
 * - Geometric radar-prism emblem with dual scanning arcs
 * - Vibrant violet/indigo & electric cyan gradients
 * - Responsive sizing (sm, md, lg, xl)
 * - Animated scanning pulse on hover
 */
export default function Logo({ size = 'md', showText = true, className = '' }) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
    lg: 'h-11 w-11',
    xl: 'h-14 w-14',
  };

  const textSizes = {
    sm: 'text-sm',
    md: 'text-[15px]',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  return (
    <div className={`group flex items-center gap-3 select-none ${className}`}>
      {/* Emblem */}
      <div
        className={`relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-800 p-0.5 shadow-md shadow-violet-500/20 transition-all duration-300 group-hover:scale-105 group-hover:shadow-lg group-hover:shadow-violet-500/35 ${iconSizes[size]}`}
      >
        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-full p-1.5 transition-transform duration-500 group-hover:rotate-12"
        >
          {/* Subtle background grid pattern */}
          <circle cx="18" cy="18" r="14" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="2 2" />
          
          {/* Radar Scanner Arc */}
          <path
            d="M18 5 A13 13 0 0 1 31 18"
            stroke="url(#cyanGlow)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* Central Stylized 'P' & 'H' scraper polygon */}
          <path
            d="M11 9H20C22.7614 9 25 11.2386 25 14C25 16.7614 22.7614 19 20 19H14V27H11V9Z"
            fill="white"
            fillOpacity="0.95"
          />
          <path
            d="M14 12V16H19.5C20.6046 16 21.5 15.1046 21.5 14C21.5 12.8954 20.6046 12 19.5 12H14Z"
            fill="#5B21B6"
          />

          {/* Crosshair / Targeting Lens */}
          <circle cx="24" cy="24" r="5" stroke="#38BDF8" strokeWidth="2" fill="#1E1B4B" fillOpacity="0.8" />
          <path d="M24 21V27M21 24H27" stroke="#38BDF8" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="24" cy="24" r="1.5" fill="#A7F3D0" />

          {/* Gradients */}
          <defs>
            <linearGradient id="cyanGlow" x1="18" y1="5" x2="31" y2="18" gradientUnits="userSpaceOnUse">
              <stop stopColor="#38BDF8" />
              <stop offset="1" stopColor="#818CF8" />
            </linearGradient>
          </defs>
        </svg>

        {/* Ambient indicator dot */}
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white"></span>
        </span>
      </div>

      {/* Brand Text */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-slate-900 group-hover:text-slate-950 ${textSizes[size]}`}>
              Product Hunt
            </span>
            <span className={`font-extrabold tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent ${textSizes[size]}`}>
              Scraper
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Data Explorer
            </span>
            <span className="inline-flex items-center rounded px-1.5 py-0.2 text-[9px] font-medium bg-violet-50 text-violet-700 border border-violet-100">
              v2.4
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
