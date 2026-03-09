'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import {
  Box,
  Container,
  Typography,
  Button,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  LocalOffer,
  ChevronRight,
  Security,
  Lock,
  VerifiedUser,
  ArrowForward,
  CheckCircle,
} from '@mui/icons-material';
import { useAppDispatch } from '@/store';
import { showSnackbar } from '@/store/uiSlice';

type PlanCode = 'STARTER' | 'STANDARD' | 'PRO' | 'PREMIUM';

interface PlanInfo {
  code: string;
  name: string;
  priceInr: number;
}

const glassCardSx = {
  background: 'rgba(24, 24, 27, 0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255, 255, 255, 0.05)',
  borderRadius: '1rem',
  p: 3,
  transition: 'border-color 0.3s ease',
  '&:hover': { borderColor: 'rgba(168, 85, 247, 0.3)' },
};

export default function CheckoutPage() {
  return (
    <Suspense fallback={<CheckoutFallback />}>
      <CheckoutContent />
    </Suspense>
  );
}

function CheckoutFallback() {
  return (
    <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
      <CircularProgress sx={{ color: '#a855f7' }} />
    </Box>
  );
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const { getToken } = useAuth();
  const planCode = (searchParams.get('plan') || '').toUpperCase() as PlanCode;

  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountPaise: number;
    finalAmountPaise: number;
    discountLabel: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [applying, setApplying] = useState(false);
  const [processing, setProcessing] = useState(false);

  const validPlans: PlanCode[] = ['STARTER', 'STANDARD', 'PRO', 'PREMIUM'];

  useEffect(() => {
    if (!planCode || !validPlans.includes(planCode)) {
      setLoading(false);
      return;
    }
    const fetchPlans = async () => {
      try {
        const token = await getToken();
        const res = await fetch('/api/plans', {
          headers: { Authorization: token ? `Bearer ${token}` : '', 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          const p = data.data.find((x: PlanInfo) => x.code === planCode);
          setPlan(p || null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlans();
  }, [planCode, getToken]);

  const handleApplyCoupon = async () => {
    if (!plan || !couponInput.trim()) return;
    setCouponError('');
    setApplying(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ code: couponInput.trim(), planCode }),
      });
      const data = await res.json();
      if (!data.success) {
        setCouponError(data.error?.message || 'Validation failed');
        setApplying(false);
        return;
      }
      const d = data.data;
      if (d.valid && d.finalAmountPaise != null) {
        setAppliedCoupon({
          code: d.couponCode || couponInput.trim().toUpperCase(),
          discountPaise: d.discountPaise || 0,
          finalAmountPaise: d.finalAmountPaise,
          discountLabel: d.discountLabel || 'Discount',
        });
        setCouponError('');
        dispatch(showSnackbar({ message: d.message, severity: 'success', duration: 3000 }));
      } else {
        setCouponError(d.message || 'Invalid coupon');
        setAppliedCoupon(null);
      }
    } catch (e) {
      setCouponError('Could not validate coupon. Try again.');
      setAppliedCoupon(null);
    } finally {
      setApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
  };

  const loadRazorpayScript = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve(false);
      if (typeof (window as any).Razorpay !== 'undefined') {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleProceedToPayment = async () => {
    if (!plan) return;
    setProcessing(true);
    try {
      const token = await getToken();
      if (!token) {
        dispatch(showSnackbar({ message: 'Please sign in to continue', severity: 'warning' }));
        setProcessing(false);
        return;
      }
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        dispatch(showSnackbar({ message: 'Payment system failed to load. Refresh and try again.', severity: 'error' }));
        setProcessing(false);
        return;
      }
      const orderRes = await fetch('/api/plans/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          planCode: plan.code,
          ...(appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
        }),
      });
      const orderData = await orderRes.json();
      if (!orderData.success) {
        const errMsg =
          typeof orderData.error === 'object' && orderData.error?.message
            ? orderData.error.message
            : typeof orderData.error === 'string'
              ? orderData.error
              : 'Failed to create order';
        dispatch(showSnackbar({ message: errMsg, severity: 'error' }));
        setProcessing(false);
        return;
      }
      const { orderId, amount, currency, keyId } = orderData.data;
      const Razorpay = (window as any).Razorpay;
      const razorpay = new Razorpay({
        key: keyId,
        amount,
        currency,
        name: 'TatvaOps Vision',
        description: `${plan.name} Plan`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await fetch('/api/plans/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              dispatch(
                showSnackbar({
                  message: `Plan activated! Welcome to ${plan.name}.`,
                  severity: 'success',
                  duration: 4000,
                })
              );
              setProcessing(false);
              const subId = verifyData.data?.subscription?.id;
              const q = new URLSearchParams({
                plan: plan.code,
                planName: plan.name,
                amount: String(finalPaise),
                ...(subId ? { subscriptionId: subId } : {}),
              });
              router.push(`/checkout/success?${q.toString()}`);
              return;
            }
            const verifyErr =
              typeof verifyData.error === 'object' && verifyData.error?.message
                ? verifyData.error.message
                : 'Payment verification failed';
            dispatch(showSnackbar({ message: verifyErr, severity: 'error' }));
            const failQ = new URLSearchParams({
              plan: plan.code,
              planName: plan.name,
              amount: String(finalPaise),
              ...(response?.razorpay_order_id ? { orderId: response.razorpay_order_id } : {}),
            });
            router.push(`/checkout/failure?${failQ.toString()}`);
          } catch {
            dispatch(showSnackbar({ message: 'Verification failed. Contact support.', severity: 'error' }));
            const failQ = new URLSearchParams({
              plan: plan.code,
              planName: plan.name,
              amount: String(finalPaise),
              ...(response?.razorpay_order_id ? { orderId: response.razorpay_order_id } : {}),
            });
            router.push(`/checkout/failure?${failQ.toString()}`);
          }
          setProcessing(false);
        },
        modal: { ondismiss: () => setProcessing(false) },
        theme: { color: '#a855f7' },
      });
      razorpay.on('payment.failed', (resp: any) => {
        const desc = resp?.error?.description || 'Payment failed';
        dispatch(showSnackbar({ message: desc, severity: 'error' }));
        setProcessing(false);
        const failQ = new URLSearchParams({
          plan: plan.code,
          planName: plan.name,
          amount: String(finalPaise),
          ...(orderId ? { orderId } : {}),
        });
        router.push(`/checkout/failure?${failQ.toString()}`);
      });
      razorpay.open();
    } catch (e) {
      dispatch(showSnackbar({ message: 'Something went wrong. Try again.', severity: 'error' }));
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#0f0f12' }}>
        <CircularProgress sx={{ color: '#a855f7' }} />
      </Box>
    );
  }

  if (!planCode || !validPlans.includes(planCode) || !plan) {
    return (
      <Box sx={{ bgcolor: '#0f0f12', minHeight: '100vh', py: 8 }}>
        <Container maxWidth="sm">
          <Alert
            severity="warning"
            sx={{
              mb: 2,
              bgcolor: 'rgba(24, 24, 27, 0.8)',
              border: '1px solid #27272a',
              color: '#fafafa',
              '& .MuiAlert-icon': { color: '#f59e0b' },
            }}
          >
            Invalid or missing plan. Please choose a plan from the pricing page.
          </Alert>
          <Button
            variant="contained"
            onClick={() => router.push('/pricing')}
            sx={{
              background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
              color: '#fff',
              '&:hover': { background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)' },
            }}
          >
            View plans
          </Button>
        </Container>
      </Box>
    );
  }

  const subtotalPaise = plan.priceInr;
  const finalPaise = appliedCoupon ? appliedCoupon.finalAmountPaise : subtotalPaise;
  const discountPaise = appliedCoupon ? appliedCoupon.discountPaise : 0;

  const formatPrice = (paise: number) =>
    `₹${(paise / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  return (
    <Box sx={{ bgcolor: '#0f0f12', color: '#fafafa', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Background orbs – same as pricing */}
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

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 5, px: { xs: 2, sm: 3 } }}>
        {/* Breadcrumb */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 4, fontSize: '0.875rem', fontWeight: 500, color: '#9ca3af' }}>
          <Box
            component={Link}
            href="/pricing"
            sx={{ color: 'inherit', textDecoration: 'none', '&:hover': { color: '#c084fc' }, transition: 'color 0.2s' }}
          >
            Plan
          </Box>
          <ChevronRight sx={{ fontSize: '1rem', color: '#6b7280' }} />
          <Typography component="span" sx={{ color: '#a855f7' }}>
            Checkout
          </Typography>
          <ChevronRight sx={{ fontSize: '1rem', color: '#6b7280' }} />
          <Typography component="span" sx={{ color: '#6b7280' }}>
            Payment
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '7fr 5fr' },
            gap: { xs: 3, lg: 4 },
            alignItems: 'start',
          }}
        >
          {/* Left column */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#fff', mb: 1 }}>
              Review Order
            </Typography>

            {/* Plan card – glass with purple left border */}
            <Box sx={{ ...glassCardSx, position: 'relative', overflow: 'hidden' }}>
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: 4,
                  bgcolor: '#a855f7',
                }}
              />
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: { xs: 'column', sm: 'row' },
                  justifyContent: 'space-between',
                  alignItems: { xs: 'flex-start', sm: 'center' },
                  gap: 2,
                }}
              >
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <Typography sx={{ fontSize: '1.25rem', fontWeight: 600, color: '#fff' }}>
                      {plan.name} Plan
                    </Typography>
                    <Box
                      sx={{
                        bgcolor: 'rgba(168, 85, 247, 0.2)',
                        color: '#c4b5fd',
                        fontSize: '0.75rem',
                        px: 1,
                        py: 0.25,
                        borderRadius: 9999,
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                      }}
                    >
                      One-time payment
                    </Box>
                  </Box>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                    AI-powered interior design for your projects.
                  </Typography>
                </Box>
                <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>
                    {formatPrice(subtotalPaise)}
                  </Typography>
                  <Link
                    href="/pricing"
                    style={{
                      fontSize: '0.875rem',
                      color: '#c084fc',
                      textDecoration: 'underline',
                      textUnderlineOffset: 2,
                    }}
                  >
                    Change Plan
                  </Link>
                </Box>
              </Box>
            </Box>

            {/* Coupon card */}
            <Box sx={glassCardSx}>
              <Typography sx={{ fontSize: '1.125rem', fontWeight: 500, color: '#fff', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocalOffer sx={{ color: '#a855f7', fontSize: '1.25rem' }} />
                Apply Coupon
              </Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Enter discount code"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  disabled={!!appliedCoupon}
                  sx={{
                    flex: '1 1 200px',
                    '& .MuiOutlinedInput-root': {
                      bgcolor: '#18181b',
                      borderColor: '#3f3f46',
                      color: '#fff',
                      '& fieldset': { borderColor: '#3f3f46' },
                      '&:hover fieldset': { borderColor: '#52525b' },
                      '&.Mui-focused fieldset': { borderColor: '#a855f7', borderWidth: 2 },
                    },
                    '& .MuiInputBase-input': { textTransform: 'uppercase' },
                  }}
                  InputProps={{
                    endAdornment: appliedCoupon ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#22c55e', fontSize: '0.875rem', fontWeight: 500 }}>
                        <CheckCircle sx={{ fontSize: '1rem' }} />
                        Applied
                      </Box>
                    ) : null,
                  }}
                />
                {appliedCoupon ? (
                  <Button
                    onClick={removeCoupon}
                    sx={{
                      bgcolor: '#27272a',
                      color: '#fff',
                      border: '1px solid #3f3f46',
                      '&:hover': { bgcolor: '#3f3f46' },
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button
                    onClick={handleApplyCoupon}
                    disabled={applying}
                    sx={{
                      bgcolor: '#27272a',
                      color: '#fff',
                      border: '1px solid #3f3f46',
                      '&:hover': { bgcolor: '#3f3f46' },
                      py: 1.5,
                      px: 2,
                    }}
                  >
                    {applying ? 'Applying…' : 'Apply'}
                  </Button>
                )}
              </Box>
              {couponError && (
                <Typography sx={{ color: '#ef4444', fontSize: '0.875rem', mt: 1 }}>{couponError}</Typography>
              )}
              {appliedCoupon && discountPaise > 0 && (
                <Typography sx={{ color: '#22c55e', fontSize: '0.75rem', mt: 1 }}>
                  You saved {formatPrice(discountPaise)} with this coupon!
                </Typography>
              )}
            </Box>

            {/* Secure payment notice */}
            <Box sx={{ ...glassCardSx, borderTop: '1px solid rgba(63, 63, 70, 0.5)' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '0.75rem',
                    border: '1px solid rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                  }}
                >
                  <Security sx={{ fontSize: '2rem' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '1.125rem', fontWeight: 500, color: '#fff', mb: 0.5 }}>
                    Redirecting to Secure Payment Gateway
                  </Typography>
                  <Typography sx={{ color: '#9ca3af', fontSize: '0.875rem', lineHeight: 1.6 }}>
                    To ensure your security, you will be redirected to our trusted payment partner to complete your transaction. We do not store your card details on our servers.
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2, mt: 1.5, opacity: 0.7 }}>
                    {[1, 2, 3, 4].map((i) => (
                      <Box key={i} sx={{ width: 40, height: 24, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }} />
                    ))}
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right column – Order Summary (sticky) */}
          <Box sx={{ position: { lg: 'sticky' }, top: { lg: 32 } }}>
            <Box
              sx={{
                ...glassCardSx,
                border: '1px solid rgba(63, 63, 70, 0.5)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <Typography sx={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff', pb: 2, mb: 2, borderBottom: '1px solid #3f3f46' }}>
                Order Summary
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <Typography component="span">Subtotal</Typography>
                  <Typography component="span" sx={{ color: '#e5e7eb' }}>{formatPrice(subtotalPaise)}</Typography>
                </Box>
                {appliedCoupon && discountPaise > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#22c55e' }}>
                    <Typography component="span">Discount ({appliedCoupon.code})</Typography>
                    <Typography component="span">- {formatPrice(discountPaise)}</Typography>
                  </Box>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af' }}>
                  <Typography component="span">Taxes (18% GST)</Typography>
                  <Typography component="span" sx={{ color: '#e5e7eb' }}>Included</Typography>
                </Box>
              </Box>
              <Box sx={{ borderTop: '1px dashed #52525b', pt: 2, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <Typography sx={{ color: '#d4d4d8', fontWeight: 500 }}>Total Payable</Typography>
                  <Typography sx={{ fontSize: '1.875rem', fontWeight: 700, color: '#fff' }}>
                    {formatPrice(finalPaise)}
                  </Typography>
                </Box>
              </Box>
              <Button
                fullWidth
                disabled={processing}
                onClick={handleProceedToPayment}
                sx={{
                  py: 1.5,
                  px: 2,
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  borderRadius: '0.75rem',
                  background: 'linear-gradient(90deg, #9333ea 0%, #c084fc 100%)',
                  color: '#fff',
                  boxShadow: '0 10px 15px -3px rgba(88, 28, 135, 0.4)',
                  textTransform: 'none',
                  position: 'relative',
                  overflow: 'hidden',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #7e22ce 0%, #a855f7 100%)',
                    boxShadow: '0 10px 25px -5px rgba(168, 85, 247, 0.5)',
                    transform: 'translateY(-2px)',
                  },
                  '& .btn-shine': {
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.2)',
                    transform: 'translateY(100%)',
                    transition: 'transform 0.3s ease',
                  },
                  '&:hover .btn-shine': { transform: 'translateY(0)' },
                }}
              >
                <Box component="span" sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                  {processing ? 'Opening payment…' : 'Proceed to Payment'}
                  {!processing && <ArrowForward sx={{ fontSize: '1.25rem' }} />}
                </Box>
                <Box className="btn-shine" />
              </Button>
              <Typography sx={{ textAlign: 'center', fontSize: '0.75rem', color: '#6b7280', mt: 1.5 }}>
                You will be redirected to complete your purchase safely.
              </Typography>
              <Box
                sx={{
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid #27272a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  flexWrap: 'wrap',
                  color: '#6b7280',
                  fontSize: '0.75rem',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Lock sx={{ fontSize: '1rem', color: '#22c55e' }} />
                  SSL Encrypted
                </Box>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#3f3f46' }} />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <VerifiedUser sx={{ fontSize: '1rem', color: '#3b82f6' }} />
                  Secure Checkout
                </Box>
              </Box>
            </Box>

            <Box sx={{ ...glassCardSx, mt: 2, py: 2, borderRadius: '0.75rem', textAlign: 'center' }}>
              <Typography sx={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                By proceeding, you agree to our{' '}
                <Link href="#" style={{ color: '#c084fc', textDecoration: 'underline' }}>Terms of Service</Link>
                {' '}and{' '}
                <Link href="#" style={{ color: '#c084fc', textDecoration: 'underline' }}>Privacy Policy</Link>.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
