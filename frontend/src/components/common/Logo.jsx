import React, { useState } from 'react';

const GRADIENTS = [
  'from-orange-500 to-rose-500',
  'from-violet-600 to-indigo-600',
  'from-emerald-500 to-teal-600',
  'from-blue-500 to-cyan-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-purple-500 to-indigo-500',
  'from-teal-500 to-emerald-600',
];

function getGradient(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % GRADIENTS.length;
  return GRADIENTS[idx];
}

export function Logo({
  name = '',
  uuid = '',
  size = 44,
  rounded = 'rounded-2xl',
  className = '',
}) {
  const [hasError, setHasError] = useState(false);

  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'PH';

  const imgUrl =
    uuid && !hasError
      ? uuid.startsWith('http')
        ? uuid
        : `https://ph-files.imgix.net/${uuid}?auto=format&fit=crop&w=${size * 2}&h=${size * 2}`
      : null;

  if (imgUrl) {
    return (
      <img
        src={imgUrl}
        alt={name}
        onError={() => setHasError(true)}
        className={`${rounded} object-cover shrink-0 shadow-sm transition-transform duration-200 group-hover:scale-105 ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }

  const gradient = getGradient(name);

  return (
    <div
      className={`${rounded} bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold tracking-tight shadow-sm shrink-0 select-none transition-transform duration-200 group-hover:scale-105 ${className}`}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(11, Math.round(size * 0.36)),
      }}
    >
      {initials}
    </div>
  );
}

export default Logo;
