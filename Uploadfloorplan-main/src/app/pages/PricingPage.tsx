import { useState } from 'react';
import Layout from '../components/Layout';
import CheckoutModal from '../components/CheckoutModal';
import { Check } from 'lucide-react';
import starterImage from 'figma:asset/9b8e27a3640b5427cd589094fb602e29e10d5517.png';
import standardImage from 'figma:asset/88c34b524783a067f2835862c1ffb7937554ffcc.png';
import proImage from 'figma:asset/d10f5885ef9975e9fb0a40e3e35118b9703d96af.png';
import premiumImage from 'figma:asset/3f81e514bb80e02cfe891776fea9bca97f53ef7d.png';

export default function PricingPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    price: string;
    description: string;
    colorScheme: 'blue' | 'red' | 'purple' | 'green';
    planImage: string;
  } | null>(null);

  const handleOpenModal = (
    name: string,
    price: string,
    description: string,
    colorScheme: 'blue' | 'red' | 'purple' | 'green',
    planImage: string
  ) => {
    setSelectedPlan({ name, price, description, colorScheme, planImage });
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <Layout>
      <div
        style={{
          width: '100%',
          minHeight: '100vh',
          position: 'relative',
          paddingTop: '64px',
          paddingBottom: '80px'
        }}
      >
        {/* Content */}
        <div
          style={{
            position: 'absolute',
            left: '136px',
            width: 'calc(100% - 136px)',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 1
          }}
        >
          {/* Inner Centered Container */}
          <div
            style={{
              maxWidth: '1200px',
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '36px'
            }}
          >
            {/* Header Section */}
            <div
              style={{
                textAlign: 'center'
              }}
            >
              <h1
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '42px',
                  fontWeight: 700,
                  lineHeight: '1.15',
                  letterSpacing: '-0.42px',
                  marginBottom: '16px',
                  color: '#FFFFFF'
                }}
              >
                Select the perfect plan for your
                <br />
                <span
                  style={{
                    position: 'relative',
                    display: 'inline-block'
                  }}
                >
                  {/* Inner highlight layer (duplicate text) */}
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      color: 'rgba(255, 255, 255, 0.09)',
                      filter: 'blur(2px)',
                      mixBlendMode: 'overlay',
                      WebkitMaskImage: 'linear-gradient(90deg, #F3C27A 0%, #C87A2A 35%, #8B4A14 65%, #5A2C0D 100%)',
                      maskImage: 'linear-gradient(90deg, #F3C27A 0%, #C87A2A 35%, #8B4A14 65%, #5A2C0D 100%)',
                      pointerEvents: 'none'
                    }}
                  >
                    interior design project needs
                  </span>
                  
                  {/* Main gradient text */}
                  <span
                    style={{
                      background: 'linear-gradient(90deg, #F3C27A 0%, #C87A2A 35%, #8B4A14 65%, #5A2C0D 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      display: 'inline-block'
                    }}
                  >
                    interior design project needs
                  </span>
                </span>
              </h1>
              
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  lineHeight: '1.4',
                  color: 'rgba(255, 255, 255, 0.7)',
                  marginBottom: '20px'
                }}
              >
                Choose a plan that will help you visualize and create stunning interior
                <br />
                spaces with AI quickly and easily.
              </p>

              {/* Toggle Pill */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 200,
                  color: '#FFFFFF',
                  textShadow: '0 0 4px rgba(255, 255, 255, 0.12), 0 0 6px rgba(255, 255, 255, 0.08)'
                }}
              >
                One-time payment
              </div>
            </div>

            {/* Pricing Cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 255px)',
                gap: '24px',
                justifyContent: 'center'
              }}
            >
              <PricingCard
                name="Starter"
                description="Beginners exploring AI interior concepts without commitment."
                price="₹9"
                priceNote="/ one-time"
                buttonText="Get Started"
                buttonVariant="secondary"
                colorScheme="blue"
                limits={[
                  '1 project',
                  'Up to 7 rooms per project',
                  '1 regeneration per stage'
                ]}
                features={[
                  'AI Moodboard Generation',
                  'Room 3D Views',
                  'Floor 3D Elevation'
                ]}
                image={starterImage}
                handleOpenModal={handleOpenModal}
              />

              <PricingCard
                name="Standard"
                description="Freelancers needing flexibility and high-quality renders."
                price="₹7,999"
                priceNote="/ one-time"
                buttonText="Upgrade"
                buttonVariant="secondary"
                colorScheme="red"
                limits={[
                  '2 projects',
                  'Up to 10 rooms per project',
                  '2 regenerations per stage'
                ]}
                features={[
                  'AI Moodboard Generation',
                  'Room 3D Views',
                  'Floor 3D Elevation',
                  '3D Room Walkthrough',
                  'Component Editability'
                ]}
                image={standardImage}
                handleOpenModal={handleOpenModal}
              />

              <PricingCard
                name="Pro"
                description="Small studios producing interior work regularly."
                price="₹14,999"
                priceNote="/ one-time"
                buttonText="Get Pro Access"
                buttonVariant="primary"
                colorScheme="purple"
                badge="BEST VALUE"
                limits={[
                  '3 projects',
                  'Up to 15 rooms per project',
                  '3 regenerations per stage'
                ]}
                features={[
                  'AI Moodboard Generation',
                  'Room 3D Views',
                  'Floor 3D Elevation',
                  'Per-Room 3D Elevation',
                  '3D Room Walkthrough',
                  'Component Editability',
                  'QPR (Detailed Project Report)',
                  'Guided Assistance'
                ]}
                image={proImage}
                handleOpenModal={handleOpenModal}
              />

              <PricingCard
                name="Premium"
                description="Large-scale operations requiring dedicated resources."
                price="₹29,999"
                priceNote="/ one-time"
                buttonText="Contact Sales"
                buttonVariant="secondary"
                colorScheme="green"
                limits={[
                  '5 projects',
                  'Up to 30 rooms per project',
                  '5 regenerations per stage'
                ]}
                features={[
                  'AI Moodboard Generation',
                  'Room 3D Views',
                  'Floor 3D Elevation',
                  'Per-Room 3D Elevation',
                  '3D Room Walkthrough',
                  'Component Editability',
                  'QPR (Detailed Project Report)',
                  'Guided Assistance',
                  'Walkthrough: 4x'
                ]}
                image={premiumImage}
                handleOpenModal={handleOpenModal}
              />
            </div>

            {/* Footer Section */}
            <div
              style={{
                textAlign: 'center',
                paddingBottom: '24px'
              }}
            >
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '24px'
                }}
              >
                Trusted by innovative design firms worldwide
              </p>
              
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '48px'
                }}
              >
                <BrandChip name="ArchViz" />
                <BrandChip name="DesignAI" />
                <BrandChip name="Spacera" />
                <BrandChip name="LiveHome" />
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Checkout Modal */}
      {modalOpen && selectedPlan && (
        <CheckoutModal
          isOpen={modalOpen}
          planName={selectedPlan.name}
          planPrice={selectedPlan.price}
          planDescription={selectedPlan.description}
          colorScheme={selectedPlan.colorScheme}
          planImage={selectedPlan.planImage}
          onClose={handleCloseModal}
        />
      )}
    </Layout>
  );
}

// Pricing Card Component
function PricingCard({
  name,
  description,
  price,
  priceNote,
  buttonText,
  buttonVariant,
  colorScheme,
  badge,
  limits,
  features,
  image,
  handleOpenModal
}: {
  name: string;
  description: string;
  price: string;
  priceNote: string;
  buttonText: string;
  buttonVariant: 'primary' | 'secondary';
  colorScheme: 'blue' | 'red' | 'purple' | 'green';
  badge?: string;
  limits: string[];
  features: string[];
  image?: string;
  handleOpenModal: (
    name: string,
    price: string,
    description: string,
    colorScheme: 'blue' | 'red' | 'purple' | 'green',
    planImage: string
  ) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const colorSchemes = {
    blue: {
      background: 'rgba(15, 15, 20, 0.35)',
      gradient: 'linear-gradient(180deg, rgba(30, 58, 138, 0.08) 0%, rgba(17, 24, 39, 0.15) 100%)',
      border: 'rgba(59, 130, 246, 0.3)',
      borderHover: 'rgba(59, 130, 246, 0.5)',
      glow: 'rgba(59, 130, 246, 0.2)',
      wave: 'radial-gradient(ellipse 180% 100% at 30% 0%, rgba(30, 58, 138, 0.6) 0%, rgba(59, 130, 246, 0.4) 30%, transparent 70%), radial-gradient(ellipse 150% 120% at 70% 10%, rgba(37, 99, 235, 0.5) 0%, transparent 60%)'
    },
    red: {
      background: 'rgba(15, 15, 20, 0.35)',
      gradient: 'linear-gradient(180deg, rgba(127, 29, 29, 0.08) 0%, rgba(17, 24, 39, 0.15) 100%)',
      border: 'rgba(239, 68, 68, 0.3)',
      borderHover: 'rgba(239, 68, 68, 0.5)',
      glow: 'rgba(239, 68, 68, 0.2)',
      wave: 'radial-gradient(ellipse 180% 100% at 30% 0%, rgba(127, 29, 29, 0.6) 0%, rgba(153, 27, 27, 0.4) 30%, transparent 70%), radial-gradient(ellipse 150% 120% at 70% 10%, rgba(185, 28, 28, 0.5) 0%, transparent 60%)'
    },
    purple: {
      background: 'rgba(15, 15, 20, 0.35)',
      gradient: 'linear-gradient(180deg, rgba(91, 33, 182, 0.1) 0%, rgba(17, 24, 39, 0.2) 100%)',
      border: 'rgba(168, 85, 247, 0.5)',
      borderHover: 'rgba(168, 85, 247, 0.8)',
      glow: 'rgba(168, 85, 247, 0.3)',
      wave: 'radial-gradient(ellipse 180% 100% at 30% 0%, rgba(91, 33, 182, 0.6) 0%, rgba(126, 34, 206, 0.4) 30%, transparent 70%), radial-gradient(ellipse 150% 120% at 70% 10%, rgba(147, 51, 234, 0.5) 0%, transparent 60%)'
    },
    green: {
      background: 'rgba(15, 15, 20, 0.35)',
      gradient: 'linear-gradient(180deg, rgba(20, 83, 45, 0.08) 0%, rgba(17, 24, 39, 0.15) 100%)',
      border: 'rgba(34, 197, 94, 0.3)',
      borderHover: 'rgba(34, 197, 94, 0.5)',
      glow: 'rgba(34, 197, 94, 0.2)',
      wave: 'radial-gradient(ellipse 180% 100% at 30% 0%, rgba(20, 83, 45, 0.6) 0%, rgba(22, 101, 52, 0.4) 30%, transparent 70%), radial-gradient(ellipse 150% 120% at 70% 10%, rgba(5, 150, 105, 0.5) 0%, transparent 60%)'
    }
  };

  const scheme = colorSchemes[colorScheme];

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'relative',
        background: `${scheme.gradient}, ${scheme.background}`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${isHovered ? scheme.borderHover : scheme.border}`,
        borderRadius: '16px',
        padding: image ? '0' : '20px 18px',
        transition: 'all 0.3s ease',
        transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
        boxShadow: isHovered 
          ? `inset 0 1px 4px rgba(255, 255, 255, 0.08), 0 0 32px ${scheme.glow}, 0 20px 40px rgba(0, 0, 0, 0.15)`
          : 'inset 0 1px 4px rgba(255, 255, 255, 0.08), 0 20px 40px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden'
      }}
    >
      {/* Top Image Header (if provided) */}
      {image && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            overflow: 'hidden',
            borderRadius: '16px 16px 0 0',
            zIndex: 1
          }}
        >
          <img
            src={image}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 35%',
              display: 'block'
            }}
          />
          {/* Dark overlay gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.55) 100%)',
              pointerEvents: 'none',
              zIndex: 2
            }}
          />
          {/* Subtle inner shadow for glass depth */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              boxShadow: 'inset 0 3px 8px rgba(0, 0, 0, 0.25), inset 0 -3px 8px rgba(0, 0, 0, 0.25)',
              pointerEvents: 'none',
              zIndex: 3
            }}
          />
          {/* Badge - inside image container */}
          {badge && (
            <div
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '6px 12px',
                background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                borderRadius: '999px',
                boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.4)',
                fontFamily: 'Inter, sans-serif',
                fontSize: '10px',
                fontWeight: 700,
                letterSpacing: '0.6px',
                color: '#FFFFFF',
                textTransform: 'uppercase',
                zIndex: 4
              }}
            >
              {badge}
            </div>
          )}
        </div>
      )}

      {/* Content Container (with conditional padding) */}
      <div
        style={{
          padding: image ? '22px 18px 20px 18px' : '0',
          position: 'relative'
        }}
      >
        {/* Decorative Wave Background */}
        {!image && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '28%',
              background: scheme.wave,
              opacity: 0.4,
              filter: 'blur(10px)',
              mixBlendMode: 'overlay',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        )}

        {/* Plan Name */}
        <h3
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: '18px',
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: '5px'
          }}
        >
          {name}
        </h3>

        {/* Description */}
        <p
          style={{
            position: 'relative',
            zIndex: 1,
            fontFamily: 'Inter, sans-serif',
            fontSize: '11px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.6)',
            marginBottom: '14px',
            lineHeight: '1.4',
            minHeight: '45px'
          }}
        >
          {description}
        </p>

        {/* Price */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '4px',
              marginBottom: '4px'
            }}
          >
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '28px',
                fontWeight: 700,
                color: '#FFFFFF'
              }}
            >
              {price}
            </span>
            <span
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.5)'
              }}
            >
              {priceNote}
            </span>
          </div>
        </div>

        {/* Button */}
        <button
          className={buttonVariant === 'primary' ? 'pro-button-shimmer' : ''}
          style={{
            position: 'relative',
            zIndex: 1,
            width: '100%',
            padding: '10px 18px',
            background: buttonVariant === 'primary' 
              ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : 'rgba(255, 255, 255, 0.05)',
            border: buttonVariant === 'primary' 
              ? '1px solid rgba(139, 92, 246, 0.5)'
              : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 600,
            color: '#FFFFFF',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            marginBottom: '16px',
            height: '40px',
            overflow: 'hidden'
          }}
          onMouseEnter={(e) => {
            if (buttonVariant === 'primary') {
              e.currentTarget.style.background = 'linear-gradient(135deg, #9d6fff 0%, #8b5cf6 100%)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }
          }}
          onMouseLeave={(e) => {
            if (buttonVariant === 'primary') {
              e.currentTarget.style.background = 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
            } else {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }
          }}
          onClick={() => handleOpenModal(name, price, description, colorScheme, image!)}
        >
          {buttonText}
        </button>

        {/* Plan Limits */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '14px' }}>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            PLAN LIMITS
          </div>
          {limits.map((limit, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                marginBottom: '5px'
              }}
            >
              <Check
                size={13}
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  flexShrink: 0,
                  marginTop: '1px'
                }}
              />
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.4'
                }}
              >
                {limit}
              </span>
            </div>
          ))}
        </div>

        {/* Features */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '0.5px',
              color: 'rgba(255, 255, 255, 0.5)',
              textTransform: 'uppercase',
              marginBottom: '8px'
            }}
          >
            FEATURES
          </div>
          {features.map((feature, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                marginBottom: '5px'
              }}
            >
              <Check
                size={13}
                style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  flexShrink: 0,
                  marginTop: '1px'
                }}
              />
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.4'
                }}
              >
                {feature}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Brand Chip Component
function BrandChip({ name }: { name: string }) {
  return (
    <div
      style={{
        padding: '8px 20px',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.6)'
      }}
    >
      {name}
    </div>
  );
}