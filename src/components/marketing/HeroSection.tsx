'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { PhoneMockup } from './PhoneMockup'
import { ParallaxStars } from './ParallaxStars'
import { DopamineCtaPreview } from './DopamineCtaPreview'
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
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(135deg, #020b1f 0%, #03123b 48%, #041a52 100%)',
        }}
      />

      {/* Foreground vignette to push stars into background */}
      <motion.div
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
        <div className="container mx-auto px-4 py-20">
          <motion.div
            className="grid gap-12 lg:grid-cols-2 lg:items-center"
            style={{ opacity }}
          >
            {/* Text Content */}
            <div className="max-w-2xl">
              <motion.h1
                className="text-4xl leading-tight font-black text-white sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl"
                style={{ fontFamily: 'var(--font-heading)' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                Swipe.
                <br />
                Match.
                <br />
                Move In.
              </motion.h1>

              <motion.p
                className="mt-4 text-lg leading-relaxed text-white/80 sm:mt-6 sm:text-xl md:text-2xl"
                style={{ fontFamily: 'var(--font-body)' }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
              >
                House hunting just became your favorite couples activity. Find
                your perfect home together with AI that learns what you both
                love.
              </motion.p>

              <motion.div
                className="mt-10 flex flex-col gap-4 sm:flex-row"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
              >
                {/* Replace production CTA with reusable prime variant; enable click-burst only here */}
                <Button variant="prime" size="xl" asChild>
                  <Link href="/signup" aria-label="Start Swiping" data-cta="dopamine-hero" className="relative inline-flex items-center justify-center">
                    <span className="relative z-10 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]">Start Swiping</span>
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0" id="particles-host" />
                    <script dangerouslySetInnerHTML={{
                      __html: `
                        (function(){
                          var root = document.querySelector('[data-cta="dopamine-hero"]');
                          if(!root) return;
                          var host = root.querySelector('#particles-host');
                          function burst(){
                            if(!host) return;
                            var count = 12;
                            for(var i=0;i<count;i++){
                              var el = document.createElement('span');
                              var angle = (Math.PI * 2) * (i / count);
                              var radius = 18 + Math.random() * 12;
                              var dx = Math.cos(angle) * radius;
                              var dy = Math.sin(angle) * radius;
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
                              requestAnimationFrame(function(){
                                el.style.transform = 'translate(calc(-50% + ' + dx + 'px), calc(-50% + ' + dy + 'px))';
                                el.style.opacity = '0';
                              });
                              setTimeout((function(node){ return function(){ node && node.remove(); };})(el), 360);
                            }
                          }
                          root.addEventListener('mousedown', burst);
                          root.addEventListener('touchstart', burst, {passive:true});
                        })();
                      `
                    }} />
                  </Link>
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-white/20 bg-white/5 px-8 py-6 text-lg font-medium text-white backdrop-blur transition-all duration-300 hover:border-white/40 hover:bg-white/10"
                  asChild
                >
                  <Link href="/login">Already a Member?</Link>
                </Button>
              </motion.div>

              {/* Remove preview from hero now that production CTA uses the new style */}
            </div>

            {/* Phone Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2, ease: 'easeOut' }}
            >
              <PhoneMockup />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
