import { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { MessageCircle, HelpCircle, ArrowLeft, LayoutDashboard, User, CreditCard, FileText, LogOut } from "lucide-react";
import { useNavigate } from "../utils/navigation";
import svgPathsHeader from "../../imports/svg-hpbcnd87a4";
import svgPathsSidebar from "../../imports/svg-ow4sq87dth";
import Sidebar from "../../imports/Sidebar";
import robotIcon from "figma:asset/6854101e0adfcbe57d7b01a404b895b405fd650c.png";

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [avatarPosition, setAvatarPosition] = useState({ top: 0, right: 0 });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileDropdownOpen) {
        setIsProfileDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isProfileDropdownOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isProfileDropdownOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        // Check if click is on avatar (we'll handle that separately)
        const target = e.target as HTMLElement;
        if (!target.closest('[data-avatar-trigger]')) {
          setIsProfileDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isProfileDropdownOpen]);

  return (
    <div 
      className="relative w-[1440px] h-screen overflow-hidden"
      style={{
        background: `
          radial-gradient(
            ellipse 1400px 530px at 50% 13%,
            rgba(74, 38, 14, 0.65) 0%,
            rgba(45, 22, 8, 0.55) 25%,
            rgba(20, 10, 4, 0.45) 45%,
            rgba(0, 0, 0, 0.95) 70%,
            rgba(0, 0, 0, 1) 100%
          ),
          #000000
        `
      }}
    >
      {/* Header - Fixed at top */}
      <Header 
        onAvatarClick={(position) => {
          setAvatarPosition(position);
          setIsProfileDropdownOpen(!isProfileDropdownOpen);
        }}
      />
      
      {/* Sidebar - Fixed on left */}
      <SidebarComponent />
      
      {/* Floating Inbox Icon - Fixed at bottom right */}
      <FloatingInboxIcon />
      
      {/* Main Content - Scrollable content area */}
      <div
        style={{
          position: 'absolute',
          top: '48px',
          left: '0',
          width: '1440px',
          height: 'calc(100vh - 48px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 0
        }}
      >
        {children}
      </div>

      {/* Profile Dropdown - Rendered as overlay at top level */}
      {isProfileDropdownOpen && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          style={{
            position: 'absolute',
            top: `${avatarPosition.top + 10}px`,
            right: `${avatarPosition.right}px`,
            width: '280px',
            background: 'rgba(20, 20, 20, 0.65)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.3)',
            padding: '12px',
            zIndex: 10000
          }}
        >
          {/* User Info Block */}
          <div style={{ marginBottom: '12px' }}>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '2px'
              }}
            >
              Prerna Gouda
            </div>
            <div
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.6)'
              }}
            >
              prernagouda303@gmail.com
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              margin: '12px 0'
            }}
          />

          {/* Menu Items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <ProfileMenuItem
              icon={<LayoutDashboard size={18} />}
              label="Dashboard"
              onClick={() => {
                navigate('/dashboard');
                setIsProfileDropdownOpen(false);
              }}
            />
            <ProfileMenuItem
              icon={<User size={18} />}
              label="Profile"
              onClick={() => {
                console.log('Profile clicked');
                setIsProfileDropdownOpen(false);
              }}
            />
            <ProfileMenuItem
              icon={<CreditCard size={18} />}
              label="Pricing"
              onClick={() => {
                navigate('/pricing');
                setIsProfileDropdownOpen(false);
              }}
            />
            <ProfileMenuItem
              icon={<FileText size={18} />}
              label="Billing & Invoices"
              onClick={() => {
                console.log('Billing clicked');
                setIsProfileDropdownOpen(false);
              }}
            />
          </div>

          {/* Divider */}
          <div
            style={{
              height: '1px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              margin: '12px 0'
            }}
          />

          {/* Sign Out */}
          <ProfileMenuItem
            icon={<LogOut size={18} />}
            label="Sign Out"
            isSignOut
            onClick={() => {
              console.log('Sign out clicked');
              setIsProfileDropdownOpen(false);
            }}
          />
        </motion.div>
      )}
    </div>
  );
}

// Header Component
function Header({ onAvatarClick }: { onAvatarClick: (position: { top: number, right: number }) => void }) {
  return (
    <div 
      className="absolute content-stretch flex flex-col h-[48px] items-start left-0 pb-px pt-[8px] px-[24px] top-0 w-[1440px] z-10" 
      data-name="App"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        boxShadow: '0px 4px 18px rgba(0, 0, 0, 0.15)'
      }}
    >
      <FinanceRouter onAvatarClick={onAvatarClick} />
    </div>
  );
}

// Sidebar Component
function SidebarComponent() {
  return (
    <div 
      className="absolute left-[24px] top-[78px] w-[88px] h-[657px] z-10" 
      data-name="App"
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.19)',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.07)',
        borderRadius: '12px',
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <div style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}>
        <Sidebar />
      </div>
    </div>
  );
}

function FinanceRouter({ onAvatarClick }: { onAvatarClick: (position: { top: number, right: number }) => void }) {
  return (
    <div className="content-stretch flex h-[35px] items-center relative shrink-0 w-full" data-name="FinanceRouter">
      <HeaderContainer onAvatarClick={onAvatarClick} />
    </div>
  );
}

function HeaderContainer({ onAvatarClick }: { onAvatarClick: (position: { top: number, right: number }) => void }) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleBack = () => {
    window.history.back();
  };

  return (
    <div className="flex-[1_0_0] h-[35px] min-h-px min-w-px relative" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-between relative size-full">
        {/* Back Button */}
        <motion.button
          onClick={handleBack}
          onHoverStart={() => setIsHovered(true)}
          onHoverEnd={() => setIsHovered(false)}
          whileTap={{ scale: 0.95 }}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            color: '#6B7280', // Same as avatar icon color
            transition: 'all 150ms ease-out'
          }}
        >
          <div
            style={{
              filter: isHovered ? 'drop-shadow(0 0 6px rgba(107, 114, 128, 0.4))' : 'none',
              transition: 'filter 0.15s ease-out',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ArrowLeft size={20} />
          </div>
        </motion.button>
        
        <HeaderContent onAvatarClick={onAvatarClick} />
      </div>
    </div>
  );
}

function HeaderContent({ onAvatarClick }: { onAvatarClick: (position: { top: number, right: number }) => void }) {
  return (
    <div className="h-[28px] relative shrink-0 w-[114.734px]" data-name="Container">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
        <LogoText />
        <UserAvatar onAvatarClick={onAvatarClick} />
      </div>
    </div>
  );
}

function LogoText() {
  return (
    <div className="flex-[1_0_0] h-[22px] min-h-px min-w-px relative" data-name="Text">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <LogoText1 />
        <LogoText2 />
      </div>
    </div>
  );
}

function LogoText1() {
  return (
    <div className="flex-[1_0_0] h-[22px] min-h-px min-w-px relative" data-name="Text1">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <LogoParagraph />
      </div>
    </div>
  );
}

function LogoParagraph() {
  return (
    <div className="flex-[1_0_0] h-[22px] min-h-px min-w-px relative" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[22px] not-italic relative shrink-0 text-[#ec4899] text-[18px] tracking-[-0.7995px]">tatva</p>
      </div>
    </div>
  );
}

function LogoText2() {
  return (
    <div className="h-[22px] relative shrink-0 w-[38px]" data-name="Text2">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center relative size-full">
        <LogoParagraph1 />
      </div>
    </div>
  );
}

function LogoParagraph1() {
  return (
    <div className="flex-[1_0_0] h-[22px] min-h-px min-w-px relative" data-name="Paragraph">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-start relative size-full">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[22px] not-italic relative shrink-0 text-[#1f2937] text-[18px] tracking-[-0.7995px]">:Ops</p>
      </div>
    </div>
  );
}

function UserAvatar({ onAvatarClick }: { onAvatarClick: (position: { top: number, right: number }) => void }) {
  const avatarRef = useRef<HTMLDivElement>(null);

  const handleClick = () => {
    if (avatarRef.current) {
      const rect = avatarRef.current.getBoundingClientRect();
      const position = {
        top: rect.bottom,
        right: window.innerWidth - rect.right
      };
      onAvatarClick(position);
    }
  };

  return (
    <div 
      ref={avatarRef}
      onClick={handleClick}
      className="relative rounded-[33554400px] shrink-0 size-[28px] cursor-pointer" 
      data-name="PrimitiveSpan"
      data-avatar-trigger
    >
      <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center justify-center overflow-clip relative rounded-[inherit] size-full">
        <AvatarInner />
      </div>
    </div>
  );
}

function AvatarInner() {
  return (
    <div className="bg-[#e5e7eb] relative rounded-[33554400px] shrink-0 size-[28px]" data-name="Text3">
      <div className="bg-clip-padding border-0 border-[transparent] border-solid relative size-full">
        <AvatarIcon />
      </div>
    </div>
  );
}

function AvatarIcon() {
  return (
    <div className="absolute content-stretch flex flex-col items-start left-[6px] size-[16px] top-[6px]" data-name="Icon">
      <AvatarIcon1 />
    </div>
  );
}

function AvatarIcon1() {
  return (
    <div className="h-[16px] overflow-clip relative shrink-0 w-full" data-name="Icon">
      <AvatarIcon2 />
    </div>
  );
}

function AvatarIcon2() {
  return (
    <div className="absolute contents inset-[12.5%_20.83%]" data-name="Icon">
      <div className="absolute inset-[62.5%_20.83%_12.5%_20.83%]" data-name="Vector">
        <div className="absolute inset-[-16.67%_-7.14%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 10.6666 5.33334">
            <path d={svgPathsHeader.p14a7fa00} id="Vector" stroke="var(--stroke-0, #6B7280)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33334" />
          </svg>
        </div>
      </div>
      <div className="absolute inset-[12.5%_33.33%_54.17%_33.33%]" data-name="Vector_2">
        <div className="absolute inset-[-12.5%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6.66664 6.66667">
            <path d={svgPathsHeader.p2d762700} id="Vector_2" stroke="var(--stroke-0, #6B7280)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.33334" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// Floating Inbox Icon - Bottom Right
function FloatingInboxIcon() {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="absolute bottom-[74px] right-[39px] z-[100] flex flex-col items-center">
      {/* Drop-up Menu */}
      <motion.div
        className="flex flex-col gap-[16px] items-center"
        initial={false}
        animate={{
          opacity: isOpen ? 1 : 0,
          y: isOpen ? 0 : 12,
          pointerEvents: isOpen ? 'auto' : 'none'
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        style={{ zIndex: 101, marginBottom: '16px' }}
      >
        {/* Chat with TAVI */}
        <IconOnlyButton 
          icon={<MessageCircle size={22} />}
          onClick={() => {
            console.log("Chat with TAVI clicked");
          }}
        />
        
        {/* Help */}
        <IconOnlyButton 
          icon={<HelpCircle size={22} />}
          onClick={() => {
            console.log("Help clicked");
          }}
        />
      </motion.div>

      {/* Main Robot Launcher - No Circle Container */}
      <ChatbotRobot 
        isHovered={isHovered}
        setIsHovered={setIsHovered}
        onClick={() => setIsOpen(!isOpen)}
      />
    </div>
  );
}

// Chatbot Robot Component with Blinking Eyes
function ChatbotRobot({ 
  isHovered, 
  setIsHovered,
  onClick 
}: { 
  isHovered: boolean;
  setIsHovered: (value: boolean) => void;
  onClick: () => void;
}) {
  return (
    <motion.button
      className="cursor-pointer flex items-center justify-center"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        outline: 'none',
        position: 'relative'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      animate={{
        y: isHovered ? 0 : [-6, 0, -6],
        scale: isHovered ? 1.05 : 1.0
      }}
      transition={{
        y: {
          duration: 4,
          ease: "easeInOut",
          repeat: Infinity,
          repeatType: "loop"
        },
        scale: {
          duration: 0.25,
          ease: "easeOut"
        }
      }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Robot Image */}
      <img 
        src={robotIcon} 
        alt="Robot" 
        style={{
          width: '84px',
          height: '84px',
          display: 'block',
          filter: isHovered ? 'drop-shadow(0 0 30px rgba(255, 255, 255, 0.18))' : 'none',
          transition: 'filter 0.25s ease-out'
        }}
      />
    </motion.button>
  );
}

// Icon-Only Button Component for Drop-up Menu
function IconOnlyButton({ 
  icon, 
  onClick 
}: { 
  icon: React.ReactNode; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      className="cursor-pointer flex items-center justify-center"
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        outline: 'none',
        color: 'rgba(255, 255, 255, 0.8)'
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      animate={{
        scale: isHovered ? 1.1 : 1.0
      }}
      transition={{
        duration: 0.2,
        ease: "easeOut"
      }}
      whileTap={{ scale: 0.95 }}
    >
      {icon}
    </motion.button>
  );
}

// Profile Menu Item Component
function ProfileMenuItem({ 
  icon, 
  label, 
  onClick,
  isSignOut = false
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
  isSignOut?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="flex items-center gap-[12px] cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 12px',
        borderRadius: '6px',
        backgroundColor: isHovered 
          ? (isSignOut ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.05)') 
          : 'transparent',
        transition: 'background 0.15s ease'
      }}
    >
      <div
        style={{
          color: isSignOut ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
          display: 'flex',
          alignItems: 'center',
          transition: 'color 0.15s ease'
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 500,
          color: isSignOut ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.85)',
          transition: 'color 0.15s ease'
        }}
      >
        {label}
      </div>
    </div>
  );
}