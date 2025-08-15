'use client'

import { useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-components'
import { PhoneMockup } from './PhoneMockup'
import { ParallaxStarsCanvas } from './ParallaxStarsCanvas'

export function HeroSection() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      data-testid="hero"
    >
      {/* Deeper Navy Gradient Background */}
      <div
        className="absolute inset-0 bg-gradient-marketing-primary"
      />

      {/* Foreground vignette to push stars into background */}
      <MotionDiv
        className="absolute inset-0"
        style={{
          y,
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Canvas Parallax Stars: lower prominence under vignette */}
      <ParallaxStarsCanvas className="absolute inset-0 z-[1]" />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-4 py-10 sm:py-14 md:py-16">
          <MotionDiv
            className="grid gap-12 lg:grid-cols-2 lg:items-center"
            style={{ opacity }}
          >
            {/* Text Content */}
            <div className="pl-4 sm:pl-4" style={{ maxWidth: '42rem' }}>
              <MotionH1
                className="text-4xl font-black leading-tight text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                Swipe.
                <br />
                Match.
                <br />
                Move In.
              </MotionH1>

              <MotionP
                className="mt-3 text-base leading-relaxed text-white/80 sm:mt-4 sm:text-lg md:text-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              >
                House hunting just became your favorite couples activity. Find
                your perfect home together with AI that learns what you both
                love.
              </MotionP>

              <MotionDiv
                className="mt-6 flex flex-col gap-3 sm:mt-6 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              >
                {/* Primary CTA - Premium Magnetic Effect */}
                <Button variant="prime" size="lg" asChild className="group relative px-8 py-4 overflow-visible">
                  <Link
                    href="/signup"
                    aria-label="Start Swiping"
                    data-cta="dopamine-hero"
                    className="relative inline-flex items-center justify-center"
                  >
                    {/* Animated gradient background on hover */}
                    <span className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 opacity-0 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:blur-xl" aria-hidden="true" />
                    
                    {/* Button text with enhanced glow */}
                    <span className="relative z-10 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(147,197,253,0.8)]">
                      Get started
                    </span>
                    
                    {/* Pulse ring animation on hover */}
                    <span className="absolute inset-0 rounded-full ring-2 ring-white/0 transition-all duration-500 group-hover:ring-white/20 group-hover:ring-offset-4 group-hover:ring-offset-transparent" aria-hidden="true" />
                    
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0"
                      id="particles-host"
                    />
                    {/* Enhanced click-burst with color */}
                    <script
                      dangerouslySetInnerHTML={{
                        __html: `
(function(){
  var root = document.querySelector('[data-cta="dopamine-hero"]');
  if(!root) return;
  var host = root.querySelector('#particles-host');
  var isHovering = false;
  
  // Hover glow effect
  root.addEventListener('mouseenter', function() {
    isHovering = true;
    root.style.transform = 'translateY(-2px)';
    root.style.boxShadow = '0 10px 40px rgba(59,130,246,0.5)';
  });
  
  root.addEventListener('mouseleave', function() {
    isHovering = false;
    root.style.transform = 'translateY(0)';
    root.style.boxShadow = '';
  });
  
  function burst(){
    if(!host) return;
    var colors = ['#60A5FA', '#93C5FD', '#DBEAFE', '#3B82F6', '#FFFFFF'];
    var count = 16;
    for(var i=0;i<count;i++){
      var el = document.createElement('span');
      var angle = (Math.PI * 2) * (i / count);
      var radius = 25 + Math.random() * 20;
      var dx = Math.cos(angle) * radius;
      var dy = Math.sin(angle) * radius;
      el.style.position = 'absolute';
      el.style.left = '50%';
      el.style.top = '50%';
      el.style.width = Math.random() * 6 + 3 + 'px';
      el.style.height = el.style.width;
      el.style.borderRadius = '9999px';
      el.style.pointerEvents = 'none';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.opacity = '0.9';
      el.style.boxShadow = '0 0 12px currentColor';
      el.style.transform = 'translate(-50%, -50%) scale(0)';
      el.style.transition = 'all 420ms cubic-bezier(0.2,0.6,0.2,1)';
      host.appendChild(el);
      requestAnimationFrame(function(){
        el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px)) scale(1)';
        el.style.opacity = '0';
      });
      setTimeout((function(node){ return function(){ node && node.remove(); };})(el), 450);
    }
  }
  root.addEventListener('mousedown', burst);
  root.addEventListener('touchstart', burst, {passive:true});
})();
                        `,
                      }}
                    />
                  </Link>
                </Button>

                {/* Secondary CTA - Enhanced Glass Effect */}
                <Button
                  size="lg"
                  variant="outline"
                  className="group relative border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-white/10"
                  asChild
                >
                  <Link href="/login" className="relative">
                    <span className="relative z-10 transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      Log in
                    </span>
                    {/* Subtle glow effect on hover */}
                    <span className="absolute inset-0 rounded-lg opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-xl bg-white/10" aria-hidden="true" />
                  </Link>
                </Button>
              </MotionDiv>
            </div>

            {/* Phone Mockup */}
            <MotionDiv
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            >
              <PhoneMockup />
            </MotionDiv>
          </MotionDiv>
        </div>
      </div>
    </section>
  )
}
