/**
 * TatvaOps Vision - Page Transitions
 * 
 * Framer Motion variants for page and component animations
 * 
 * Rules:
 * - Subtle, never distracting
 * - Fast (200-300ms)
 * - Support cognition, not decoration
 * - NO bouncy effects, NO parallax
 */

export const pageTransition = {
  type: 'tween',
  ease: 'easeInOut',
  duration: 0.25,
};

// Page fade in/out
export const pageFadeVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: pageTransition,
  },
  exit: {
    opacity: 0,
    transition: { ...pageTransition, duration: 0.2 },
  },
};

// Slide from right (for modal/drawer)
export const slideFromRightVariants = {
  hidden: {
    x: 50,
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: pageTransition,
  },
  exit: {
    x: 50,
    opacity: 0,
    transition: { ...pageTransition, duration: 0.2 },
  },
};

// Slide from bottom (for sheets)
export const slideFromBottomVariants = {
  hidden: {
    y: 20,
    opacity: 0,
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: pageTransition,
  },
  exit: {
    y: 20,
    opacity: 0,
    transition: { ...pageTransition, duration: 0.2 },
  },
};

// Stagger children (for lists)
export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const staggerItemVariants = {
  hidden: { y: 10, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: pageTransition,
  },
};

// Scale in (for modals)
export const scaleVariants = {
  hidden: {
    scale: 0.95,
    opacity: 0,
  },
  visible: {
    scale: 1,
    opacity: 1,
    transition: pageTransition,
  },
  exit: {
    scale: 0.95,
    opacity: 0,
    transition: { ...pageTransition, duration: 0.2 },
  },
};

// Image fade in
export const imageFadeVariants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

// Loading shimmer
export const shimmerVariants = {
  initial: {
    backgroundPosition: '-1000px 0',
  },
  animate: {
    backgroundPosition: '1000px 0',
    transition: {
      duration: 2,
      ease: 'linear',
      repeat: Infinity,
    },
  },
};

