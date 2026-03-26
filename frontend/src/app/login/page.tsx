'use client';


import { useEffect } from 'react';
import { loginWithGoogle, getAccessToken } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  // Redirect immediately if already authenticated via our auth service
  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      router.replace('/dashboard');
    }
  }, [router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      {/* Background glow */}
      <div style={{
        position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
        }} />
      </div>

      <div style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '24px',
        padding: '56px 48px',
        maxWidth: '420px',
        width: '100%',
        margin: '16px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <div style={{
          width: '56px', height: '56px',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          borderRadius: '16px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 28px',
          fontSize: '24px',
        }}>
          🏠
        </div>

        {/* Heading */}
        <h1 style={{
          color: '#ffffff',
          fontSize: '26px',
          fontWeight: 700,
          letterSpacing: '-0.5px',
          margin: '0 0 8px',
        }}>
          TatvaOps Vision
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.45)',
          fontSize: '14px',
          margin: '0 0 40px',
          lineHeight: 1.6,
        }}>
          AI-powered interior design, from floor plan<br />to photorealistic renderings.
        </p>

        {/* Google Sign-In Button */}
        <button
          onClick={() => loginWithGoogle()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '14px 24px',
            background: '#ffffff',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '12px',
            fontSize: '15px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 8px 24px rgba(255,255,255,0.15)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
          }}
        >
          {/* Google Icon SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <p style={{
          color: 'rgba(255,255,255,0.2)',
          fontSize: '12px',
          margin: '28px 0 0',
        }}>
          By continuing, you agree to TatvaOps'{' '}
          <a href="#" style={{ color: 'rgba(99,102,241,0.8)', textDecoration: 'none' }}>Terms of Service</a>
          {' '}and{' '}
          <a href="#" style={{ color: 'rgba(99,102,241,0.8)', textDecoration: 'none' }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
