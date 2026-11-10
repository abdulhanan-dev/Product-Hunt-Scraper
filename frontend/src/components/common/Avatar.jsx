import React, { useState } from 'react';

const AVATAR_GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-rose-500 to-orange-500',
  'from-emerald-500 to-cyan-600',
  'from-sky-500 to-blue-600',
  'from-amber-500 to-pink-500',
  'from-fuchsia-500 to-pink-600',
];

function getAvatarGrad(str = '') {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function Avatar({
  src = '',
  name = '',
  size = 36,
  rounded = 'rounded-full',
  className = '',
  isVerified = false,
}) {
  const [err, setErr] = useState(false);

  const initials = (name || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';

  return (
    <div className={`relative shrink-0 select-none ${className}`} style={{ width: size, height: size }}>
      {src && !err ? (
        <img
          src={src}
          alt={name}
          onError={() => setErr(true)}
          className={`${rounded} w-full h-full object-cover shadow-sm`}
          loading="lazy"
        />
      ) : (
        <div
          className={`${rounded} w-full h-full bg-gradient-to-tr ${getAvatarGrad(
            name
          )} flex items-center justify-center text-white font-semibold shadow-sm`}
          style={{ fontSize: Math.max(10, Math.round(size * 0.38)) }}
        >
          {initials}
        </div>
      )}

      {isVerified && (
        <span
          className="absolute -bottom-0.5 -right-0.5 bg-indigo-600 text-white rounded-full flex items-center justify-center ring-2 ring-white dark:ring-zinc-900"
          style={{ width: Math.max(12, Math.round(size * 0.35)), height: Math.max(12, Math.round(size * 0.35)), fontSize: '8px' }}
          title="Verified Maker"
        >
          ✓
        </span>
      )}
    </div>
  );
}

export default Avatar;
