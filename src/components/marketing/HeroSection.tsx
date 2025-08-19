'use client'

// Removed useScroll, useTransform - using manual scroll handling for better control
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MotionDiv, MotionH1, MotionP } from '@/components/ui/motion-components'
import { PhoneMockup } from './PhoneMockup'
import { ParallaxStarsCanvas } from './ParallaxStarsCanvas'

export function HeroSection() {
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 1000
  )
  const [scrollOpacity, setScrollOpacity] = useState(1)
  const [scrollY, setScrollY] = useState(0)

  // Update viewport height on mount and resize
  useEffect(() => {
    const updateHeight = () => {
      const height = window.innerHeight
      setViewportHeight(height)
    }
    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [])

  // Handle scroll for responsive fade
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      setScrollY(currentScrollY)

      // Calculate responsive fade ranges based on viewport height
      // For shorter viewports (landscape), fade happens earlier
      // For taller viewports (portrait), fade happens later
      const fadeStartPoint = viewportHeight * 0.4 // Start fade at 40% of viewport height
      const fadeEndPoint = viewportHeight * 0.75 // End fade at 75% of viewport height (even faster fade)

      let newOpacity = 1
      if (currentScrollY > fadeStartPoint) {
        // Calculate fade between start and end points
        const fadeProgress =
          (currentScrollY - fadeStartPoint) / (fadeEndPoint - fadeStartPoint)
        newOpacity = Math.max(0, 1 - fadeProgress)
      }

      setScrollOpacity(newOpacity)
    }

    handleScroll() // Initial call
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [viewportHeight])

  const y = scrollY * 0.1 // Simple parallax effect

  return (
    <section
      className="relative min-h-screen overflow-hidden"
      data-testid="hero"
    >
      {/* Deeper Navy Gradient Background */}
      <div className="bg-gradient-marketing-primary absolute inset-0" />

      {/* Foreground vignette to push stars into background */}
      <MotionDiv
        className="absolute inset-0"
        style={{
          transform: `translateY(${y}px)`,
          background:
            'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      {/* Canvas Parallax Stars: lower prominence under vignette */}
      <ParallaxStarsCanvas className="absolute inset-0 z-[1]" />

      {/* Content Container */}
      <div className="relative z-10 flex min-h-screen items-center">
        <div className="container mx-auto px-8 py-16 sm:px-4 sm:py-14 md:py-16">
          <MotionDiv
            className="grid gap-16 sm:gap-12 lg:grid-cols-2 lg:items-center"
            style={{ opacity: scrollOpacity }}
          >
            {/* Text Content */}
            <div className="sm:pl-4" style={{ maxWidth: '42rem' }}>
              <MotionH1
                className="text-4xl leading-tight font-black text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
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
                className="mt-5 text-base leading-relaxed text-white/80 sm:mt-4 sm:text-lg md:text-xl"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              >
                House hunting just became your favorite couples activity. Find
                your perfect home together with AI that learns what you both
                love.
              </MotionP>

              <MotionDiv
                className="mt-8 flex max-w-full flex-col gap-4 sm:mt-6 sm:flex-row sm:gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              >
                {/* Primary CTA - Premium Magnetic Effect */}
                <Button
                  variant="prime"
                  size="lg"
                  asChild
                  className="group relative w-full overflow-visible px-4 py-3 sm:w-auto sm:px-8 sm:py-4"
                >
                  <Link
                    href="/signup"
                    aria-label="Start Swiping"
                    data-cta="dopamine-hero"
                    className="relative inline-flex w-full items-center justify-center sm:w-auto"
                  >
                    {/* Animated gradient background on hover */}
                    <span
                      className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-sky-500 opacity-0 blur-md transition-all duration-500 group-hover:opacity-100 group-hover:blur-xl"
                      aria-hidden="true"
                    />

                    {/* Button text with enhanced glow */}
                    <span className="relative z-10 transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(147,197,253,0.8)]">
                      Get started
                    </span>

                    {/* Pulse ring animation on hover */}
                    <span
                      className="absolute inset-0 rounded-full ring-2 ring-white/0 transition-all duration-500 group-hover:ring-white/20 group-hover:ring-offset-4 group-hover:ring-offset-transparent"
                      aria-hidden="true"
                    />

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
                  className="group relative w-full border-2 border-white/20 bg-white/5 px-4 py-3 text-sm font-medium text-white backdrop-blur-md transition-all duration-300 hover:border-white/40 hover:bg-white/10 hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] hover:shadow-white/10 sm:w-auto sm:px-8 sm:py-4 sm:text-base"
                  asChild
                >
                  <Link href="/login" className="relative w-full sm:w-auto">
                    <span className="relative z-10 transition-all duration-300 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
                      Log in
                    </span>
                    {/* Subtle glow effect on hover */}
                    <span
                      className="absolute inset-0 rounded-lg bg-white/10 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
                      aria-hidden="true"
                    />
                  </Link>
                </Button>
              </MotionDiv>
            </div>

            {/* Phone Mockup - Hidden on mobile */}
            <MotionDiv
              className="hidden md:block"
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
