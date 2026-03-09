'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Box } from '@mui/material';

interface UploadProgressRingProps {
  progress: number;
  size: number;
  strokeWidth: number;
  hasError: boolean;
  showCheckmark: boolean;
}

export function UploadProgressRing({
  progress,
  size,
  strokeWidth,
  hasError,
  showCheckmark,
}: UploadProgressRingProps) {
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <Box
      component={motion.svg}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      sx={{
        position: 'absolute',
        transform: 'rotate(-90deg)',
        left: '50%',
        top: '50%',
        ml: `-${size / 2}px`,
        mt: `-${size / 2}px`,
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: showCheckmark ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={hasError ? '#F87171' : 'rgba(255, 255, 255, 0.70)'}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{
          strokeDashoffset: offset,
          stroke: hasError ? '#F87171' : 'rgba(255, 255, 255, 0.70)',
        }}
        transition={{
          strokeDashoffset: { duration: 0.3, ease: 'easeInOut' },
          stroke: { duration: 0.2 },
        }}
        style={{ strokeDasharray: circumference }}
      />
      <AnimatePresence>
        {showCheckmark && (
          <motion.g
            style={{
              transform: 'rotate(90deg)',
              transformOrigin: 'center',
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.path
              d={`M ${size * 0.3} ${size * 0.5} L ${size * 0.45} ${size * 0.65} L ${size * 0.7} ${size * 0.35}`}
              stroke="#F4F0E6"
              strokeWidth={strokeWidth * 1.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </motion.g>
        )}
      </AnimatePresence>
    </Box>
  );
}
