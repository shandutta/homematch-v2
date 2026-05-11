// Canonical framer-motion mock for Jest (auto-discovered from __mocks__/)
// Provides both `motion` and `m` exports + all hooks/components used across the app.
// Strips framer-motion-specific props so React DOM doesn't warn during tests.

import * as React from 'react'

const createMotionComponent = (element: string) => {
  const MotionComponent = React.forwardRef(
    (props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
      const {
        animate: _animate,
        initial: _initial,
        exit: _exit,
        variants: _variants,
        whileHover: _whileHover,
        whileTap: _whileTap,
        whileInView: _whileInView,
        whileDrag: _whileDrag,
        whileFocus: _whileFocus,
        transition: _transition,
        drag: _drag,
        dragConstraints: _dragConstraints,
        dragElastic: _dragElastic,
        dragTransition: _dragTransition,
        onDragStart: _onDragStart,
        onDrag: _onDrag,
        onDragEnd: _onDragEnd,
        layout: _layout,
        layoutId: _layoutId,
        transformTemplate: _transformTemplate,
        onUpdate: _onUpdate,
        onAnimationComplete: _onAnimationComplete,
        viewport: _viewport,
        ...rest
      } = props
      return React.createElement(element as any, { ref, ...rest })
    }
  )
  MotionComponent.displayName = `Motion(${element})`
  return MotionComponent
}

const motion = {
  div: createMotionComponent('div'),
  span: createMotionComponent('span'),
  section: createMotionComponent('section'),
  article: createMotionComponent('article'),
  button: createMotionComponent('button'),
  h1: createMotionComponent('h1'),
  h2: createMotionComponent('h2'),
  h3: createMotionComponent('h3'),
  h4: createMotionComponent('h4'),
  p: createMotionComponent('p'),
  ul: createMotionComponent('ul'),
  li: createMotionComponent('li'),
  a: createMotionComponent('a'),
  img: createMotionComponent('img'),
  nav: createMotionComponent('nav'),
  header: createMotionComponent('header'),
  footer: createMotionComponent('footer'),
  main: createMotionComponent('main'),
  aside: createMotionComponent('aside'),
}

export { motion, motion as m }
export const AnimatePresence = ({ children }: { children?: React.ReactNode }) =>
  children
export const LazyMotion = ({ children }: { children?: React.ReactNode }) =>
  children
export const MotionConfig = ({ children }: { children?: React.ReactNode }) =>
  children
export const domAnimation = {}
export const domMax = {}
export const useScroll = () => ({ scrollY: { get: () => 0 } })
export const useTransform = () => 0
export const useMotionValue = <T>(initial: T) => ({
  get: () => initial,
  set: () => {},
})
export const useAnimation = () => ({ start: () => {}, stop: () => {} })
export const useInView = () => false
export const useSpring = (value: any) => value
export const useVelocity = () => 0
