import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Image as ImageIcon, LayoutGrid, Upload, X, FileText, Loader2 } from "lucide-react";
import { useNavigate } from "../utils/navigation";
import heroImage from "figma:asset/cbb61108720d04d2ff8d142ee51098e6c2f1f1ef.png";
import Layout from "../components/Layout";

export default function HomePage() {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <Layout>
      {/* Scrollable Content Container */}
      <div 
        className="absolute left-0 w-[1440px] overflow-y-auto overflow-x-hidden"
        style={{
          top: '0',
          height: '100%',
          zIndex: 0,
          overflowY: isUploadModalOpen ? 'hidden' : 'auto'
        }}
      >
        {/* Hero Background */}
        <div style={{ height: '100vh', position: 'relative' }}>
          <HeroSection />
          {/* Black Overlay */}
          <BlackOverlay />
          {/* Text Overlay */}
          <TextOverlay onOpenUploadModal={() => setIsUploadModalOpen(true)} />
        </div>
        
        {/* Footer - In scroll flow */}
        <Footer />
      </div>

      {/* Upload Floor Plan Modal */}
      <UploadFloorPlanModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          // Small delay to let modal close animation complete
          setTimeout(() => {
            navigate('/upload-success');
          }, 300);
        }}
      />
    </Layout>
  );
}

// Hero Section - Main Content Area
function HeroSection() {
  return (
    <div 
      className="absolute left-0 top-0 w-[1440px] overflow-hidden z-0" 
      data-name="HeroBackground"
      style={{
        height: '100vh',
        backgroundImage: `url(${heroImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        opacity: 1,
        imageRendering: 'high-quality',
        transform: 'scale(1)',
        WebkitFontSmoothing: 'antialiased',
        filter: 'contrast(1.08) brightness(1.02) saturate(1.03)'
      }}
    />
  );
}

// Black Overlay - Separate layer covering entire background
function BlackOverlay() {
  return (
    <div 
      className="absolute inset-0"
      data-name="BlackOverlay"
      style={{
        backgroundColor: '#000000',
        opacity: 0.35,
        pointerEvents: 'none'
      }}
    />
  );
}

// Text Overlay - Happy Space Style (Centered with Full Overlay)
function TextOverlay({ onOpenUploadModal }: { onOpenUploadModal: () => void }) {
  return (
    <div 
      className="absolute z-[5]"
      data-name="TextOverlay"
      style={{
        left: '0',
        top: '0',
        width: '1440px',
        height: '100vh',
        pointerEvents: 'none'
      }}
    >
      {/* Hero Text Group - ABOVE overlay, text is selectable */}
      <div 
        className="absolute flex flex-col items-center justify-center"
        data-name="HeroTextGroup"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% - 22px))',
          width: '100%',
          maxWidth: '1200px',
          pointerEvents: 'auto'
        }}
      >
        {/* Subline */}
        <p 
          className="font-medium text-center mb-11"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            color: '#F4F0E6',
            opacity: 0.8,
            userSelect: 'text'
          }}
        >
          Let Your Soul Find Its
        </p>

        {/* Main title with focus corners - Centered */}
        <div className="mb-12 flex items-baseline justify-center gap-4">
          <h1 
            className="font-semibold"
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '102px',
              color: '#F4F0E6',
              lineHeight: '1',
              userSelect: 'text'
            }}
          >
            Happy
          </h1>
          <div className="relative">
            <h1 
              className="font-semibold"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '102px',
                color: '#F4F0E6',
                lineHeight: '1',
                userSelect: 'text'
              }}
            >
              Space
            </h1>
            {/* Focus corners around "Space" only */}
            <FocusCornersCentered />
          </div>
        </div>

        {/* Supporting text - Three items centered horizontally */}
        <div className="flex gap-20 justify-center items-start mb-10">
          <div className="font-medium text-center" style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', lineHeight: '26px', color: '#F4F0E6', opacity: 0.75, userSelect: 'text' }}>
            <p>Creating</p>
            <p>modern</p>
          </div>
          <div className="font-medium text-center" style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', lineHeight: '26px', color: '#F4F0E6', opacity: 0.75, userSelect: 'text' }}>
            <p>timeless interiors</p>
            <p>that blend</p>
          </div>
          <div className="font-medium text-center" style={{ fontFamily: 'Inter, sans-serif', fontSize: '20px', lineHeight: '26px', color: '#F4F0E6', opacity: 0.75, userSelect: 'text' }}>
            <p>comfort, beauty,</p>
            <p>and purpose</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="flex gap-4 justify-center items-center mb-10 mt-[40px]">
          <ActionCard 
            icon={<LayoutGrid size={20} />}
            title="Room Configuration"
            description="Define room types, sizes, and layout preferences"
          />
          <ActionCard 
            icon={<Upload size={20} />}
            title="Upload Floor Plan"
            description="Upload your floor plan to get started"
            onClick={onOpenUploadModal}
          />
        </div>

        {/* Website URL */}
        <p 
          className="font-medium text-center"
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            letterSpacing: '2px',
            color: '#F4F0E6',
            opacity: 0.7,
            marginTop: '40px',
            userSelect: 'text'
          }}
        >
          www.tatvaops.com
        </p>
      </div>
    </div>
  );
}

// Focus Corners Component - Animated continuously (always on)
function FocusCornersCentered() {
  const cornerSize = 18;
  const strokeWidth = 2;
  const offset = -16; // Distance from text
  
  // Continuous pulse animation configuration - ENHANCED for visibility
  const pulseAnimation = {
    scale: [1, 1.10, 1],
    opacity: [0.7, 1, 0.7]
  };
  
  const pulseTransition = {
    duration: 3.6,
    repeat: Infinity,
    ease: "easeInOut"
  };
  
  return (
    <>
      {/* Top Left Corner */}
      <motion.svg
        className="absolute"
        style={{
          top: `${offset}px`,
          left: `${offset}px`,
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          originX: 1,
          originY: 1
        }}
        animate={{
          ...pulseAnimation,
          x: [0, 1.5, 0],
          y: [0, 1.5, 0]
        }}
        transition={pulseTransition}
      >
        <path
          d={`M ${cornerSize} 0 L 0 0 L 0 ${cornerSize}`}
          stroke="#F4F0E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </motion.svg>

      {/* Top Right Corner */}
      <motion.svg
        className="absolute"
        style={{
          top: `${offset}px`,
          right: `${offset}px`,
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          originX: 0,
          originY: 1
        }}
        animate={{
          ...pulseAnimation,
          x: [0, -1.5, 0],
          y: [0, 1.5, 0]
        }}
        transition={pulseTransition}
      >
        <path
          d={`M 0 0 L ${cornerSize} 0 L ${cornerSize} ${cornerSize}`}
          stroke="#F4F0E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </motion.svg>

      {/* Bottom Left Corner */}
      <motion.svg
        className="absolute"
        style={{
          bottom: `${offset}px`,
          left: `${offset}px`,
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          originX: 1,
          originY: 0
        }}
        animate={{
          ...pulseAnimation,
          x: [0, 1.5, 0],
          y: [0, -1.5, 0]
        }}
        transition={pulseTransition}
      >
        <path
          d={`M 0 0 L 0 ${cornerSize} L ${cornerSize} ${cornerSize}`}
          stroke="#F4F0E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </motion.svg>

      {/* Bottom Right Corner */}
      <motion.svg
        className="absolute"
        style={{
          bottom: `${offset}px`,
          right: `${offset}px`,
          width: `${cornerSize}px`,
          height: `${cornerSize}px`,
          originX: 0,
          originY: 0
        }}
        animate={{
          ...pulseAnimation,
          x: [0, -1.5, 0],
          y: [0, -1.5, 0]
        }}
        transition={pulseTransition}
      >
        <path
          d={`M ${cornerSize} 0 L ${cornerSize} ${cornerSize} L 0 ${cornerSize}`}
          stroke="#F4F0E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
      </motion.svg>
    </>
  );
}

// Action Card Component
function ActionCard({ 
  icon, 
  title, 
  description,
  onClick
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  onClick?: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  return (
    <motion.div
      className="relative cursor-pointer flex flex-col items-center"
      style={{
        width: '244px',
        height: '200px',
        borderRadius: '14px',
        background: isHovered 
          ? 'rgba(255, 255, 255, 0.10)' 
          : 'rgba(255, 255, 255, 0.06)',
        border: `1px solid ${isHovered 
          ? 'rgba(255, 255, 255, 0.24)' 
          : 'rgba(255, 255, 255, 0.12)'}`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        paddingTop: '28px',
        paddingBottom: '28px',
        paddingLeft: '22px',
        paddingRight: '22px',
        transition: 'all 0.2s ease-out',
        userSelect: 'none',
        boxShadow: isHovered 
          ? '0 8px 32px rgba(0, 0, 0, 0.18)' 
          : '0 4px 16px rgba(0, 0, 0, 0.08)'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      animate={{
        scale: isHovered ? 1.02 : 1.0
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Icon - Centered */}
      <div 
        className="mb-2 flex justify-center items-center"
        style={{
          color: '#FFFFFF',
          opacity: 0.8
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <h3 
        className="font-semibold mb-1"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          lineHeight: '18px',
          color: '#FFFFFF',
          letterSpacing: '-0.02em',
          textAlign: 'center'
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p 
        className="font-normal"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          lineHeight: '14px',
          color: '#FFFFFF',
          opacity: 0.6,
          letterSpacing: '-0.01em',
          marginBottom: '18px',
          textAlign: 'center'
        }}
      >
        {description}
      </p>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Get Started Button - Centered */}
      <motion.button
        className="font-medium"
        style={{
          width: '120px',
          height: '36px',
          paddingLeft: '14px',
          paddingRight: '14px',
          borderRadius: '10px',
          background: isButtonHovered 
            ? 'rgba(255, 255, 255, 0.16)' 
            : 'rgba(255, 255, 255, 0.12)',
          border: 'none',
          color: '#FFFFFF',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s ease'
        }}
        onHoverStart={() => setIsButtonHovered(true)}
        onHoverEnd={() => setIsButtonHovered(false)}
        whileTap={{ scale: 0.96 }}
        onClick={onClick}
      >
        Get Started
      </motion.button>
    </motion.div>
  );
}

// Footer Component
function Footer() {
  return (
    <div 
      className="w-[1440px] flex items-center justify-between px-[32px]"
      style={{
        height: '56px',
        background: '#1a1a1a',
      }}
    >
      {/* Copyright - Left */}
      <p 
        className="font-normal"
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#9ca3af',
          userSelect: 'none'
        }}
      >
        © 2026 TatvaOps. All rights reserved.
      </p>

      {/* Links - Right */}
      <div className="flex items-center gap-[24px]">
        <FooterLink text="Privacy Policy" />
        <FooterLink text="About Us" />
        <FooterLink text="Terms & Conditions" />
        <FooterLink text="Contact Us" />
      </div>
    </div>
  );
}

// Footer Link Component
function FooterLink({ text }: { text: string }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <a
      className="font-normal cursor-pointer"
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        color: isHovered ? '#d1d5db' : '#9ca3af',
        textDecoration: 'none',
        transition: 'color 0.2s ease',
        userSelect: 'none'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => console.log(`${text} clicked`)}
    >
      {text}
    </a>
  );
}

// Upload Floor Plan Modal Component
function UploadFloorPlanModal({ 
  isOpen, 
  onClose,
  onSuccess
}: { 
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [projectName, setProjectName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isDropzoneHovered, setIsDropzoneHovered] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; type: string } | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showCheckmark, setShowCheckmark] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!uploadedFile && !isUploading) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!uploadedFile && !isUploading) {
      const files = e.dataTransfer.files;
      if (files && files[0]) {
        handleFileSelect(files[0]);
      }
    }
  };

  const handleFileSelect = (file: File) => {
    setUploadedFile({
      name: file.name,
      size: file.size,
      type: file.type
    });
    setUploadError(null);
  };

  const handleReplaceFile = () => {
    setUploadedFile(null);
    setUploadError(null);
    setUploadProgress(0);
    setShowCheckmark(false);
    document.getElementById('floor-plan-upload')?.click();
  };

  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setShowCheckmark(false);
    
    // Simulate upload progress with intervals
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        const next = prev + 5;
        if (next >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return next;
      });
    }, 100);
    
    // Simulate upload completion
    setTimeout(() => {
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Wait for ring completion, then show checkmark
      setTimeout(() => {
        setShowCheckmark(true);
        setIsUploading(false);
        
        // Hide checkmark after 800ms and navigate
        setTimeout(() => {
          setShowCheckmark(false);
          
          setTimeout(() => {
            onSuccess(); // Navigate to upload success page
            // Reset states after navigation
            setTimeout(() => {
              setUploadedFile(null);
              setProjectName('');
              setUploadProgress(0);
              setUploadError(null);
            }, 300);
          }, 200);
        }, 800);
      }, 300);
    }, 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* BlurBackdrop - Full-screen overlay with blur */}
          <motion.div
            className="fixed inset-0 z-[100]"
            data-name="BlurBackdrop"
            style={{
              background: 'rgba(0, 0, 0, 0.18)',
              backdropFilter: 'blur(22px)',
              WebkitBackdropFilter: 'blur(22px)'
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
          />

          {/* Modal Card + External Buttons Container */}
          <div className="fixed inset-0 z-[101] flex flex-col items-center justify-center pointer-events-none">
            {/* Modal Card */}
            <motion.div
              className="pointer-events-auto"
              data-name="UploadFloorPlanModal"
              style={{
                width: '520px',
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.19)',
                borderRadius: '24px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.24)',
                padding: '32px',
                pointerEvents: isUploading ? 'none' : 'auto',
                opacity: isUploading ? 0.6 : 1,
                transition: 'opacity 0.2s ease'
              }}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Close Button */}
              <div className="flex items-center justify-between mb-2">
                <h2 
                  className="font-semibold"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '24px',
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em'
                  }}
                >
                  Upload Floor Plan
                </h2>
                <button
                  className="cursor-pointer flex items-center justify-center"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    outline: 'none',
                    color: '#FFFFFF',
                    opacity: 0.7,
                    transition: 'opacity 0.2s ease'
                  }}
                  onClick={onClose}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
                >
                  <X size={24} />
                </button>
              </div>

              {/* Subtitle */}
              <p 
                className="font-normal mb-6"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  color: '#FFFFFF',
                  opacity: 0.6,
                  lineHeight: '20px'
                }}
              >
                Add your floor plan to generate room-wise design options.
              </p>

              {/* Upload Dropzone */}
              <AnimatePresence mode="wait">
                {!uploadedFile ? (
                  <motion.div
                    key="dropzone"
                    className="mb-4 flex flex-col items-center justify-center"
                    style={{
                      height: '140px',
                      border: `${isDragging || isDropzoneHovered ? '1px solid rgba(255, 255, 255, 0.35)' : '2px dashed rgba(255, 255, 255, 0.2)'}`,
                      borderRadius: '16px',
                      background: isDragging || isDropzoneHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                      cursor: 'pointer',
                      boxShadow: isDragging || isDropzoneHovered 
                        ? '0 0 0 0px rgba(255, 255, 255, 0), 0 0 18px 0px rgba(255, 255, 255, 0.25)' 
                        : 'none'
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('floor-plan-upload')?.click()}
                    onMouseEnter={() => setIsDropzoneHovered(true)}
                    onMouseLeave={() => setIsDropzoneHovered(false)}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      borderColor: isDragging || isDropzoneHovered ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.2)',
                      backgroundColor: isDragging || isDropzoneHovered ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.02)'
                    }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Upload size={32} style={{ color: '#FFFFFF', opacity: 0.4, marginBottom: '12px' }} />
                    <p 
                      className="font-medium mb-1"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        color: '#FFFFFF',
                        opacity: 0.8
                      }}
                    >
                      Drag & drop your file here, or <span style={{ textDecoration: 'underline' }}>Browse</span>
                    </p>
                    <p 
                      className="font-normal"
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        color: '#FFFFFF',
                        opacity: 0.5
                      }}
                    >
                      Supported: PDF, JPG, PNG (max 10MB)
                    </p>
                    <input
                      id="floor-plan-upload"
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileSelect(file);
                        }
                      }}
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="file-preview"
                    className="mb-4 flex flex-col items-center justify-center"
                    style={{
                      minHeight: '140px',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      borderRadius: '16px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      padding: '28px 20px'
                    }}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.18 }}
                  >
                    {/* File Icon with Progress Ring */}
                    <div className="relative flex items-center justify-center" style={{ marginBottom: '10px' }}>
                      {/* Progress Ring & Checkmark - Visible during upload and completion */}
                      <AnimatePresence>
                        {(isUploading || showCheckmark) && (
                          <CircularProgressRing 
                            progress={uploadProgress} 
                            size={54} 
                            strokeWidth={2.5}
                            hasError={uploadError !== null}
                            showCheckmark={showCheckmark}
                          />
                        )}
                      </AnimatePresence>
                      
                      {/* Percentage Text - Only visible during upload */}
                      <AnimatePresence>
                        {isUploading && uploadProgress < 100 && (
                          <motion.p
                            className="absolute font-medium"
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              color: '#FFFFFF',
                              opacity: 0.75,
                              pointerEvents: 'none',
                              zIndex: 2
                            }}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15, ease: "easeInOut" }}
                          >
                            {uploadProgress}%
                          </motion.p>
                        )}
                      </AnimatePresence>
                      
                      {/* File Icon - Static in center, hidden when checkmark is showing */}
                      <motion.div
                        animate={{ 
                          opacity: showCheckmark ? 0 : 1,
                          scale: showCheckmark ? 0.8 : 1
                        }}
                        transition={{ duration: 0.15, ease: "easeInOut" }}
                      >
                        {uploadedFile.type.includes('pdf') ? (
                          <FileText size={30} style={{ color: '#E5E7EB', opacity: 0.7 }} />
                        ) : (
                          <ImageIcon size={30} style={{ color: '#E5E7EB', opacity: 0.7 }} />
                        )}
                      </motion.div>
                    </div>
                    
                    {/* File Info Container */}
                    <div className="flex flex-col items-center w-full" style={{ maxWidth: '100%' }}>
                      {/* File Name - Multi-line with line clamp */}
                      <p 
                        className="font-medium mb-1 text-center"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          color: '#FFFFFF',
                          opacity: 0.92,
                          maxWidth: '100%',
                          width: '100%',
                          paddingLeft: '12px',
                          paddingRight: '12px',
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: '19px',
                          wordBreak: 'break-word'
                        }}
                      >
                        {uploadedFile.name}
                      </p>
                      
                      {/* Error Message - Inline below file name */}
                      <AnimatePresence>
                        {uploadError && (
                          <motion.p
                            className="font-normal mb-2 text-center"
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '11px',
                              color: '#F87171',
                              opacity: 0.9,
                              lineHeight: '14px'
                            }}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {uploadError}
                          </motion.p>
                        )}
                      </AnimatePresence>
                      
                      {/* File Size - Secondary text */}
                      <p 
                        className="font-normal mb-4"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '11px',
                          color: '#FFFFFF',
                          opacity: 0.48,
                          lineHeight: '14px'
                        }}
                      >
                        {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      
                      {/* Replace File Link */}
                      <button
                        className="font-medium cursor-pointer"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          color: '#FFFFFF',
                          opacity: 0.65,
                          textDecoration: 'none',
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          transition: 'all 0.2s ease',
                          alignSelf: 'center'
                        }}
                        onClick={handleReplaceFile}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '0.95';
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.65';
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        Replace file
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Project Name Input */}
              <div>
                <label 
                  className="font-medium mb-2 block"
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    color: '#FFFFFF',
                    opacity: 0.7
                  }}
                >
                  Project Name (Optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                  className="w-full"
                  disabled={isUploading}
                  style={{
                    height: '40px',
                    padding: '0 14px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '10px',
                    color: '#FFFFFF',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                />
              </div>
            </motion.div>

            {/* External Action Buttons - Below Modal */}
            <motion.div
              className="pointer-events-auto flex items-center justify-between"
              style={{
                marginTop: '20px',
                width: '520px'
              }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: "easeOut", delay: 0.05 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cancel Button - Secondary/Ghost Style */}
              <CancelButton onClick={onClose} disabled={isUploading} />
              
              {/* Upload & Continue Button - Primary Style */}
              <UploadButton 
                onClick={handleUpload}
                isLoading={isUploading}
                disabled={!uploadedFile || isUploading}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

// Cancel Button Component - Secondary/Ghost Style
function CancelButton({ onClick }: { onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="font-medium cursor-pointer"
      style={{
        height: '44px',
        paddingLeft: '24px',
        paddingRight: '24px',
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        borderRadius: '12px',
        color: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity: isHovered ? 0.9 : 0.7
      }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{
        background: 'rgba(255, 255, 255, 0.06)',
        borderColor: 'rgba(255, 255, 255, 0.14)'
      }}
      whileTap={{ scale: 0.98 }}
    >
      Cancel
    </motion.button>
  );
}

// Upload Button Component - Primary CTA Style with Loading State
function UploadButton({ onClick, isLoading, disabled }: { onClick: () => void, isLoading: boolean, disabled: boolean }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="font-medium flex items-center justify-center gap-2"
      style={{
        height: '44px',
        paddingLeft: '28px',
        paddingRight: '28px',
        background: disabled && !isLoading ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.14)',
        border: disabled && !isLoading ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(255, 255, 255, 0.28)',
        borderRadius: '12px',
        color: '#FFFFFF',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        transition: 'all 0.2s ease',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        boxShadow: isHovered && !disabled
          ? '0 0 0 0px rgba(255, 255, 255, 0), 0 0 16px 0px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.15)' 
          : '0 2px 8px rgba(0, 0, 0, 0.1)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled && !isLoading ? 0.5 : 1
      }}
      onClick={disabled ? undefined : onClick}
      onHoverStart={() => !disabled && setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={!disabled ? {
        background: 'rgba(255, 255, 255, 0.18)',
        borderColor: 'rgba(255, 255, 255, 0.32)',
        y: -1
      } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
      disabled={disabled}
    >
      {isLoading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <Loader2 size={18} style={{ color: '#FFFFFF' }} />
          </motion.div>
          <span>Uploading…</span>
        </>
      ) : (
        'Upload & Continue'
      )}
    </motion.button>
  );
}

// CircularProgressRing Component
function CircularProgressRing({ 
  progress, 
  size, 
  strokeWidth,
  hasError,
  showCheckmark
}: { 
  progress: number; 
  size: number; 
  strokeWidth: number;
  hasError: boolean;
  showCheckmark: boolean;
}) {
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.svg
      className="absolute"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: 'rotate(-90deg)',
        left: '50%',
        top: '50%',
        marginLeft: `-${size / 2}px`,
        marginTop: `-${size / 2}px`
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: showCheckmark ? 0.95 : 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {/* Background ring - low opacity */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255, 255, 255, 0.12)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress arc - higher opacity */}
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
          stroke: hasError ? '#F87171' : 'rgba(255, 255, 255, 0.70)'
        }}
        transition={{ 
          strokeDashoffset: { duration: 0.3, ease: "easeInOut" },
          stroke: { duration: 0.2 }
        }}
        style={{
          strokeDasharray: circumference
        }}
      />
      {/* Checkmark - visible when showCheckmark is true */}
      <AnimatePresence>
        {showCheckmark && (
          <motion.g
            style={{
              transform: 'rotate(90deg)',
              transformOrigin: 'center'
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
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
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}