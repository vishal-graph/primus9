'use client';
import { getAccessToken, getAuthUser, type AuthUser } from '@/lib/auth-client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { useAppDispatch } from '@/store';
import { showSnackbar } from '@/store/uiSlice';

interface PlanFeatures {
  moodboard_generation: boolean;
  room_2d_views: boolean;
  floor_3d_elevation: boolean;
  per_room_3d_elevation: boolean;
  room_walkthroughs: boolean;
  component_extractor: boolean;
  dpr: boolean;
  guided_assistance: boolean;
}

interface Plan {
  code: string;
  name: string;
  priceInr: number;
  maxProjects: number;
  maxRoomsPerProject: number;
  regenerationLimit: number;
  features: PlanFeatures;
  walkthroughQuality?: string;
  componentExtractor?: string;
  dpr?: string;
  guidedAssistance: boolean;
  sortOrder: number;
}

const CARD_GRADIENTS = [
  'linear-gradient(180deg, rgba(59, 130, 246, 0.1) 0%, rgba(30, 58, 138, 0.05) 100%)',
  'linear-gradient(180deg, rgba(236, 72, 153, 0.1) 0%, rgba(131, 24, 67, 0.05) 100%)',
  'linear-gradient(180deg, rgba(168, 85, 247, 0.15) 0%, rgba(88, 28, 135, 0.05) 100%)',
  'linear-gradient(180deg, rgba(16, 185, 129, 0.1) 0%, rgba(6, 78, 59, 0.05) 100%)',
];

const CARD_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCcExPIDjo6zrENBS1dz2mUmCdvi_vnISznQeJXhHbHNE9xZ2JhpYmFHHAOWXNN0mPzbFywlYa-DmNEMr0SbiMJgBXlgfg5m8nuS5IfEpZp-VOvtlv06c_YqLeXqKEnjXaZOyTdcK0WX3qP8QVrlFLZgmQZWrTgsaqoE70L_CBJkNZTN1umVeXLCNca1r-HqjFI9t-zGVYc8ujdB2tx5WRMG9FgT0Dsnh7IlK7NySZi37u1SAbkdd7q3HWv4mFvPvMBrXdkCpM79hM',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBvU4i0fundmqNOCheTdxGY9G3XA03-2JQZwLnVJrlPvuahj9eA6CxTj2ZrPGznCBdMnMROQET8u7ucY5995afC0a1Sw10YRMHo8kFSUOPOl8UpJmOqZBqaWWH8nzdMH2F7N6nzkDhDOxndubcUCJcolxtNFw8LFg8IH37YjtALAU_Yn-flcxZzFhUQk2AaJmU05-R4dP-GckQyfq75DuqRB7N8Ob9W_jm18exYIhpgd0zzRvsm6WaLzOH8g99HynQ1QxtpgIhJMxY',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAxUi34YOUvZD0daGCvpyyRCdzvTrw7RR24kWTioVrdFyQUd6K01l5bv8ntC_I3dYt4rEkTbftSrMmjgFSLcP-P4523oHbXNTtpoeYc9gE3M0LH6UvPemDNSEF_2IOmDFX4TuCE1A_5sfUgnGq7mvCuJn_sHGD6GbJPq7iiJhOiHkqAd8Mizxyy53_pjJCMAh_pgtDqBy0U4Rnjt0IGATprW0tdZtK5Eg3TmDR_21PumKzEfkXLIhyBmCktALTpPv0W2doh69UzLZg',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCphkl9AWzE8EaKV1AFe5gnJ-_Cb3zGK529CBeEGn9Td5D-33jaXCf23OrbDHnj1kl8ocD4EunztOQHqDtgj9EUKHmzXaEmbOQsbZpjn8mfbB_eWOv8UGOHZG892Bjc6zqgSbu02YJjMgdXczFOCPmN9FSH_P1sWPjvqvX8gfSz_ehDplX1PZiy2nfVDbEAj_ZKF1rJcazb1LUozzGWVyZtVLvnW2GE5crJaWwe9aLCG6_zJnifff-qi5IhIUwdWWE55XSe6U2viWE',
];

const PLAN_DESCRIPTIONS: Record<string, string> = {
  STARTER: 'Beginners exploring AI interior concepts without commitment.',
  STANDARD: 'Freelancers needing flexibility and high-quality renders.',
  PRO: 'Small studios producing interior content regularly.',
  PREMIUM: 'Large scale operations requiring dedicated resources.',
};

const FEATURE_LABELS: Record<string, string> = {
  moodboard_generation: 'AI Moodboard Generation',
  room_2d_views: 'Room 2D Views',
  floor_3d_elevation: 'Floor 3D Elevation',
  per_room_3d_elevation: 'Per-Room 3D Elevation',
  room_walkthroughs: '3D Room Walkthroughs',
  component_extractor: 'Component Extractor',
  dpr: 'DPR (Detailed Project Report)',
  guided_assistance: 'Guided Assistance',
};

const ACCENT_COLORS = ['#3b82f6', '#ec4899', '#a855f7', '#10b981'];

export default function PricingPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
    const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const token = getAccessToken();
        const response = await fetch('/api/plans', {
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
          },
        });
        const data = await response.json();
        if (data.success) setPlans(data.data);
      } catch (error) {
        console.error('Failed to fetch plans:', error);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handlePurchase = async (plan: Plan) => {
    const token = getAccessToken();
    if (!token) {
      dispatch(showSnackbar({ message: 'Please sign in to continue', severity: 'warning' }));
      return;
    }
    router.push(`/checkout?plan=${plan.code}`);
  };

  const isPro = (p: Plan) => p.code === 'PRO';
  const isPremium = (p: Plan) => p.code === 'PREMIUM';

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#0f0f12',
        }}
      >
        <CircularProgress sx={{ color: '#a855f7' }} />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        bgcolor: '#0f0f12',
        color: '#fafafa',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background orbs */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: '-10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '60%',
            background: 'rgba(88, 28, 135, 0.2)',
            borderRadius: '50%',
            filter: 'blur(120px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: '-10%',
            right: '-10%',
            width: '40%',
            height: '40%',
            background: 'rgba(30, 58, 138, 0.1)',
            borderRadius: '50%',
            filter: 'blur(100px)',
          }}
        />
      </Box>

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 8, px: { xs: 2, sm: 3 } }}>
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 8 }}>
          <Typography
            variant="h3"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.75rem', md: '2.75rem' },
              letterSpacing: '-0.02em',
              mb: 2,
              lineHeight: 1.2,
            }}
          >
            Select the perfect plan for your
            <br className="hidden md:block" />
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(90deg, #c084fc 0%, #60a5fa 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              interior design project needs
            </Box>
          </Typography>
          <Typography sx={{ color: '#9ca3af', maxWidth: 560, mx: 'auto', fontSize: '1.125rem' }}>
            Choose a plan that will help you visualize and create stunning interior spaces with AI quickly and easily.
          </Typography>
          <Box
            sx={{
              mt: 3,
              display: 'inline-flex',
              alignItems: 'center',
              p: 0.5,
              bgcolor: 'rgba(39, 39, 42, 0.8)',
              borderRadius: 9999,
              border: '1px solid #3f3f46',
            }}
          >
            <Box
              sx={{
                px: 2.5,
                py: 1,
                borderRadius: 9999,
                bgcolor: '#27272a',
                color: '#fff',
                fontSize: '0.875rem',
                fontWeight: 500,
              }}
            >
              One-time payment
            </Box>
          </Box>
        </Box>

        {/* Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 3,
          }}
        >
          {plans.map((plan, idx) => (
            <Box
              key={plan.code}
              sx={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                bgcolor: '#18181b',
                border: isPro(plan) ? '2px solid #a855f7' : '1px solid #27272a',
                borderRadius: '1rem',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                boxShadow: isPro(plan) ? '0 0 0 4px rgba(168, 85, 247, 0.1)' : 'none',
                '&:hover': {
                  transform: isPro(plan) ? 'translateY(-8px)' : 'translateY(-4px)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                },
              }}
            >
              {isPro(plan) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    bgcolor: '#7c3aed',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    px: 1.5,
                    py: 0.5,
                    borderBottomLeftRadius: 8,
                    zIndex: 1,
                  }}
                >
                  BEST VALUE
                </Box>
              )}

              {/* Card header with gradient + image */}
              <Box
                sx={{
                  height: 128,
                  width: '100%',
                  position: 'relative',
                  background: CARD_GRADIENTS[idx % 4],
                  overflow: 'hidden',
                }}
              >
                <Box
                  component="img"
                  src={CARD_IMAGES[idx % 4]}
                  alt=""
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: 0.6,
                    mixBlendMode: 'overlay',
                    transition: 'transform 0.7s ease',
                    '&:hover': { transform: 'scale(1.05)' },
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, transparent 0%, #18181b 100%)',
                  }}
                />
              </Box>

              <Box sx={{ p: 2.5, pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, mb: 0.5 }}>
                  {plan.name}
                </Typography>
                <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af', mb: 2, minHeight: 40 }}>
                  {PLAN_DESCRIPTIONS[plan.code] || 'AI-powered interior design.'}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                  <Typography sx={{ fontSize: '1.875rem', fontWeight: 700 }}>
                    ₹{(plan.priceInr / 100).toLocaleString('en-IN')}
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', ml: 1, fontSize: '0.875rem' }}>
                    / one-time
                  </Typography>
                </Box>

                <Button
                  fullWidth
                  onClick={() => handlePurchase(plan)}
                  sx={{
                    py: 1.25,
                    px: 2,
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    mb: 2,
                    borderRadius: 1,
                    textTransform: 'none',
                    ...(isPro(plan)
                      ? {
                          background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                          color: '#fff',
                          '&:hover': {
                            background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)',
                            boxShadow: '0 0 20px rgba(168, 85, 247, 0.5)',
                          },
                        }
                      : {
                          bgcolor: 'rgba(255,255,255,0.05)',
                          color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)',
                          '&:hover': {
                            bgcolor: 'rgba(255,255,255,0.1)',
                            borderColor: 'rgba(255,255,255,0.2)',
                          },
                        }),
                  }}
                >
                  {isPremium(plan) ? 'Contact Sales' : isPro(plan) ? 'Get Pro Access' : plan.code === 'STANDARD' ? 'Upgrade' : 'Get Started'}
                </Button>

                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isPro(plan) ? '#c084fc' : '#9ca3af',
                    mb: 1,
                  }}
                >
                  Plan limits
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: ACCENT_COLORS[idx % 4], fontSize: '1.125rem', lineHeight: 1.4 }}>✓</Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d8' }}>
                    {plan.maxProjects} project{plan.maxProjects !== 1 ? 's' : ''}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                  <Box sx={{ color: ACCENT_COLORS[idx % 4], fontSize: '1.125rem', lineHeight: 1.4 }}>✓</Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d8' }}>
                    Up to {plan.maxRoomsPerProject} rooms per project
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 2 }}>
                  <Box sx={{ color: ACCENT_COLORS[idx % 4], fontSize: '1.125rem', lineHeight: 1.4 }}>✓</Box>
                  <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d8' }}>
                    {plan.regenerationLimit} regeneration{plan.regenerationLimit !== 1 ? 's' : ''} per stage
                  </Typography>
                </Box>

                <Typography
                  sx={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#9ca3af',
                    mb: 1,
                  }}
                >
                  Features
                </Typography>
                {Object.entries(plan.features)
                  .filter(([ v]) => v)
                  .map(([key]) => (
                    <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mb: 0.5 }}>
                      <Box sx={{ color: '#71717a', fontSize: '1.125rem', lineHeight: 1.4 }}>✓</Box>
                      <Typography sx={{ fontSize: '0.875rem', color: '#d4d4d8' }}>
                        {FEATURE_LABELS[key] || key}
                      </Typography>
                    </Box>
                  ))}
                {plan.walkthroughQuality && (
                  <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af', mt: 1 }}>
                    Walkthrough: {plan.walkthroughQuality}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            mt: 10,
            pt: 4,
            borderTop: '1px solid #27272a',
            textAlign: 'center',
          }}
        >
          <Typography sx={{ fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af', mb: 2 }}>
            Trusted by innovative design firms worldwide
          </Typography>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 4,
              opacity: 0.5,
              '&:hover': { opacity: 0.8 },
              transition: 'opacity 0.5s ease',
            }}
          >
            {['ArchViz', 'DecorAI', 'Spaces', 'LuxHome'].map((name, i) => (
              <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600, color: '#fff' }}>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: i === 1 ? '50%' : i === 2 ? '4px' : '4px',
                    border: i === 1 ? '3px solid #a855f7' : i === 3 ? '2px solid #ec4899' : 'none',
                    bgcolor: i === 0 ? '#3b82f6' : i === 2 ? '#10b981' : 'transparent',
                    transform: i === 2 ? 'rotate(45deg)' : 'none',
                  }}
                />
                {name}
              </Box>
            ))}
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
