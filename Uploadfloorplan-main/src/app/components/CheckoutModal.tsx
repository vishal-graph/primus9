import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import blueMetallicWave from 'figma:asset/a63b28d7a00a65b2590036e17edb846ade64161a.png';
import redMetallicWave from 'figma:asset/9af99f3cd70d6d532183ad5bf04e825b52557c08.png';
import purpleMetallicWave from 'figma:asset/4052104a51780d9670adaa10811e9d3d5000489b.png';
import greenMetallicWave from 'figma:asset/53b33a585c7609f797a3a77d44d92521aee6c7ba.png';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  planDescription: string;
  colorScheme: 'blue' | 'red' | 'purple' | 'green';
  planImage: string;
}

export default function CheckoutModal({
  isOpen,
  onClose,
  planName,
  planPrice,
  planDescription,
  colorScheme,
  planImage
}: CheckoutModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const [applyButtonHover, setApplyButtonHover] = useState(false);

  // Theme configuration
  const themes = {
    blue: {
      accent: '#2D6BFF',
      accentRgb: '45, 107, 255',
      accentLight: '#4D7FFF',
      accentDark: '#1D4FDF',
      name: 'Starter'
    },
    red: {
      accent: '#FF2A2A',
      accentRgb: '255, 42, 42',
      accentLight: '#FF4A4A',
      accentDark: '#DF1A1A',
      name: 'Standard'
    },
    purple: {
      accent: '#A855F7',
      accentRgb: '168, 85, 247',
      accentLight: '#B865FF',
      accentDark: '#9845E7',
      name: 'Pro'
    },
    green: {
      accent: '#22C55E',
      accentRgb: '34, 197, 94',
      accentLight: '#32D56E',
      accentDark: '#12B54E',
      name: 'Premium'
    }
  };

  const theme = themes[colorScheme];

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => setIsVisible(true), 10);
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease-out'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '880px',
          maxWidth: '95%',
          maxHeight: '600px',
          background: `linear-gradient(180deg, rgba(${theme.accentRgb}, 0.08) 0%, rgba(10, 10, 10, 0.95) 100%)`,
          border: `1px solid rgba(255, 255, 255, 0.08)`,
          boxShadow: `0px 30px 80px rgba(0, 0, 0, 0.7), 0 0 50px rgba(${theme.accentRgb}, 0.12)`,
          borderRadius: '20px',
          padding: '20px',
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          opacity: isVisible ? 1 : 0,
          transition: 'all 200ms ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(0, 0, 0, 0.5)',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.6)',
            cursor: 'pointer',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms ease',
            borderRadius: '8px',
            zIndex: 10
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 1)';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.5)';
          }}
        >
          <X size={20} />
        </button>

        {/* Two-column Grid: 42% Left (Image) + 58% Right (Content) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: '20px',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            height: '100%'
          }}
        >
          {/* LEFT COLUMN - Image Section (42%) with Overlay Plan Card */}
          <div
            style={{
              flex: '0 0 42%',
              position: 'relative',
              borderRadius: '16px',
              overflow: 'hidden',
              height: '560px'
            }}
          >
            {/* Wave Image */}
            <img
              src={colorScheme === 'red' ? redMetallicWave : colorScheme === 'purple' ? purpleMetallicWave : colorScheme === 'green' ? greenMetallicWave : blueMetallicWave}
              alt={`${planName} Plan`}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center left',
                display: 'block'
              }}
            />
            
            {/* Dark Gradient Overlay - Softer cinematic fade */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'linear-gradient(to top, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.05))',
                pointerEvents: 'none'
              }}
            />

            {/* Selected Plan Card - Absolutely Positioned Overlay */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '16px',
                right: '16px',
                background: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: `inset 0 1px 1px rgba(255, 255, 255, 0.06)`,
                borderRadius: '14px',
                padding: '16px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <div>
                  <h3
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      margin: '0 0 10px 0'
                    }}
                  >
                    {planName}
                  </h3>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: '22px',
                      padding: '0 10px',
                      background: 'rgba(255, 255, 255, 0.08)',
                      border: `1px solid rgba(${theme.accentRgb}, 0.3)`,
                      borderRadius: '999px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '10px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.8)'
                    }}
                  >
                    One-time payment
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '20px',
                      fontWeight: 700,
                      color: '#FFFFFF',
                      marginBottom: '8px'
                    }}
                  >
                    {planPrice}
                  </div>
                  <button
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: theme.accent,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline',
                      transition: 'color 200ms ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = theme.accentLight;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = theme.accent;
                    }}
                  >
                    Change Plan
                  </button>
                </div>
              </div>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.7)',
                  margin: 0,
                  lineHeight: '1.4'
                }}
              >
                {planDescription}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN - Content Section (58%) */}
          <div
            style={{
              flex: '0 0 calc(58% - 20px)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
              justifyContent: 'flex-start',
              overflowY: 'auto',
              maxHeight: '560px',
              paddingRight: '4px'
            }}
          >
            {/* Header */}
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '22px',
                fontWeight: 700,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Review Order
            </h2>

            {/* Apply Coupon Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h3
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: 0
                }}
              >
                Apply Coupon
              </h3>
              <div style={{ display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  style={{
                    flex: 1,
                    height: '48px',
                    background: '#0F0F0F',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '0 16px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    outline: 'none',
                    transition: 'border-color 200ms ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  }}
                />
                <button
                  onMouseEnter={() => setApplyButtonHover(true)}
                  onMouseLeave={() => setApplyButtonHover(false)}
                  style={{
                    height: '48px',
                    padding: '0 24px',
                    background: applyButtonHover ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid rgba(${theme.accentRgb}, ${applyButtonHover ? '0.25' : '0.2'})`,
                    borderRadius: '10px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    transition: 'all 200ms ease',
                    boxShadow: applyButtonHover ? `0 0 12px rgba(${theme.accentRgb}, 0.15)` : 'none'
                  }}
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Secure Payment Notice */}
            <div
              style={{
                background: `rgba(${theme.accentRgb}, 0.05)`,
                border: `1px solid rgba(${theme.accentRgb}, 0.15)`,
                borderLeft: `3px solid ${theme.accent}`,
                borderRadius: '14px',
                padding: '18px',
                display: 'flex',
                gap: '12px'
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                style={{ flexShrink: 0, marginTop: '2px' }}
              >
                <path
                  d="M10 0L2 4V9C2 13.55 5.84 17.74 10 19C14.16 17.74 18 13.55 18 9V4L10 0ZM10 9.5H16C15.47 12.73 13.09 15.57 10 16.87V10H4V5.3L10 2.19V9.5Z"
                  fill={theme.accent}
                  fillOpacity="0.8"
                />
              </svg>
              <div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: '#FFFFFF',
                    marginBottom: '4px'
                  }}
                >
                  Redirecting to Secure Payment Gateway
                </div>
                <div
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.5)',
                    lineHeight: '1.4'
                  }}
                >
                  Your payment information is encrypted and secure
                </div>
              </div>
            </div>

            {/* Order Summary Card */}
            <div
              style={{
                background: `linear-gradient(180deg, rgba(${theme.accentRgb}, 0.08) 0%, rgba(17, 24, 39, 0.15) 100%)`,
                border: `1px solid rgba(255, 255, 255, 0.06)`,
                boxShadow: `inset 0 0 0 1px rgba(${theme.accentRgb}, 0.18)`,
                borderRadius: '16px',
                padding: '18px'
              }}
            >
              <h3
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: '0 0 16px 0'
                }}
              >
                Order Summary
              </h3>

              {/* Subtotal */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '12px'
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  Subtotal
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF'
                  }}
                >
                  {planPrice}
                </span>
              </div>

              {/* Taxes */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '16px'
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.7)'
                  }}
                >
                  Taxes (18% GST)
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}
                >
                  Included
                </span>
              </div>

              {/* Divider */}
              <div
                style={{
                  height: '1px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px'
                }}
              />

              {/* Total */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '20px'
                }}
              >
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#FFFFFF'
                  }}
                >
                  Total Payable
                </span>
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '24px',
                    fontWeight: 700,
                    color: '#FFFFFF'
                  }}
                >
                  {planPrice}
                </span>
              </div>

              {/* Primary Button */}
              <button
                onMouseEnter={() => setButtonHover(true)}
                onMouseLeave={() => setButtonHover(false)}
                style={{
                  width: '100%',
                  height: '46px',
                  background: buttonHover
                    ? `linear-gradient(90deg, ${theme.accentLight} 0%, rgba(${theme.accentRgb}, 0.8) 100%)`
                    : `linear-gradient(90deg, ${theme.accent} 0%, rgba(${theme.accentRgb}, 0.7) 100%)`,
                  border: `1px solid rgba(${theme.accentRgb}, 0.5)`,
                  borderRadius: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  cursor: 'pointer',
                  transition: 'all 200ms ease',
                  marginBottom: '12px',
                  boxShadow: `0 0 12px rgba(${theme.accentRgb}, 0.15)`,
                  transform: buttonHover ? 'translateY(-1px)' : 'translateY(0)'
                }}
              >
                Proceed to Payment →
              </button>

              {/* Below button text */}
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.5)',
                  textAlign: 'center',
                  margin: 0,
                  lineHeight: '1.4'
                }}
              >
                You will be redirected to complete your purchase safely.
              </p>
            </div>

            {/* Footer */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.4)',
                textAlign: 'center',
                margin: 0,
                lineHeight: '1.5'
              }}
            >
              By proceeding, you agree to our{' '}
              <a
                href="#"
                style={{
                  color: theme.accent,
                  textDecoration: 'underline',
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.accentLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.accent;
                }}
              >
                Terms of Service
              </a>
              {' '}and{' '}
              <a
                href="#"
                style={{
                  color: theme.accent,
                  textDecoration: 'underline',
                  transition: 'color 200ms ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.accentLight;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.accent;
                }}
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}