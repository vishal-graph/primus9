/**
 * TatvaOps Vision - Landing Page
 * 
 * Public landing page with:
 * - Hero section
 * - Key features
 * - CTA to sign up
 * 
 * Design: Minimal, Apple-like marketing page
 */

'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { getAuthUser } from '@/lib/auth-client';
import { motion } from 'framer-motion';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  alpha,
} from '@mui/material';
import {
  AutoAwesome,
  Speed,
  Layers,
  ArrowForward,
} from '@mui/icons-material';
import { pageFadeVariants, staggerContainerVariants, staggerItemVariants } from '@/motion/pageTransitions';
import { FrostedNavBar } from '@/ui/layout';

const FEATURES = [
  {
    icon: <AutoAwesome sx={{ fontSize: 36 }} />,
    title: 'AI-Powered Generation',
    description: 'Generate high-quality moodboards, elevations, and 3D views instantly using Google Gemini.',
  },
  {
    icon: <Speed sx={{ fontSize: 36 }} />,
    title: 'Non-Linear Workflow',
    description: 'Start from any stage—floor plan, moodboard, or interior images. Your workflow, your way.',
  },
  {
    icon: <Layers sx={{ fontSize: 36 }} />,
    title: 'Version Control',
    description: 'Every generation is versioned. Compare, regenerate, and refine with complete history.',
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);

  // Redirect if already signed in — app initial page is /entry
  useEffect(() => {
    getAuthUser().then((user) => {
      setIsSignedIn(!!user);
      setReady(true);
    });
  }, []);

  if (!ready || isSignedIn) {
    return null;
  }

  return (
    <Box
      component={motion.div}
      variants={pageFadeVariants}
      initial="hidden"
      animate="visible"
      sx={{
        minHeight: '100vh',
        backgroundColor: 'background.default',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <FrostedNavBar
        logoHref="/"
        rightContent={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button onClick={() => router.push('/sign-in')} sx={{ textTransform: 'none', fontWeight: 600 }}>Sign In</Button>
            <Button variant="contained" onClick={() => router.push('/sign-up')} sx={{ textTransform: 'none', fontWeight: 600 }}>Get Started</Button>
          </Box>
        }
      />

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', py: { xs: 6, md: 8 } }}>
      <Container 
        maxWidth="lg" 
        sx={{ 
          px: { xs: 2, sm: 3 },
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Hero Section - Centered */}
        <Box 
          sx={{ 
            textAlign: 'center', 
            mb: { xs: 5, md: 6 }, 
            maxWidth: 700,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          {/* Logo - Centered */}
          <Box 
            sx={{ 
              mb: 3,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <Image
              src="/logo.png"
              alt="TatvaOps"
              width={260}
              height={68}
              priority
              style={{ objectFit: 'contain' }}
            />
          </Box>
          
          <Typography
            variant="h5"
            sx={{
              color: 'text.secondary',
              fontWeight: 400,
              mb: 4,
              fontSize: { xs: '1rem', md: '1.125rem' },
              lineHeight: 1.6,
              maxWidth: 550,
            }}
          >
            Transform your spaces with AI-powered interior design.
            From floor plans to 3D visualizations.
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              endIcon={<ArrowForward />}
              onClick={() => router.push('/sign-up')}
              sx={{
                py: 1.5,
                px: 3.5,
                fontSize: '1rem',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Get Started
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => router.push('/sign-in')}
              sx={{
                py: 1.5,
                px: 3.5,
                fontSize: '1rem',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Sign In
            </Button>
          </Box>
        </Box>

        {/* Features - Centered Grid */}
        <Box sx={{ width: '100%', maxWidth: 960, mx: 'auto' }}>
          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            component={motion.div}
            variants={staggerContainerVariants}
            initial="hidden"
            animate="visible"
            justifyContent="center"
          >
            {FEATURES.map((feature, index) => (
              <Grid
                item
                xs={12}
                sm={6}
                md={4}
                key={index}
                component={motion.div}
                variants={staggerItemVariants}
              >
                <Card
                  elevation={0}
                  sx={{
                    height: '100%',
                    minHeight: 200,
                    border: 1,
                    borderColor: 'divider',
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      boxShadow: `0 8px 24px ${alpha('#37474F', 0.08)}`,
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent 
                    sx={{ 
                      p: 3, 
                      textAlign: 'center', 
                      height: '100%', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        p: 1.5,
                        borderRadius: 2,
                        backgroundColor: alpha('#5C6BC0', 0.1),
                        color: 'primary.main',
                        mb: 2,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    
                    <Typography variant="h6" fontWeight={600} sx={{ mb: 1, fontSize: '1rem' }}>
                      {feature.title}
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
                      {feature.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
      </Box>
    </Box>
  );
}
