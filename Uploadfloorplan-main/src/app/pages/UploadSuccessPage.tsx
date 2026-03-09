import { motion } from "motion/react";
import { CheckCircle, Home } from "lucide-react";
import { useNavigate } from "../utils/navigation";
import { useState } from "react";
import Layout from "../components/Layout";
import heroImage from "figma:asset/cbb61108720d04d2ff8d142ee51098e6c2f1f1ef.png"; // Same hero background from home screen

export default function UploadSuccessPage() {
  const navigate = useNavigate();
  const [isReturnHovered, setIsReturnHovered] = useState(false);

  return (
    <Layout>
      {/* Upload Success Overlay - Full Screen */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 5,
          overflow: 'hidden',
          pointerEvents: 'none' // Disable background interaction/scrolling
        }}
      >
        {/* Background Image Layer - Same Hero from Home Screen */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(27px)', // 24-30px range
            transform: 'scale(1.08)', // Prevent blur edge artifacts
            opacity: 0.75, // 70-80% opacity
            zIndex: 0
          }}
        />
        
        {/* Dark Overlay on Top of Background */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#000000',
            opacity: 0.45, // 40-50% opacity
            zIndex: 1,
            mixBlendMode: 'normal'
          }}
        />

        {/* Success Card Container - Centered */}
        <motion.div
          className="flex items-center justify-center"
          style={{
            position: 'absolute',
            left: '0',
            top: '0',
            width: '100%',
            height: '100%',
            zIndex: 10
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {/* Success Card - Glassmorphism */}
          <motion.div
            className="flex flex-col items-center"
            style={{
              width: '520px',
              background: 'rgba(31, 31, 31, 0.88)', // #1F1F1F at 85-90% opacity
              backdropFilter: 'blur(18px)', // 16-20px range
              WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '22px', // 20-24px range
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 8px 24px rgba(0, 0, 0, 0.3)', // Soft shadow for elevation
              padding: '48px 40px',
              pointerEvents: 'auto' // Only the card is interactive
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.28, ease: "easeOut", delay: 0.08 }}
          >
            {/* Success Icon */}
            <motion.div
              className="mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4, ease: "easeOut", delay: 0.2 }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.10)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.25), 0 0 12px rgba(16, 185, 129, 0.15)' // Subtle glow
                }}
              >
                <CheckCircle size={44} style={{ color: '#10B981', opacity: 0.9, filter: 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.4))' }} />
              </div>
            </motion.div>

            {/* Success Title */}
            <h2
              className="font-semibold mb-3"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '28px',
                color: '#FFFFFF',
                letterSpacing: '-0.02em',
                textAlign: 'center'
              }}
            >
              Upload Successful!
            </h2>

            {/* Success Message */}
            <p
              className="font-normal mb-8"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '15px',
                color: '#FFFFFF',
                opacity: 0.7,
                lineHeight: '22px',
                textAlign: 'center',
                maxWidth: '420px'
              }}
            >
              Your floor plan has been uploaded successfully. We're processing your design and will have your room configuration ready shortly.
            </p>

            {/* Processing Status */}
            <div
              className="w-full mb-8"
              style={{
                padding: '20px 24px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '16px'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <p
                  className="font-medium"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: '#FFFFFF',
                    opacity: 0.85
                  }}
                >
                  Processing Status
                </p>
                <span
                  className="font-medium"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: '#10B981',
                    opacity: 0.9
                  }}
                >
                  In Progress
                </span>
              </div>
              
              {/* Progress Bar */}
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <motion.div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #10B981 0%, #34D399 100%)',
                    borderRadius: '3px'
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
                />
              </div>
            </div>

            {/* Next Steps */}
            <div className="w-full mb-6">
              <p
                className="font-medium mb-4"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  color: '#FFFFFF',
                  opacity: 0.7,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                What's Next?
              </p>
              <div className="flex flex-col gap-3">
                <NextStepItem
                  number={1}
                  text="AI analyzes your floor plan layout"
                />
                <NextStepItem
                  number={2}
                  text="Room types and dimensions are identified"
                />
                <NextStepItem
                  number={3}
                  text="Design recommendations are generated"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full">
              <motion.button
                className="font-medium flex-1"
                style={{
                  height: '44px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.10)',
                  borderRadius: '12px',
                  color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  opacity: isReturnHovered ? 0.9 : 0.7,
                  transition: 'all 0.2s ease'
                }}
                onClick={() => navigate('/')}
                onHoverStart={() => setIsReturnHovered(true)}
                onHoverEnd={() => setIsReturnHovered(false)}
                whileHover={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderColor: 'rgba(255, 255, 255, 0.14)'
                }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Home size={18} />
                  <span>Return Home</span>
                </div>
              </motion.button>

              <PrimaryButton text="View Results" onClick={() => navigate('/results')} />
            </div>
          </motion.div>
        </motion.div>
      </div>
    </Layout>
  );
}

// Next Step Item Component
function NextStepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="flex items-center justify-center shrink-0"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)'
        }}
      >
        <span
          className="font-medium"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            color: '#FFFFFF',
            opacity: 0.7
          }}
        >
          {number}
        </span>
      </div>
      <p
        className="font-normal"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          color: '#FFFFFF',
          opacity: 0.75,
          lineHeight: '24px'
        }}
      >
        {text}
      </p>
    </div>
  );
}

// Primary Button Component
function PrimaryButton({ text, onClick }: { text: string; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="font-medium flex-1"
      style={{
        height: '44px',
        background: 'rgba(255, 255, 255, 0.14)',
        border: '1px solid rgba(255, 255, 255, 0.28)',
        borderRadius: '12px',
        color: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        cursor: 'pointer',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isHovered
          ? '0 0 0 0px rgba(255, 255, 255, 0), 0 0 16px 0px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)'
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        transition: 'all 0.2s ease'
      }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        background: 'rgba(255, 255, 255, 0.18)',
        borderColor: 'rgba(255, 255, 255, 0.32)',
        y: -1
      }}
      whileTap={{ scale: 0.98 }}
    >
      {text}
    </motion.button>
  );
}