import { motion } from "motion/react";
import { Search, Star, MoreVertical, Grid3x3, List, Plus } from "lucide-react";
import { useState } from "react";
import Layout from "../components/Layout";
import { useNavigate } from "../utils/navigation";
import heroImage from "figma:asset/cbb61108720d04d2ff8d142ee51098e6c2f1f1ef.png";

// Mock project data
const mockProjects = [
  {
    id: 1,
    name: "HSR Layout",
    rooms: 13,
    thumbnail: null,
    updatedAt: "today",
    isFavorite: false,
    status: "active"
  },
  {
    id: 2,
    name: "Beach House Renovation",
    rooms: 8,
    thumbnail: null,
    updatedAt: "yesterday",
    isFavorite: true,
    status: "active"
  },
  {
    id: 3,
    name: "Hyderabad",
    rooms: 11,
    thumbnail: null,
    updatedAt: "2 days ago",
    isFavorite: false,
    status: "active"
  }
];

type FilterType = "active" | "favorites" | "archived";
type ViewType = "grid" | "list";

export default function DashboardPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("active");
  const [viewType, setViewType] = useState<ViewType>("grid");
  const [projects, setProjects] = useState(mockProjects);

  const toggleFavorite = (projectId: number) => {
    setProjects(projects.map(p => 
      p.id === projectId ? { ...p, isFavorite: !p.isFavorite } : p
    ));
  };

  const filteredProjects = projects.filter(project => {
    // Filter by search query
    if (searchQuery && !project.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    
    // Filter by tab
    if (activeFilter === "favorites" && !project.isFavorite) {
      return false;
    }
    if (activeFilter === "archived" && project.status !== "archived") {
      return false;
    }
    if (activeFilter === "active" && project.status === "archived") {
      return false;
    }
    
    return true;
  });

  return (
    <Layout>
      {/* Blurred Hero Background Image - Bottom Layer */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          zIndex: 0
        }}
      >
        <img
          src={heroImage}
          alt="Interior background"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'blur(42px)',
            transform: 'scale(1.10)',
          }}
        />
      </div>

      {/* Very Subtle Tint Overlay - For Contrast */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          background: '#000000',
          opacity: 0.20,
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Main Content Area - Top Layer */}
      <div
        style={{
          position: 'absolute',
          left: '136px',
          top: '56px',
          right: '64px',
          bottom: '24px',
          overflowY: 'auto',
          overflowX: 'hidden',
          zIndex: 10
        }}
      >
        {/* Header Section */}
        <div style={{ marginBottom: '32px', paddingLeft: '44px', paddingRight: '44px' }}>
          {/* Row 1: Title + New Project Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            {/* Title */}
            <h1
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '32px',
                fontWeight: 600,
                color: 'rgba(255, 255, 255, 0.95)',
                letterSpacing: '-0.5px',
                margin: 0
              }}
            >
              Projects
            </h1>

            {/* New Project Button */}
            <GlassButton
              onClick={() => {
                console.log('Create new project');
                navigate('/');
              }}
            >
              <Plus size={18} />
              <span>New Project</span>
            </GlassButton>
          </div>

          {/* Row 2: Subtitle */}
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.6)',
              letterSpacing: '-0.2px',
              margin: 0,
              marginBottom: '20px'
            }}
          >
            Manage your interior design projects
          </p>

          {/* Row 3: Search + Filter Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Search Input */}
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects..."
            />

            {/* Filter Tabs */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                padding: '4px',
                background: 'rgba(255, 255, 255, 0.03)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px'
              }}
            >
              <FilterTab
                label="Active"
                isActive={activeFilter === "active"}
                onClick={() => setActiveFilter("active")}
              />
              <FilterTab
                label="Favorites"
                isActive={activeFilter === "favorites"}
                onClick={() => setActiveFilter("favorites")}
              />
              <FilterTab
                label="Archived"
                isActive={activeFilter === "archived"}
                onClick={() => setActiveFilter("archived")}
              />
            </div>
          </div>
        </div>

        {/* Project Grid */}
        {filteredProjects.length > 0 ? (
          <div
            style={{
              padding: '44px',
              position: 'relative'
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 370px)',
                columnGap: '32px',
                rowGap: '40px',
                position: 'relative',
                zIndex: 1
              }}
            >
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onFavoriteToggle={() => toggleFavorite(project.id)}
                  onClick={() => {
                    console.log('Navigate to project:', project.id);
                    navigate('/results');
                  }}
                  activeFilter={activeFilter}
                />
              ))}
            </div>
          </div>
        ) : (
          // Empty State
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              gap: '16px'
            }}
          >
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.5)',
                marginBottom: '8px'
              }}
            >
              No projects yet
            </p>
            <GlassButton
              onClick={() => navigate('/')}
            >
              <Plus size={18} />
              <span>Create New Project</span>
            </GlassButton>
          </div>
        )}
      </div>
    </Layout>
  );
}

// Glass Button Component
function GlassButton({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.98 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '10px 20px',
        background: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
        fontWeight: 500,
        cursor: 'pointer',
        outline: 'none',
        boxShadow: isHovered 
          ? '0 0 20px rgba(255, 255, 255, 0.1), 0 4px 12px rgba(0, 0, 0, 0.3)'
          : '0 2px 8px rgba(0, 0, 0, 0.2)',
        transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 0.2s ease'
      }}
    >
      {children}
    </motion.button>
  );
}

// Search Input Component
function SearchInput({ 
  value, 
  onChange, 
  placeholder 
}: { 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  placeholder: string;
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '450px'
      }}
    >
      <Search
        size={16}
        strokeWidth={1.5}
        style={{
          position: 'absolute',
          left: '16px',
          color: isFocused 
            ? 'rgba(255, 255, 255, 0.70)'
            : 'rgba(255, 255, 255, 0.5)',
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'color 0.14s ease-out'
        }}
      />
      <input
        type="text"
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: '44px',
          padding: '0 16px 0 46px',
          background: isFocused 
            ? 'rgba(255, 255, 255, 0.09)'
            : 'rgba(255, 255, 255, 0.06)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: isFocused 
            ? '1px solid rgba(255, 255, 255, 0.10)'
            : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          color: isFocused 
            ? 'rgba(255, 255, 255, 0.95)'
            : 'rgba(255, 255, 255, 0.9)',
          caretColor: 'rgba(255, 255, 255, 1.0)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          fontWeight: 400,
          outline: 'none',
          transition: 'all 0.14s ease-out',
          boxShadow: isFocused 
            ? 'inset 0 1px 6px 0 rgba(255, 255, 255, 0.12), inset 0 -2px 8px 0 rgba(0, 0, 0, 0.18)'
            : 'none'
        }}
      />
      <style>{`
        input::placeholder {
          color: ${isFocused ? 'rgba(255, 255, 255, 0.55)' : 'rgba(255, 255, 255, 0.6)'};
          transition: color 0.14s ease-out;
        }
      `}</style>
    </div>
  );
}

// Filter Tab Component
function FilterTab({ 
  label, 
  isActive, 
  onClick 
}: { 
  label: string; 
  isActive: boolean; 
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: '8px 16px',
        background: isActive 
          ? 'rgba(255, 255, 255, 0.12)'
          : isHovered 
            ? 'rgba(255, 255, 255, 0.05)'
            : 'transparent',
        border: 'none',
        borderRadius: '6px',
        color: isActive 
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.6)',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        fontWeight: 500,
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.15s ease',
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </button>
  );
}

// Project Card Component
function ProjectCard({ 
  project, 
  onFavoriteToggle, 
  onClick,
  activeFilter
}: { 
  project: typeof mockProjects[0]; 
  onFavoriteToggle: () => void;
  onClick: () => void;
  activeFilter: FilterType;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        position: 'relative',
        borderRadius: '16px',
        padding: '16px',
        cursor: 'pointer',
        boxShadow: isHovered 
          ? '0 30px 70px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 255, 255, 0.08)'
          : '0 20px 50px rgba(0, 0, 0, 0.35)',
        transition: 'all 0.2s ease',
        overflow: 'hidden'
      }}
    >
      {/* Transparent Glass Base */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(22px)',
          WebkitBackdropFilter: 'blur(22px)',
          borderRadius: '16px',
          zIndex: 0
        }}
      />

      {/* Subtle Glass Border */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          zIndex: 1,
          pointerEvents: 'none'
        }}
      />

      {/* Glass Light Reflection - Top Ambient Gradient */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '40%',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.18) 0%, rgba(255, 255, 255, 0.08) 40%, rgba(255, 255, 255, 0.03) 70%, rgba(255, 255, 255, 0) 100%)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          mixBlendMode: 'overlay',
          opacity: 0.65,
          filter: 'blur(14px)',
          WebkitFilter: 'blur(14px)',
          zIndex: 1.5,
          pointerEvents: 'none'
        }}
      />

      {/* Top Edge Inner Highlight - Light Catching Glass */}
      <div
        style={{
          position: 'absolute',
          top: '1px',
          left: '1px',
          right: '1px',
          height: '1px',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 100%)',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          opacity: 0.6,
          filter: 'blur(3px)',
          WebkitFilter: 'blur(3px)',
          zIndex: 1.8,
          pointerEvents: 'none'
        }}
      />

      {/* Hover Shimmer Sweep */}
      <motion.div
        initial={{ x: '-100%', opacity: 0 }}
        animate={isHovered ? { 
          x: '280%',
          opacity: [0, 0.7, 0.7, 0]
        } : { 
          x: '-100%',
          opacity: 0
        }}
        transition={{
          duration: 0.7,
          ease: 'easeInOut',
          opacity: {
            duration: 0.7,
            times: [0, 0.3, 0.7, 1]
          }
        }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '40%',
          height: '100%',
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.18) 50%, rgba(255, 255, 255, 0) 100%)',
          transform: 'rotate(15deg)',
          transformOrigin: 'center',
          mixBlendMode: 'overlay',
          filter: 'blur(20px)',
          WebkitFilter: 'blur(20px)',
          zIndex: 1.9,
          pointerEvents: 'none'
        }}
      />

      {/* Content Layer */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {/* Thumbnail Preview - Darker for Readability */}
        <div
          style={{
            width: '100%',
            height: '180px',
            background: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderRadius: '12px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          {project.thumbnail ? (
            <img 
              src={project.thumbnail} 
              alt={project.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Grid3x3 
              size={48} 
              style={{ 
                color: 'rgba(255, 255, 255, 0.3)' 
              }} 
            />
          )}
        </div>

        {/* Project Name */}
        <h3
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            color: '#FFFFFF',
            marginBottom: '12px',
            letterSpacing: '-0.3px'
          }}
        >
          {project.name}
        </h3>

        {/* Tags */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <Tag label="FLOOR PLAN" />
          <Tag label={`${project.rooms} rooms`} />
        </div>

        {/* Updated Status */}
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.65)'
          }}
        >
          Updated {project.updatedAt}
        </div>

        {/* Top Right Actions */}
        <div
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            display: 'flex',
            gap: '8px'
          }}
        >
          <FavoriteButton
            isFavorite={project.isFavorite}
            isFavoritesTabActive={activeFilter === "favorites"}
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle();
            }}
          />
          <IconButton
            icon={<MoreVertical size={16} />}
            onClick={(e) => {
              e.stopPropagation();
              console.log('Open menu for project:', project.id);
            }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// Tag Component
function Tag({ label }: { label: string }) {
  return (
    <div
      style={{
        padding: '4px 10px',
        background: 'rgba(255, 255, 255, 0.08)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '6px',
        fontFamily: 'Inter, sans-serif',
        fontSize: '11px',
        fontWeight: 500,
        color: 'rgba(255, 255, 255, 0.7)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}
    >
      {label}
    </div>
  );
}

// Icon Button Component
function IconButton({ 
  icon, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode; 
  isActive?: boolean; 
  onClick: (e: React.MouseEvent) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isActive 
          ? 'rgba(255, 255, 255, 0.15)'
          : isHovered 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: isActive 
          ? 'rgba(255, 255, 255, 0.95)'
          : 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.15s ease'
      }}
    >
      {icon}
    </motion.button>
  );
}

// Favorite Button Component
function FavoriteButton({ 
  isFavorite, 
  isFavoritesTabActive, 
  onClick 
}: { 
  isFavorite: boolean; 
  isFavoritesTabActive: boolean; 
  onClick: (e: React.MouseEvent) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  // When Favorites tab is active, show yellow filled star
  const shouldShowYellowFilled = isFavoritesTabActive;
  const starColor = shouldShowYellowFilled ? '#FFD60A' : (isFavorite ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.7)');

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      style={{
        width: '32px',
        height: '32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: isFavorite 
          ? 'rgba(255, 255, 255, 0.15)'
          : isHovered 
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        cursor: 'pointer',
        outline: 'none',
        transition: 'all 0.15s ease-in-out'
      }}
    >
      <motion.div
        initial={false}
        animate={shouldShowYellowFilled ? { scale: 1 } : { scale: 1 }}
        transition={{ 
          duration: 0.12, 
          ease: 'easeOut',
          scale: {
            type: 'spring',
            stiffness: 400,
            damping: 25
          }
        }}
        key={shouldShowYellowFilled ? 'filled' : 'outline'}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Star 
          size={16} 
          fill={shouldShowYellowFilled ? '#FFD60A' : (isFavorite ? 'currentColor' : 'none')}
          stroke={shouldShowYellowFilled ? 'none' : 'currentColor'}
          strokeWidth={shouldShowYellowFilled ? 0 : 2}
          style={{ 
            color: starColor,
            transition: 'all 0.15s ease-in-out'
          }}
        />
      </motion.div>
    </motion.button>
  );
}