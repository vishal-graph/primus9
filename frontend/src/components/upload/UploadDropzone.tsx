'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Typography } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const ACCEPT = '.pdf,.png,.jpg,.jpeg';
const MAX_MB = 10;

interface UploadDropzoneProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onReplace: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  error: string | null;
}

export function UploadDropzone({
  file,
  onFileSelect,
  onReplace,
  onError,
  disabled,
  error,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!file && !disabled) setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!file && !disabled && e.dataTransfer.files?.[0]) {
      const f = e.dataTransfer.files[0];
      const err = validateFile(f);
      if (err) {
        onError?.(err);
        onFileSelect(null);
      } else {
        onError?.('');
        onFileSelect(f);
      }
    }
  };

  const handleClick = () => {
    if (file || disabled) return;
    inputRef.current?.click();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    const err = validateFile(f);
    if (err) {
      onError?.(err);
      onFileSelect(null);
    } else {
      onError?.('');
      onFileSelect(f);
    }
  };

  const active = isDragging || isHovered;

  return (
    <>
      <AnimatePresence mode="wait">
        {!file ? (
          <Box
            component={motion.div}
            key="dropzone"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            sx={{
              height: 140,
              border: `2px dashed ${active ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.35)'}`,
              borderRadius: 2,
              background: active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
              cursor: disabled ? 'not-allowed' : 'pointer',
              boxShadow: active ? '0 0 18px 0px rgba(255, 255, 255, 0.2)' : 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.15 }}
          >
            <CloudUpload sx={{ fontSize: 32, color: 'rgba(255,255,255,0.85)', mb: 1.5 }} />
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.95)', fontWeight: 500, mb: 0.5 }}>
              Drag & drop your file here, or <span style={{ textDecoration: 'underline' }}>Browse</span>
            </Typography>
            <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
              Supported: PDF, JPG, PNG (max {MAX_MB}MB)
            </Typography>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              onChange={handleInputChange}
              style={{ display: 'none' }}
            />
          </Box>
        ) : (
          <Box
            component={motion.div}
            key="file-preview"
            sx={{
              minHeight: 140,
              border: '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.06)',
              p: '28px 20px',
              mb: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '100%' }}>
              <Typography
                sx={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 14,
                  color: '#FFFFFF',
                  opacity: 0.92,
                  textAlign: 'center',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  lineHeight: 1.35,
                  wordBreak: 'break-word',
                  mb: 1,
                }}
              >
                {file.name}
              </Typography>
              {error && (
                <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#F87171', opacity: 0.9, mb: 1 }}>
                  {error}
                </Typography>
              )}
              <Typography sx={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#FFFFFF', opacity: 0.48, mb: 2 }}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </Typography>
              <Box
                component="button"
                onClick={(e) => { e.stopPropagation(); onReplace(); }}
                sx={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: 13,
                  color: '#FFFFFF',
                  opacity: 0.65,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'none',
                  '&:hover': { opacity: 0.95, textDecoration: 'underline' },
                }}
              >
                Replace file
              </Box>
            </Box>
          </Box>
        )}
      </AnimatePresence>
    </>
  );
}

function validateFile(f: File): string | null {
  const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
  if (!validTypes.includes(f.type)) return 'Invalid file type. Use PDF, JPG, or PNG.';
  if (f.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB}MB.`;
  return null;
}
