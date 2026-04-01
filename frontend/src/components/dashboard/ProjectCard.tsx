'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Typography, IconButton, alpha, Checkbox } from '@mui/material';
import { GridView, MoreVert, Star, StarBorder } from '@mui/icons-material';
import type { Project } from '@/lib/actions/projects';

// Frosted glass + accent for card styling
const CARD_GLASS_BG = 'rgba(28, 28, 32, 0.72)';
const CARD_BORDER = 'rgba(255, 255, 255, 0.08)';
const CARD_TEXT_MAIN = '#FAFAFA';
const CARD_TEXT_SEC = '#A1A1AA';
const CARD_PRIMARY = '#8B5CF6';
const CARD_PRIMARY_HOVER = '#7C3AED';

interface ProjectCardProps {
  project: Project;
  onFavoriteToggle: (e: React.MouseEvent) => void;
  onMenuOpen: (e: React.MouseEvent<HTMLElement>) => void;
  onClick: () => void;
  formatDate: (dateStr: string) => string;
  isSelected?: boolean;
  onSelectToggle?: (e: React.MouseEvent) => void;
}

export function ProjectCard({
  project,
  onFavoriteToggle,
  onMenuOpen,
  onClick,
  formatDate,
  isSelected = false,
  onSelectToggle,
}: ProjectCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Box
      component={motion.div}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      sx={{
        position: 'relative',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        overflow: 'hidden',
        backgroundColor: CARD_GLASS_BG,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid',
        borderColor: hovered ? alpha(CARD_PRIMARY, 0.5) : CARD_BORDER,
        boxShadow: hovered
          ? `0 20px 40px rgba(0,0,0,0.4), 0 0 20px ${alpha(CARD_PRIMARY, 0.08)}`
          : '0 4px 12px rgba(14, 13, 13, 0.2)',
        transition: 'all 0.2s ease',
      }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {/* Hover shimmer */}
      <Box
        component={motion.div}
        initial={{ x: '-100%', opacity: 0 }}
        animate={
          hovered
            ? { x: '280%', opacity: [0, 0.7, 0.7, 0] }
            : { x: '-100%', opacity: 0 }
        }
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.18) 50%, rgba(255, 255, 255, 0) 100%)',
          transform: 'rotate(15deg)',
          mixBlendMode: 'overlay',
          filter: 'blur(20px)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />

      {/* Top-left checkbox */}
      {(hovered || isSelected) && onSelectToggle && (
        <Box
          sx={{
            position: 'absolute',
            top: 20,
            left: 20,
            zIndex: 3,
            bgcolor: alpha('#000', 0.4),
            borderRadius: 1,
            backdropFilter: 'blur(4px)',
          }}
        >
          <Checkbox
            size="small"
            checked={isSelected}
            onClick={(e) => {
              e.stopPropagation();
              onSelectToggle(e);
            }}
            sx={{
              color: CARD_TEXT_SEC,
              '&.Mui-checked': { color: CARD_PRIMARY },
              p: 0.5,
            }}
          />
        </Box>
      )}

      {/* Top-right actions */}
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          right: 20,
          display: 'flex',
          gap: 1,
          zIndex: 2,
        }}
      >
        <IconButton
          size="small"
          onClick={onFavoriteToggle}
          sx={{
            bgcolor: project.isFavorite ? alpha(CARD_PRIMARY, 0.25) : alpha(CARD_TEXT_MAIN, 0.08),
            color: project.isFavorite ? '#eab308' : CARD_TEXT_SEC,
            border: '1px solid',
            borderColor: CARD_BORDER,
            '&:hover': { bgcolor: alpha(CARD_PRIMARY, 0.2) },
          }}
        >
          {project.isFavorite ? <Star fontSize="small" /> : <StarBorder fontSize="small" />}
        </IconButton>
        <IconButton
          size="small"
          onClick={onMenuOpen}
          sx={{
            bgcolor: alpha(CARD_TEXT_MAIN, 0.08),
            color: CARD_TEXT_SEC,
            border: '1px solid',
            borderColor: CARD_BORDER,
            '&:hover': { bgcolor: alpha(CARD_TEXT_MAIN, 0.12) },
          }}
        >
          <MoreVert fontSize="small" />
        </IconButton>
      </Box>

      {/* Thumbnail */}
      <Box
        sx={{
          width: '100%',
          height: 180,
          bgcolor: alpha(CARD_BORDER, 0.8),
          borderRadius: 1.5,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {project.floorPlanUrl ? (
          <Box
            component="img"
            src={project.floorPlanUrl}
            alt={project.name}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <GridView sx={{ fontSize: 48, color: CARD_TEXT_SEC }} />
        )}
      </Box>

      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 16,
          fontWeight: 600,
          color: CARD_TEXT_MAIN,
          mb: 1.5,
          letterSpacing: '-0.3px',
          '&:hover': { color: CARD_PRIMARY },
        }}
      >
        {project.name}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            bgcolor: alpha(CARD_TEXT_MAIN, 0.08),
            border: '1px solid',
            borderColor: CARD_BORDER,
            borderRadius: 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 500,
            color: CARD_TEXT_SEC,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          FLOOR PLAN
        </Box>
        <Box
          sx={{
            px: 1.25,
            py: 0.5,
            bgcolor: alpha(CARD_TEXT_MAIN, 0.08),
            border: '1px solid',
            borderColor: CARD_BORDER,
            borderRadius: 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: 11,
            fontWeight: 500,
            color: CARD_TEXT_SEC,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
          }}
        >
          {project.roomCount} rooms
        </Box>
      </Box>

      <Typography
        sx={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 12,
          color: CARD_TEXT_SEC,
        }}
      >
        Updated {formatDate(project.updatedAt)}
      </Typography>
    </Box>
  );
}
