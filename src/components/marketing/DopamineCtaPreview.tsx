'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function DopamineCtaPreview({ className }: Props) {
  return (
    <div className={cn('mt-4', className)} data-testid="dopamine-cta-preview">
      <Link
        href="/signup"
        aria-label="Start"
        className={cn(
          // Layout
          'relative inline-flex items-center justify-center rounded-full px-8 py-3',
          // Typography
          'text-white text-base font-medium tracking-[0.02em]',
          // Depth + background
          'bg-[linear-gradient(180deg,#1b1f2a_0%,#0f131b_100%)] ring-1 ring-white/10',
          'shadow-[0_2px_8px_rgba(0,0,0,0.35)]',
          // Interaction
          'select-none transition-all duration-150 ease-out',
          'hover:scale-[1.02] hover:shadow-[0_4px_16px_rgba(0,0,0,0.45)]',
          'active:scale-[0.99] active:translate-y-[1px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f131b]',
          // Needed for sheen/glow layers
          'overflow-hidden group'
        )}
        data-cta="dopamine"
      >
        {/* Tasteful gradient border ring only (no interior lines/patterns) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[2px] rounded-full"
          style={{
            padding: '2px',
            background:
              // Smooth multi-color gradient without visible banding/lines
              'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(16,185,129,0.45), rgba(236,72,153,0.45))',
            WebkitMask:
              'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            // Gentle shimmer via background-position, not conic bands
            backgroundSize: '200% 200%',
            animation: 'borderSheen 3200ms ease-in-out infinite',
            opacity: 0.85,
          }}
        />

        {/* Pulse halo on hover (outer ring softly expands/fades) - single layer */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 ease-out group-hover:opacity-100"
          style={{
            animation: 'haloPulse 1600ms ease-out infinite',
            boxShadow: '0 0 0 0 rgba(99,102,241,0.0)',
          }}
        />

        {/* Ensure absolutely clean interior: no sheen, no inner moving lines */}

        {/* Particle burst container removed for now */}

        {/* Text */}
        <span className="relative z-10">Start Swiping</span>
      </Link>

      <style>{`
        /* Smooth sheen for the border only (no interior artifacts) */
        @keyframes borderSheen {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes haloPulse {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 0 20px 8px rgba(99,102,241,0.10); }
          50%  { box-shadow: 0 0 0 6px rgba(99,102,241,0.10), 0 0 28px 12px rgba(99,102,241,0.16); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.0), 0 0 20px 8px rgba(99,102,241,0.10); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="dopamine-cta-preview"] * {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>

      {/* Micro-particles on press (reintroduced, improved visibility) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function(){
              const root = document.querySelector('[data-cta="dopamine"]');
              if(!root) return;

              function burst(){
                const rect = root.getBoundingClientRect();
                const host = document.createElement('span');
                host.style.position = 'absolute';
                host.style.inset = '0';
                host.style.pointerEvents = 'none';
                root.appendChild(host);

                const count = 12;
                for(let i=0;i<count;i++){
                  const el = document.createElement('span');
                  const angle = (Math.PI * 2) * (i / count);
                  const radius = 18 + Math.random() * 12;
                  const dx = Math.cos(angle) * radius;
                  const dy = Math.sin(angle) * radius;

                  el.style.position = 'absolute';
                  el.style.left = '50%';
                  el.style.top = '50%';
                  el.style.width = '4px';
                  el.style.height = '4px';
                  el.style.borderRadius = '9999px';
                  el.style.pointerEvents = 'none';
                  el.style.background = 'white';
                  el.style.opacity = '0.85';
                  el.style.boxShadow = '0 0 8px rgba(255,255,255,0.65)';
                  el.style.transform = 'translate(-50%, -50%)';
                  el.style.transition = 'transform 320ms cubic-bezier(0.2,0.6,0.2,1), opacity 320ms ease-out';
                  host.appendChild(el);

                  requestAnimationFrame(() => {
                    el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
                    el.style.opacity = '0';
                  });
                }
                setTimeout(() => host.remove(), 360);
              }

              root.addEventListener('mousedown', burst);
              root.addEventListener('touchstart', burst, {passive:true});
            })();
          `,
        }}
      />
    </div>
  )
}
