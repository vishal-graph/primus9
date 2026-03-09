import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[] | string[];
  placeholder?: string;
  disabled?: boolean;
  showStylePreview?: boolean;
  showMoodPreview?: boolean;
  showColorPalettePreview?: boolean;
  showAccentColorPreview?: boolean;
}

export function CustomDropdown({ value, onChange, options, placeholder = 'Select...', disabled = false, showStylePreview = false, showMoodPreview = false, showColorPalettePreview = false, showAccentColorPreview = false }: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });

  // Normalize options to handle both string[] and object[]
  const normalizedOptions = options.map(opt => 
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );

  // Get selected option label
  const selectedOption = normalizedOptions.find(opt => opt.value === value);
  const displayText = selectedOption ? selectedOption.label : placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const updatePosition = () => {
        const rect = triggerRef.current!.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  // Style preview data
  const stylePreviewData: Record<string, {
    tagline: string;
    palette: string[];
    characteristics: string[];
    bestFor: string;
    imageUrl: string;
  }> = {
    'Modern Minimal': {
      tagline: 'Clean lines, uncluttered elegance',
      palette: ['#F5F5F5', '#E0E0E0', '#424242', '#1A1A1A', '#FFFFFF'],
      characteristics: ['Neutral tones with open layouts', 'Hidden storage & minimal decor'],
      bestFor: 'Urban apartments, open-plan living',
      imageUrl: 'https://images.unsplash.com/photo-1609081144289-eacc3108cd03?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2hpdGUlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg2Mjc1fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Contemporary': {
      tagline: 'Current trends, sleek sophistication',
      palette: ['#FFFFFF', '#2C3E50', '#95A5A6', '#E67E22', '#34495E'],
      characteristics: ['Mix of textures and materials', 'Bold accent pieces with curved lines'],
      bestFor: 'Modern homes seeking current style',
      imageUrl: 'https://images.unsplash.com/photo-1757924461488-ef9ad0670978?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBsaXZpbmclMjByb29tJTIwbGF5ZXJlZCUyMGludGVyaW9yJTIwZGVzaWdufGVufDF8fHx8MTc3MTU4NjI2N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Scandinavian': {
      tagline: 'Cozy, functional, naturally bright',
      palette: ['#FFFFFF', '#F0EDE5', '#8B9D83', '#4A5859', '#D9CFC1'],
      characteristics: ['Light wood tones & white walls', 'Natural textiles and hygge comfort'],
      bestFor: 'Small spaces, natural light lovers',
      imageUrl: 'https://images.unsplash.com/photo-1722248242689-c9d5bbed810f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBicmlnaHQlMjB3aGl0ZSUyMHdvb2QlMjBjb3p5JTIwbGl2aW5nfGVufDF8fHx8MTc3MTU4NjI2N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Industrial': {
      tagline: 'Raw materials, urban edge',
      palette: ['#2C2C2C', '#707070', '#B87333', '#1A1A1A', '#8B6914'],
      characteristics: ['Exposed brick, metal & concrete', 'Open beams with factory fixtures'],
      bestFor: 'Lofts, warehouse conversions',
      imageUrl: 'https://images.unsplash.com/photo-1768195341542-318a0f03eb70?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbG9mdCUyMGJyaWNrJTIwbWV0YWwlMjBpbnRlcmlvciUyMHJvb218ZW58MXx8fHwxNzcxNTg2MjY4fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Japandi': {
      tagline: 'Japanese + Scandinavian harmony',
      palette: ['#F5F5F5', '#D4C5B9', '#5F7367', '#2A2A2A', '#A8997A'],
      characteristics: ['Wabi-sabi with minimalism', 'Natural materials and low furniture'],
      bestFor: 'Zen seekers, balanced aesthetics',
      imageUrl: 'https://images.unsplash.com/photo-1766330977451-de1b64b5e641?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmRpJTIwaW50ZXJpb3IlMjByb29tJTIwbWluaW1hbCUyMHdvb2QlMjBuYXR1cmFsfGVufDF8fHx8MTc3MTU4Nzg5OHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Luxury Classic': {
      tagline: 'Timeless opulence, refined grandeur',
      palette: ['#F8F6F0', '#D4AF37', '#8B4513', '#1C1C1C', '#C9B037'],
      characteristics: ['Rich fabrics like velvet & silk', 'Ornate details with chandeliers'],
      bestFor: 'Formal spaces, traditional elegance',
      imageUrl: 'https://images.unsplash.com/photo-1759774310455-80dba1348cbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjbGFzc2ljJTIwaW50ZXJpb3IlMjByb29tJTIwY2hhbmRlbGllciUyMHZlbHZldCUyMHRyYWRpdGlvbmFsfGVufDF8fHx8MTc3MTU4NzkwMHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Neo-Classical': {
      tagline: 'Classical beauty meets modern simplicity',
      palette: ['#FFFFFF', '#E8DCC4', '#8B7355', '#3E3E3E', '#C9B99B'],
      characteristics: ['Symmetry with clean proportions', 'Marble and refined finishes'],
      bestFor: 'Sophisticated formal rooms',
      imageUrl: 'https://images.unsplash.com/photo-1750920363086-dffa7cabd934?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9jbGFzc2ljYWwlMjBpbnRlcmlvciUyMHJvb20lMjBtYXJibGUlMjBzeW1tZXRyeSUyMGNvbHVtbnN8ZW58MXx8fHwxNzcxNTg3OTAwfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Bohemian': {
      tagline: 'Eclectic layers, free-spirited warmth',
      palette: ['#D4A574', '#8B4789', '#228B22', '#CD853F', '#9B6B47'],
      characteristics: ['Mixed patterns and global textiles', 'Plants and handcrafted pieces'],
      bestFor: 'Creative spaces, relaxed vibes',
      imageUrl: 'https://images.unsplash.com/photo-1627257057525-8e9f442b0fef?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2hlbWlhbiUyMGVjbGVjdGljJTIwY29sb3JmdWwlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg2MjY5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Rustic': {
      tagline: 'Natural charm, countryside comfort',
      palette: ['#DEB887', '#8B4513', '#556B2F', '#2F4F4F', '#A0826D'],
      characteristics: ['Reclaimed wood and stone', 'Earthy colors with vintage elements'],
      bestFor: 'Cabins, farmhouse-style homes',
      imageUrl: 'https://images.unsplash.com/photo-1727707185480-a50e6090b58c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydXN0aWMlMjBpbnRlcmlvciUyMHJvb20lMjB3b29kJTIwc3RvbmUlMjBjYWJpbiUyMGZpcmVwbGFjZXxlbnwxfHx8fDE3NzE1ODc5MDV8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Mid-Century Modern': {
      tagline: 'Retro cool, timeless simplicity',
      palette: ['#F4A460', '#008B8B', '#D2691E', '#2F4F4F', '#CD853F'],
      characteristics: ['Tapered legs and organic curves', 'Wood mix with bold colors'],
      bestFor: 'Retro lovers, classic modern homes',
      imageUrl: 'https://images.unsplash.com/photo-1763616310410-e99ff5723ca2?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWQlMjBjZW50dXJ5JTIwbW9kZXJuJTIwbGl2aW5nJTIwcm9vbSUyMGludGVyaW9yJTIwcmV0cm8lMjBmdXJuaXR1cmV8ZW58MXx8fHwxNzcxNTg3OTA2fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Minimalist': {
      tagline: 'Essential simplicity, pure clarity',
      palette: ['#FFFFFF', '#F5F5F5', '#E8E8E8', '#CCCCCC', '#999999'],
      characteristics: ['Only the essentials, no clutter', 'Monochrome palette with clean surfaces'],
      bestFor: 'Small spaces, clarity seekers',
      imageUrl: 'https://images.unsplash.com/photo-1721069275326-5fd80e01ce8d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2hpdGUlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjB3aWRlJTIwYW5nbGV8ZW58MXx8fHwxNzcxNTg3ODk0fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Modern Contemporary': {
      tagline: 'Now refined, sleek and stylish',
      palette: ['#2C2C2C', '#FFFFFF', '#7F8C8D', '#BDC3C7', '#34495E'],
      characteristics: ['Bold architectural lines', 'Statement furniture with tech integration'],
      bestFor: 'Urban professionals, modern estates',
      imageUrl: 'https://images.unsplash.com/photo-1541085929911-dea736e9287b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb250ZW1wb3JhcnklMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjBmdXJuaXR1cmV8ZW58MXx8fHwxNzcxNTg3ODk0fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Transitional': {
      tagline: 'Traditional meets modern balance',
      palette: ['#F5F5DC', '#8B7D6B', '#4A4A4A', '#D2B48C', '#FFFFFF'],
      characteristics: ['Classic silhouettes with modern fabrics', 'Neutral colors bridging old and new'],
      bestFor: 'Versatile homes, timeless appeal',
      imageUrl: 'https://images.unsplash.com/photo-1696413542101-2479dd479982?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFuc2l0aW9uYWwlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjBkZXNpZ24lMjBibGVuZHxlbnwxfHx8fDE3NzE1ODc4OTV8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Art Deco': {
      tagline: 'Bold geometry, luxurious glamour',
      palette: ['#1C1C1C', '#D4AF37', '#006B76', '#E6E6E6', '#8B4513'],
      characteristics: ['Geometric patterns and metallic accents', 'Rich velvets with mirrored surfaces'],
      bestFor: 'Statement rooms, vintage glamour',
      imageUrl: 'https://images.unsplash.com/photo-1699538976492-b6105009d197?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBkZWNvJTIwaW50ZXJpb3IlMjByb29tJTIwZ2VvbWV0cmljJTIwbHV4dXJ5fGVufDF8fHx8MTc3MTU4Nzg5NXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Mediterranean': {
      tagline: 'Sun-kissed warmth, coastal elegance',
      palette: ['#E4C9A8', '#8B6914', '#4682B4', '#F5DEB3', '#D2691E'],
      characteristics: ['Terracotta tiles and arched doorways', 'Warm earth tones with blue accents'],
      bestFor: 'Sunny climates, vacation vibes',
      imageUrl: 'https://images.unsplash.com/photo-1759603087811-774825289c9c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGVycmFuZWFuJTIwaW50ZXJpb3IlMjByb29tJTIwdGVycmFjb3R0YSUyMGFyY2hlc3xlbnwxfHx8fDE3NzE1ODc4OTZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Scandinavian Modern': {
      tagline: 'Nordic simplicity, warm minimalism',
      palette: ['#FFFFFF', '#F7F3EE', '#B8A68F', '#5A6D7A', '#E8DDD1'],
      characteristics: ['Natural light maximization', 'Functional design with cozy textiles'],
      bestFor: 'Cold climates, hygge enthusiasts',
      imageUrl: 'https://images.unsplash.com/photo-1661099548731-fc8f74fc9dd9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjB3b29kJTIwYnJpZ2h0fGVufDF8fHx8MTc3MTU4Nzg5Nnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Tropical': {
      tagline: 'Lush paradise, vibrant life',
      palette: ['#2D5016', '#F4E4C1', '#8FBC8F', '#D2691E', '#228B22'],
      characteristics: ['Bold botanical prints and natural fibers', 'Rattan furniture with tropical plants'],
      bestFor: 'Warm climates, nature lovers',
      imageUrl: 'https://images.unsplash.com/photo-1760067538299-3f58e7a99fc5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMGludGVyaW9yJTIwcm9vbSUyMHBsYW50cyUyMHJhdHRhbiUyMGZ1cm5pdHVyZXxlbnwxfHx8fDE3NzE1ODc4OTh8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Coastal': {
      tagline: 'Breezy relaxation, ocean-inspired calm',
      palette: ['#F0F8FF', '#87CEEB', '#F5F5DC', '#D2B48C', '#4682B4'],
      characteristics: ['Light blues and sandy neutrals', 'Natural textures with nautical touches'],
      bestFor: 'Beach homes, casual living',
      imageUrl: 'https://images.unsplash.com/photo-1766007062051-94250e5be2d0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwbGl2aW5nJTIwcm9vbSUyMGludGVyaW9yJTIwYmx1ZSUyMHdoaXRlJTIwbmF1dGljYWx8ZW58MXx8fHwxNzcxNTg3ODk4fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Urban Industrial': {
      tagline: 'City grit, raw sophistication',
      palette: ['#1C1C1C', '#6B6B6B', '#8B4513', '#D4AF37', '#2F4F4F'],
      characteristics: ['Exposed utilities and raw concrete', 'Metal accents with Edison bulbs'],
      bestFor: 'City lofts, edgy aesthetics',
      imageUrl: 'https://images.unsplash.com/photo-1693143781070-461c9132d2ae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGluZHVzdHJpYWwlMjBsb2Z0JTIwaW50ZXJpb3IlMjBleHBvc2VkJTIwYnJpY2slMjBjb25jcmV0ZXxlbnwxfHx8fDE3NzE1ODc4OTh8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Japandi Soft': {
      tagline: 'Gentle fusion, serene harmony',
      palette: ['#F8F6F2', '#E5DDD1', '#9FA89A', '#3E4A3D', '#C9BAA8'],
      characteristics: ['Soft textures and muted earth tones', 'Low-profile furniture with organic shapes'],
      bestFor: 'Peaceful retreats, mindful living',
      imageUrl: 'https://images.unsplash.com/photo-1698675610962-2e4ee6a71d31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmRpJTIwbWluaW1hbGlzdCUyMGxpdmluZyUyMHJvb20lMjBpbnRlcmlvciUyMHNvZnQlMjBuZXV0cmFsfGVufDF8fHx8MTc3MTU4NzkxMHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Contemporary Luxe': {
      tagline: 'Modern opulence, refined extravagance',
      palette: ['#1A1A1A', '#F5F5F5', '#C9B037', '#8B7D7B', '#E8E8E8'],
      characteristics: ['High-end materials with clean lines', 'Designer pieces with smart home tech'],
      bestFor: 'Luxury condos, upscale homes',
      imageUrl: 'https://images.unsplash.com/photo-1760072513442-9872656c1b07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBsdXh1cnklMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjBtb2Rlcm4lMjBlbGVnYW50fGVufDF8fHx8MTc3MTU4Nzg5OXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Classic European': {
      tagline: 'Old-world charm, timeless refinement',
      palette: ['#F5E6D3', '#8B7355', '#4A3C2E', '#D4AF37', '#FFFFFF'],
      characteristics: ['Ornate moldings and rich fabrics', 'Antique furniture with fine details'],
      bestFor: 'Historic homes, traditional taste',
      imageUrl: 'https://images.unsplash.com/photo-1639950265589-c7002e35d4ec?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwZXVyb3BlYW4lMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjBhbnRpcXVlJTIwZnVybml0dXJlfGVufDF8fHx8MTc3MTU4NzkwMXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Wabi-Sabi': {
      tagline: 'Imperfect beauty, authentic simplicity',
      palette: ['#E8E3DB', '#C9B8A4', '#8B7D6B', '#5C5248', '#F5F0E8'],
      characteristics: ['Natural imperfections celebrated', 'Organic materials with aged patina'],
      bestFor: 'Mindful spaces, rustic charm',
      imageUrl: 'https://images.unsplash.com/photo-1589163045730-40797c5cdc6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWJpJTIwc2FiaSUyMGludGVyaW9yJTIwcm9vbSUyMG5hdHVyYWwlMjB0ZXh0dXJlJTIwb3JnYW5pY3xlbnwxfHx8fDE3NzE1ODc5MDF8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'High-Tech Modern': {
      tagline: 'Future-forward, sleek innovation',
      palette: ['#0A0A0A', '#E8E8E8', '#4A90E2', '#7F8C8D', '#FFFFFF'],
      characteristics: ['Smart automation and LED lighting', 'Glossy surfaces with minimalist tech'],
      bestFor: 'Tech enthusiasts, modern penthouses',
      imageUrl: 'https://images.unsplash.com/photo-1758978029829-fa7c9ee89fce?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmdXR1cmlzdGljJTIwbW9kZXJuJTIwbGl2aW5nJTIwcm9vbSUyMHNtYXJ0JTIwbGlnaHRpbmclMjBMRUQlMjBzbGVlayUyMGdsYXNzJTIwbWV0YWwlMjBoaWdoJTIwY2VpbGluZyUyMGNpdHklMjB2aWV3fGVufDF8fHx8MTc3MTU4ODI5N3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Eclectic': {
      tagline: 'Curated chaos, personal expression',
      palette: ['#E63946', '#F1C40F', '#2A9D8F', '#E76F51', '#264653'],
      characteristics: ['Mix of eras and global influences', 'Bold colors with unique statement pieces'],
      bestFor: 'Creative souls, collectors',
      imageUrl: 'https://images.unsplash.com/photo-1631509824910-82791a0e43d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY2xlY3RpYyUyMGxpdmluZyUyMHJvb20lMjBpbnRlcmlvciUyMG1peGVkJTIwcGF0dGVybnMlMjBjb2xvcmZ1bHxlbnwxfHx8fDE3NzE1ODc5MDN8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Traditional Indian': {
      tagline: 'Rich heritage, vibrant culture',
      palette: ['#D4AF37', '#8B0000', '#FF8C00', '#4B0082', '#FFD700'],
      characteristics: ['Intricate carvings and vibrant textiles', 'Brass accents with traditional patterns'],
      bestFor: 'Cultural homes, heritage spaces',
      imageUrl: 'https://images.unsplash.com/photo-1739028393313-29482fdc6622?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGluZGlhbiUyMGludGVyaW9yJTIwcm9vbSUyMGNhcnZlZCUyMHdvb2QlMjBicmFzcyUyMHZpYnJhbnR8ZW58MXx8fHwxNzcxNTg3OTA0fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Modern Indian': {
      tagline: 'Contemporary fusion, ethnic refinement',
      palette: ['#8B4513', '#F5DEB3', '#4A5D23', '#CD853F', '#2F4F4F'],
      characteristics: ['Modern silhouettes with ethnic touches', 'Subtle patterns with handcrafted elements'],
      bestFor: 'Urban Indian homes, fusion style',
      imageUrl: 'https://images.unsplash.com/photo-1561024173-e6caebe6ddc3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbmRpYW4lMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3IlMjB3b29kZW4lMjBmdXJuaXR1cmUlMjBicmFzcyUyMGFjY2VudHMlMjBldGhuaWMlMjBwYXR0ZXJucyUyMHdhcm0lMjBsaWdodGluZyUyMG5ldXRyYWwlMjB3YWxsc3xlbnwxfHx8fDE3NzE1ODc5MDR8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Farmhouse Modern': {
      tagline: 'Country charm, contemporary comfort',
      palette: ['#FFFFFF', '#E8E4D9', '#8B7D6B', '#5D4E37', '#F5F5DC'],
      characteristics: ['Shiplap walls with modern fixtures', 'Rustic wood with clean-lined furniture'],
      bestFor: 'Suburban homes, country living',
      imageUrl: 'https://images.unsplash.com/photo-1770625468009-71c90199d5e0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtaG91c2UlMjBtb2Rlcm4lMjBpbnRlcmlvciUyMHJvb20lMjBzaGlwbGFwJTIwd29vZCUyMGNsZWFufGVufDF8fHx8MTc3MTU4NzkwNXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Zen Inspired': {
      tagline: 'Tranquil balance, mindful space',
      palette: ['#F5F5F0', '#C8C8A9', '#7A8450', '#4A5D23', '#E8E8DD'],
      characteristics: ['Natural elements and water features', 'Minimal clutter with meditation corners'],
      bestFor: 'Wellness spaces, peaceful homes',
      imageUrl: 'https://images.unsplash.com/photo-1764776502723-cd26790363b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx6ZW4lMjBpbnRlcmlvciUyMHJvb20lMjBwZWFjZWZ1bCUyMG1lZGl0YXRpb24lMjBuYXR1cmFsJTIwbWluaW1hbGlzdHxlbnwxfHx8fDE3NzE1ODc5MDZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Luxury Penthouse': {
      tagline: 'Sky-high elegance, ultimate prestige',
      palette: ['#1A1A1A', '#F8F8F8', '#C9B037', '#8B7D7B', '#4A4A4A'],
      characteristics: ['Floor-to-ceiling windows with city views', 'Premium materials and custom designs'],
      bestFor: 'High-rise living, luxury estates',
      imageUrl: 'https://images.unsplash.com/photo-1565623833408-d77e39b88af6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZW50aG91c2UlMjBpbnRlcmlvciUyMHJvb20lMjBjaXR5JTIwdmlldyUyMGZsb29yJTIwY2VpbGluZyUyMHdpbmRvd3N8ZW58MXx8fHwxNzcxNTg3OTA3fDA&ixlib=rb-4.1.0&q=80&w=1080'
    }
  };

  // Mood preview data
  const moodPreviewData: Record<string, {
    tagline: string;
    palette: string[];
    vibeDescription: string[];
    imageUrl: string;
  }> = {
    'Calm & Relaxing': {
      tagline: 'Peaceful tranquility, soothing comfort',
      palette: ['#E8EBF3', '#C4CDD9', '#8FA0B3', '#5A6D85'],
      vibeDescription: ['Soft neutrals with gentle blues', 'Minimalist decor and natural light'],
      imageUrl: 'https://images.unsplash.com/photo-1758703317915-10e085f42bc1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwcmVsYXhpbmclMjBzZXJlbmUlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg2NjQ4fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Energetic & Vibrant': {
      tagline: 'Bold energy, dynamic atmosphere',
      palette: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF'],
      vibeDescription: ['Bright pops of saturated colors', 'Lively patterns and statement pieces'],
      imageUrl: 'https://images.unsplash.com/photo-1621373660651-081fc7f94fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmVyZ2V0aWMlMjB2aWJyYW50JTIwY29sb3JmdWwlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTU4NjY0OHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Warm & Cozy': {
      tagline: 'Inviting warmth, intimate comfort',
      palette: ['#D4A574', '#B8956A', '#8B7355', '#6B5744'],
      vibeDescription: ['Rich earth tones and warm woods', 'Soft textiles and ambient lighting'],
      imageUrl: 'https://images.unsplash.com/photo-1724862170073-e575594b42bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJtJTIwY296eSUyMGxpdmluZyUyMHJvb20lMjB0aHJvdyUyMGJsYW5rZXRzJTIwZWFydGglMjB0b25lcyUyMGFtYmllbnQlMjBsaWdodGluZ3xlbnwxfHx8fDE3NzE1OTAwMTV8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Cool & Fresh': {
      tagline: 'Crisp air, refreshing clarity',
      palette: ['#E0F4FF', '#A7D7F0', '#7FBDE0', '#5399C6'],
      vibeDescription: ['Clean whites with cool blue accents', 'Airy spaces and natural ventilation'],
      imageUrl: 'https://images.unsplash.com/photo-1622763846204-5d0bf5031e06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb29sJTIwZnJlc2glMjBicmlnaHQlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg2NjQ5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Elegant & Sophisticated': {
      tagline: 'Refined grace, timeless poise',
      palette: ['#F5F5F5', '#C9C0BB', '#8B7E74', '#3E3832'],
      vibeDescription: ['Muted tones with metallic accents', 'Curated art and designer furniture'],
      imageUrl: 'https://images.unsplash.com/photo-1757262798623-a215e869d708?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwc29waGlzdGljYXRlZCUyMGx1eHVyeSUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcxNTg2NjQ5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Playful & Fun': {
      tagline: 'Joyful spirit, creative freedom',
      palette: ['#FFB5E8', '#FFEC9E', '#B4E7CE', '#AEC6FF'],
      vibeDescription: ['Whimsical colors and unique shapes', 'Eclectic mix with personality'],
      imageUrl: 'https://images.unsplash.com/photo-1758687126595-edcb2bdf03bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5ZnVsJTIwZnVuJTIwY29sb3JmdWwlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTU4NjY0OXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Professional': {
      tagline: 'Polished efficiency, clean authority',
      palette: ['#F8F8F8', '#C4C4C4', '#6B7280', '#374151'],
      vibeDescription: ['Neutral tones with structured lines', 'Organized spaces and purposeful design'],
      imageUrl: 'https://images.unsplash.com/photo-1765371514743-45bd8e6c0a28?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBtb2Rlcm4lMjBvZmZpY2UlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTU4Njk5Mnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Luxurious': {
      tagline: 'Opulent indulgence, lavish beauty',
      palette: ['#F5E6D3', '#D4AF37', '#8B7355', '#2C2416'],
      vibeDescription: ['Rich materials and sumptuous textures', 'Statement pieces with refined details'],
      imageUrl: 'https://images.unsplash.com/photo-1611094016919-36b65678f3d6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cmlvdXMlMjBvcHVsZW50JTIwbGl2aW5nJTIwcm9vbSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTU4Njk5Mnww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Serene': {
      tagline: 'Gentle stillness, peaceful harmony',
      palette: ['#F5F5F0', '#D9DCD6', '#A8B5A4', '#7A8876'],
      vibeDescription: ['Soft natural tones with gentle light', 'Calm surfaces and uncluttered spaces'],
      imageUrl: 'https://images.unsplash.com/photo-1616046913255-344e75b5a21d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZXJlbmUlMjBsaXZpbmclMjByb29tJTIwd2lkZSUyMGFuZ2xlJTIwYmVpZ2UlMjBzb2ZhJTIwbmF0dXJhbCUyMGxpZ2h0JTIwbmV1dHJhbCUyMGludGVyaW9yfGVufDF8fHx8MTc3MTU4OTg1NXww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Moody & Dramatic': {
      tagline: 'Intense depth, atmospheric shadows',
      palette: ['#1A1A1A', '#3E3E3E', '#6B5B4C', '#8B7355'],
      vibeDescription: ['Dark tones with dramatic lighting', 'Rich textures and moody ambiance'],
      imageUrl: 'https://images.unsplash.com/photo-1765893576852-1a7e762405f9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb29keSUyMGRyYW1hdGljJTIwZGFyayUyMGludGVyaW9yJTIwcm9vbSUyMGxpZ2h0aW5nfGVufDF8fHx8MTc3MTU4ODQyN3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Minimal & Quiet': {
      tagline: 'Silent simplicity, pure essence',
      palette: ['#FFFFFF', '#F5F5F5', '#E0E0E0', '#CCCCCC'],
      vibeDescription: ['Monochrome palette with clean lines', 'Empty spaces and essential forms'],
      imageUrl: 'https://images.unsplash.com/photo-1767720580810-58be50f89bf8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwcXVpZXQlMjBzaW1wbGUlMjBsaXZpbmclMjByb29tJTIwd2hpdGV8ZW58MXx8fHwxNzcxNTg4NDI3fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Bold & Expressive': {
      tagline: 'Confident statements, vivid personality',
      palette: ['#E63946', '#F1C40F', '#9B59B6', '#3498DB'],
      vibeDescription: ['Saturated colors and strong contrasts', 'Artistic pieces with visual impact'],
      imageUrl: 'https://images.unsplash.com/photo-1729482436140-8190b963379d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2xkJTIwZXhwcmVzc2l2ZSUyMGNvbG9yZnVsJTIwaW50ZXJpb3IlMjByb29tJTIwc3RhdGVtZW50fGVufDF8fHx8MTc3MTU4ODQyN3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Earthy & Organic': {
      tagline: 'Natural grounding, raw authenticity',
      palette: ['#8B7355', '#A89078', '#D4C5B9', '#5C4A3A'],
      vibeDescription: ['Natural materials and earthy tones', 'Organic textures with tactile warmth'],
      imageUrl: 'https://images.unsplash.com/photo-1761330439252-325f2091e88d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aHklMjBvcmdhbmljJTIwbmF0dXJhbCUyMG1hdGVyaWFscyUyMGxpdmluZyUyMHJvb20lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzE1ODg0Mjd8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Bright & Airy': {
      tagline: 'Luminous openness, weightless freedom',
      palette: ['#FFFFFF', '#F8F9FA', '#E9ECEF', '#DEE2E6'],
      vibeDescription: ['Abundant natural light and white surfaces', 'Open layouts with flowing space'],
      imageUrl: 'https://images.unsplash.com/photo-1767050321604-a2654be8fad0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlnaHQlMjBhaXJ5JTIwd2hpdGUlMjBsaXZpbmclMjByb29tJTIwbGFyZ2UlMjB3aW5kb3dzfGVufDF8fHx8MTc3MTU4ODQyOHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Dark & Luxe': {
      tagline: 'Sumptuous shadows, refined indulgence',
      palette: ['#1C1C1C', '#2C2416', '#8B7355', '#D4AF37'],
      vibeDescription: ['Deep tones with metallic highlights', 'Plush materials and dramatic elegance'],
      imageUrl: 'https://images.unsplash.com/photo-1759774310455-80dba1348cbd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbHV4dXJpb3VzJTIwaW50ZXJpb3IlMjByb29tJTIwZWxlZ2FudCUyMHNvcGhpc3RpY2F0ZWR8ZW58MXx8fHwxNzcxNTg4NDI4fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Artistic & Creative': {
      tagline: 'Imaginative flair, cultural expression',
      palette: ['#E76F51', '#F4A261', '#E9C46A', '#2A9D8F'],
      vibeDescription: ['Curated art and unique objects', 'Eclectic mix with creative energy'],
      imageUrl: 'https://images.unsplash.com/photo-1749703977772-4008c36ba7c9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3RpYyUyMGNyZWF0aXZlJTIwZWNsZWN0aWMlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg4NDI5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Monochrome Modern': {
      tagline: 'Graphic clarity, timeless contrast',
      palette: ['#000000', '#FFFFFF', '#808080', '#D3D3D3'],
      vibeDescription: ['Black and white with sharp definition', 'Clean geometry and minimal color'],
      imageUrl: 'https://images.unsplash.com/photo-1764010533326-c6916f3d6252?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25vY2hyb21lJTIwbW9kZXJuJTIwYmxhY2slMjB3aGl0ZSUyMGludGVyaW9yJTIwcm9vbXxlbnwxfHx8fDE3NzE1ODg0Mjl8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Nature Inspired': {
      tagline: 'Botanical vitality, verdant life',
      palette: ['#2D5016', '#5A7A3D', '#8FBC8F', '#C8D5B9'],
      vibeDescription: ['Abundant plants and natural greenery', 'Organic shapes with fresh energy'],
      imageUrl: 'https://images.unsplash.com/photo-1758594617513-091b6ca66652?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaXZpbmclMjByb29tJTIwcGxhbnRzJTIwbmF0dXJhbCUyMGxpZ2h0JTIwd29vZGVuJTIwZnVybml0dXJlJTIwaW5kb29yJTIwZ3JlZW5lcnl8ZW58MXx8fHwxNzcxNTkwMzAxfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Urban Chic': {
      tagline: 'Metropolitan edge, cosmopolitan style',
      palette: ['#2C2C2C', '#5A5A5A', '#B8B8B8', '#E5E5E5'],
      vibeDescription: ['Industrial materials with refined finishes', 'City-inspired and effortlessly cool'],
      imageUrl: 'https://images.unsplash.com/photo-1681684565407-01d2933ed16f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGNoaWMlMjBjb250ZW1wb3JhcnklMjBsb2Z0JTIwaW50ZXJpb3IlMjByb29tfGVufDF8fHx8MTc3MTU4ODQzMHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Soft & Romantic': {
      tagline: 'Delicate grace, tender warmth',
      palette: ['#FFE4E1', '#F8C8DC', '#E6D5E8', '#D4C5F9'],
      vibeDescription: ['Pastel hues and gentle textures', 'Flowing fabrics with feminine charm'],
      imageUrl: 'https://images.unsplash.com/photo-1707299231603-6c0a93e0f7fa?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwcm9tYW50aWMlMjBwYXN0ZWwlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg4NDMxfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Industrial Edge': {
      tagline: 'Raw grit, urban authenticity',
      palette: ['#3E3E3E', '#707070', '#B87333', '#D4A574'],
      vibeDescription: ['Exposed structures and metal accents', 'Unfinished materials with character'],
      imageUrl: 'https://images.unsplash.com/photo-1601222191345-42076bff7a90?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwbG9mdCUyMGludGVyaW9yJTIwYnJpY2slMjBtZXRhbCUyMGZ1cm5pdHVyZSUyMGNvbXBsZXRlJTIwcm9vbXxlbnwxfHx8fDE3NzE1OTAzNzZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Scandinavian Calm': {
      tagline: 'Nordic serenity, hygge comfort',
      palette: ['#FFFFFF', '#F0EDE5', '#D9CFC1', '#B8A68F'],
      vibeDescription: ['Light wood and soft neutrals', 'Cozy textiles with functional beauty'],
      imageUrl: 'https://images.unsplash.com/photo-1661885546898-11ebd4ce29e9?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBjYWxtJTIwYnJpZ2h0JTIwd29vZCUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcxNTg4NDMyfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Contemporary Elegant': {
      tagline: 'Modern refinement, polished grace',
      palette: ['#F5F5F5', '#E8E8E8', '#C9B037', '#8B7D7B'],
      vibeDescription: ['Sleek lines with luxurious materials', 'Designer details and sophisticated touches'],
      imageUrl: 'https://images.unsplash.com/photo-1760072513442-9872656c1b07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBlbGVnYW50JTIwbW9kZXJuJTIwbHV4dXJ5JTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NzE1ODg0MzJ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'High Energy': {
      tagline: 'Dynamic pulse, invigorating spirit',
      palette: ['#FF4757', '#FFA502', '#1E90FF', '#2ED573'],
      vibeDescription: ['Vivid colors and bold patterns', 'Active atmosphere with visual excitement'],
      imageUrl: 'https://images.unsplash.com/photo-1670222783941-c1bee0e32c85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaWdoJTIwZW5lcmd5JTIwdmlicmFudCUyMGJvbGQlMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg4NDMyfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Spa-Like': {
      tagline: 'Restorative calm, wellness retreat',
      palette: ['#E8F4F8', '#B8D4D8', '#8FB9BF', '#6A9BA5'],
      vibeDescription: ['Soothing tones and natural elements', 'Zen aesthetics with tranquil balance'],
      imageUrl: 'https://images.unsplash.com/photo-1764445274424-47bbc216073b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjBsaWtlJTIwdHJhbnF1aWwlMjB6ZW4lMjBsaXZpbmclMjByb29tJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxNTg4NDMzfDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Heritage Inspired': {
      tagline: 'Timeless tradition, cultural richness',
      palette: ['#8B4513', '#D4AF37', '#8B0000', '#4A3C2E'],
      vibeDescription: ['Classic patterns and heirloom pieces', 'Historical references with authentic charm'],
      imageUrl: 'https://images.unsplash.com/photo-1770386114935-e4077a6b2b72?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoZXJpdGFnZSUyMGluc3BpcmVkJTIwdHJhZGl0aW9uYWwlMjBjbGFzc2ljJTIwaW50ZXJpb3IlMjByb29tfGVufDF8fHx8MTc3MTU4ODQzM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Vibrant Fusion': {
      tagline: 'Cultural blend, energetic harmony',
      palette: ['#E74C3C', '#F39C12', '#16A085', '#8E44AD'],
      vibeDescription: ['Global influences and mixed patterns', 'Colorful layers with eclectic soul'],
      imageUrl: 'https://images.unsplash.com/photo-1631509824910-82791a0e43d1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWJyYW50JTIwZnVzaW9uJTIwY29sb3JmdWwlMjBldGhuaWMlMjBwYXR0ZXJucyUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcxNTg4NDM0fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Premium Executive': {
      tagline: 'Corporate prestige, professional luxury',
      palette: ['#1A1A1A', '#4A4A4A', '#C9B037', '#E8E8E8'],
      vibeDescription: ['High-end finishes and executive presence', 'Refined sophistication with authority'],
      imageUrl: 'https://images.unsplash.com/photo-1734937743443-a50fff0c0b40?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxleGVjdXRpdmUlMjBwcm9mZXNzaW9uYWwlMjBsdXh1cnklMjBvZmZpY2UlMjBpbnRlcmlvciUyMG1vZGVybnxlbnwxfHx8fDE3NzE1ODg0Mzl8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Game': {
      tagline: 'High-energy immersive environment',
      palette: ['#0A0A0A', '#4A00E0', '#00D4FF', '#8E2DE2'],
      vibeDescription: ['RGB lighting and neon accents', 'Tech-focused gaming setup with dynamic glow'],
      imageUrl: 'https://images.unsplash.com/photo-1670960612763-1b05cb98c39b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlc3BvcnRzJTIwZ2FtaW5nJTIwcm9vbSUyMGNvbXBsZXRlJTIwaW50ZXJpb3IlMjB3aWRlfGVufDF8fHx8MTc3MTU5MDIxNHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Soft Girl': {
      tagline: 'Gentle, cozy, dreamy vibe',
      palette: ['#FFD6E8', '#F9E6E1', '#E6D5F5', '#F5E8D8'],
      vibeDescription: ['Pastel hues and plush textures', 'Delicate decor with cozy comfort'],
      imageUrl: 'https://images.unsplash.com/photo-1600494448655-ae58f58bb945?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwcGFzdGVsJTIwYmVkcm9vbSUyMGNvenklMjBwaW5rJTIwY3JlYW0lMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzE1ODg3ODZ8MA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    'Aesthetic': {
      tagline: 'Visually pleasing curated space',
      palette: ['#E8DCC4', '#C9B99B', '#A8B5A4', '#D9CFC1'],
      vibeDescription: ['Balanced composition and natural light', 'Instagram-worthy minimal styling'],
      imageUrl: 'https://images.unsplash.com/photo-1705326701287-346fc37a2c86?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBsaXZpbmclMjByb29tJTIwY3JlYW0lMjBzb2ZhJTIwcGxhbnRzJTIwbmF0dXJhbCUyMGxpZ2h0JTIwY3VyYXRlZCUyMGRlY29yfGVufDF8fHx8MTc3MTU4OTUyM3ww&ixlib=rb-4.1.0&q=80&w=1080'
    }
  };

  // Color Palette preview data
  const colorPalettePreviewData: Record<string, {
    title: string;
    description: string;
    colors: string[];
  }> = {
    'Neutral (White, Beige, Gray)': {
      title: 'Neutral Palette',
      description: 'Timeless whites, beiges & soft grays',
      colors: ['#F5F5F5', '#E8E5DC', '#D4D4D4', '#A3A3A3', '#8B8680', '#525252']
    },
    'Monochromatic': {
      title: 'Monochromatic',
      description: 'Single hue with tonal variations',
      colors: ['#E5E5E5', '#C4C4C4', '#B8B8B8', '#8A8A8A', '#737373', '#404040']
    },
    'Earth Tones': {
      title: 'Earth Tones',
      description: 'Warm browns, terracotta & natural hues',
      colors: ['#D4A574', '#C19A6B', '#A67C52', '#8B6F47', '#7A5C3E', '#6B5D3F']
    },
    'Pastels': {
      title: 'Pastel Palette',
      description: 'Soft pinks, blues, yellows & lavenders',
      colors: ['#FAD2E1', '#FDE2E4', '#BEE1E6', '#F0E68C', '#E6D5F5', '#DDA0DD']
    },
    'Dark & Moody': {
      title: 'Dark & Moody',
      description: 'Deep blacks, charcoals & midnight tones',
      colors: ['#2C2C2C', '#242424', '#1F1F1F', '#191919', '#141414', '#0A0A0A']
    },
    'Bright & Bold': {
      title: 'Bright & Bold',
      description: 'Vibrant reds, teals, yellows & greens',
      colors: ['#FF6B6B', '#FF8E53', '#4ECDC4', '#45B7D1', '#FFE66D', '#A8E6CF']
    }
  };

  // Accent Color preview data
  const accentColorPreviewData: Record<string, {
    title: string;
    description: string;
    colors: string[];
  }> = {
    'Gold/Brass': {
      title: 'Gold/Brass Accents',
      description: 'Warm metallic golds & polished brass tones',
      colors: ['#D4AF37', '#C6A75E', '#B8941F', '#AA8F3D', '#9A7D2E', '#8B7534']
    },
    'Navy Blue': {
      title: 'Navy Blue Accents',
      description: 'Deep ocean blues & rich navy hues',
      colors: ['#1E40AF', '#1F3A8A', '#1E3A8A', '#1D4ED8', '#172554', '#1E3A5F']
    },
    'Emerald Green': {
      title: 'Emerald Green Accents',
      description: 'Lush emeralds & vibrant forest greens',
      colors: ['#047857', '#065F46', '#059669', '#10B981', '#065F46', '#047857']
    },
    'Terracotta': {
      title: 'Terracotta Accents',
      description: 'Warm terracotta & burnt orange tones',
      colors: ['#9A3412', '#7C2D12', '#C2410C', '#EA580C', '#B45309', '#92400E']
    },
    'Blush Pink': {
      title: 'Blush Pink Accents',
      description: 'Soft blush pinks & rosy mauve tones',
      colors: ['#EC4899', '#F472B6', '#F9A8D4', '#FBCFE8', '#F0ABFC', '#E879F9']
    },
    'Deep Purple': {
      title: 'Deep Purple Accents',
      description: 'Rich purples & luxurious violet hues',
      colors: ['#6B21A8', '#581C87', '#7C3AED', '#8B5CF6', '#9333EA', '#A855F7']
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%'
      }}
    >
      {/* Trigger Input */}
      <div
        ref={triggerRef}
        onClick={() => {
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        style={{
          position: 'relative',
          width: '100%',
          background: '#111',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '10px',
          padding: '14px 16px',
          color: value ? '#FFFFFF' : '#aaa',
          fontFamily: 'Inter, sans-serif',
          fontSize: '14px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          outline: 'none',
          transition: 'background 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          opacity: disabled ? 0.5 : 1,
          userSelect: 'none'
        }}
      >
        <span>{displayText}</span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: 'rgba(255, 255, 255, 0.6)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease-out'
          }} 
        />
      </div>

      {/* Dropdown Menu - Portal rendered at root level */}
      {isOpen && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '260px',
            overflowY: 'auto',
            background: '#0F0F10',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '12px',
            padding: '8px',
            boxShadow: '0px 12px 40px rgba(0, 0, 0, 0.6)',
            zIndex: 1000,
            animation: 'dropdownSlideIn 200ms ease-out'
          }}
          className="custom-dropdown-scrollbar"
        >
          <style>{`
            @keyframes dropdownSlideIn {
              from {
                opacity: 0;
                transform: translateY(-4px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }

            .custom-dropdown-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-dropdown-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-dropdown-scrollbar::-webkit-scrollbar-thumb {
              background: rgba(255, 255, 255, 0.1);
              border-radius: 3px;
            }
            .custom-dropdown-scrollbar::-webkit-scrollbar-thumb:hover {
              background: rgba(255, 255, 255, 0.15);
            }
          `}</style>
          {normalizedOptions.map(option => (
            <div
              key={option.value}
              onClick={() => handleSelect(option.value)}
              style={{
                height: '40px',
                padding: '0 16px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: value === option.value ? '#FFFFFF' : '#E5E5E5',
                backgroundColor: value === option.value ? 'rgba(255, 255, 255, 0.06)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 120ms ease',
                display: 'flex',
                alignItems: 'center',
                position: 'relative',
                borderLeft: value === option.value ? '2px solid rgba(255, 255, 255, 0.6)' : '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (showStylePreview) {
                  setHoveredStyle(option.value);
                }
                if (showMoodPreview) {
                  setHoveredMood(option.value);
                }
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = '#1C1C1C';
                  e.currentTarget.style.color = '#FFFFFF';
                }
              }}
              onMouseLeave={(e) => {
                if (showStylePreview) {
                  setHoveredStyle(null);
                }
                if (showMoodPreview) {
                  setHoveredMood(null);
                }
                if (value !== option.value) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#E5E5E5';
                }
              }}
            >
              <span>{option.label}</span>
            </div>
          ))}
        </div>,
        document.body
      )}

      {/* Style Preview Panel - Positioned to RIGHT of dropdown */}
      {isOpen && showStylePreview && hoveredStyle && stylePreviewData[hoveredStyle] && (
        <>
          {/* Ambient Glow Layer */}
          <div
            style={{
              position: 'absolute',
              width: '330px',
              height: 'auto',
              left: 'calc(100% + 5px)',
              top: '100%',
              marginTop: '-11px',
              borderRadius: '24px',
              background: (() => {
                const glows: Record<string, string> = {
                  'Modern Minimal': 'radial-gradient(ellipse at center, rgba(229, 229, 229, 0.20) 0%, rgba(180, 180, 180, 0.12) 40%, transparent 70%)',
                  'Contemporary': 'radial-gradient(ellipse at center, rgba(149, 165, 166, 0.22) 0%, rgba(44, 62, 80, 0.15) 40%, transparent 70%)',
                  'Scandinavian': 'radial-gradient(ellipse at center, rgba(240, 237, 229, 0.20) 0%, rgba(139, 157, 131, 0.14) 40%, transparent 70%)',
                  'Industrial': 'radial-gradient(ellipse at center, rgba(112, 112, 112, 0.18) 0%, rgba(139, 115, 20, 0.12) 40%, transparent 70%)',
                  'Japandi': 'radial-gradient(ellipse at center, rgba(212, 197, 185, 0.20) 0%, rgba(95, 115, 103, 0.14) 40%, transparent 70%)',
                  'Luxury Classic': 'radial-gradient(ellipse at center, rgba(212, 175, 55, 0.22) 0%, rgba(248, 246, 240, 0.15) 40%, transparent 70%)',
                  'Neo-Classical': 'radial-gradient(ellipse at center, rgba(232, 220, 196, 0.20) 0%, rgba(201, 185, 155, 0.12) 40%, transparent 70%)',
                  'Bohemian': 'radial-gradient(ellipse at center, rgba(212, 165, 116, 0.20) 0%, rgba(139, 71, 137, 0.14) 40%, transparent 70%)',
                  'Rustic': 'radial-gradient(ellipse at center, rgba(222, 184, 135, 0.20) 0%, rgba(139, 69, 19, 0.14) 40%, transparent 70%)',
                  'Mid-Century Modern': 'radial-gradient(ellipse at center, rgba(244, 164, 96, 0.22) 0%, rgba(0, 139, 139, 0.15) 40%, transparent 70%)'
                };
                return glows[hoveredStyle] || 'transparent';
              })(),
              filter: 'blur(70px)',
              zIndex: 1000,
              pointerEvents: 'none',
              animation: 'glowFadeIn 200ms ease-out',
              opacity: 1,
              padding: '16px'
            }}
          >
            <div style={{ width: '100%', height: '380px' }} />
          </div>

          {/* Main Preview Card */}
          <div
            style={{
              position: 'absolute',
              width: '300px',
              left: 'calc(100% + 20px)',
              top: '100%',
              marginTop: '4px',
              background: 'rgba(15, 15, 16, 0.92)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '18px',
              padding: '16px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
              zIndex: 1001,
              pointerEvents: 'none',
              animation: 'previewSlideIn 150ms ease-out'
            }}
          >
            <style>{`
              @keyframes previewSlideIn {
                from {
                  opacity: 0;
                  transform: translateX(-8px);
                }
                to {
                  opacity: 1;
                  transform: translateX(0);
                }
              }
              
              @keyframes glowFadeIn {
                from {
                  opacity: 0;
                }
                to {
                  opacity: 1;
                }
              }
            `}</style>
            
            {/* Room Thumbnail */}
            <div style={{
              width: '100%',
              height: '140px',
              borderRadius: '12px',
              overflow: 'hidden',
              marginBottom: '12px',
              boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.2)',
              background: '#0A0A0A'
            }}>
              <img 
                src={stylePreviewData[hoveredStyle].imageUrl}
                alt={hoveredStyle}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            </div>

            {/* Style Title */}
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '4px'
            }}>
              {hoveredStyle}
            </div>

            {/* Tagline */}
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.5)',
              marginBottom: '12px',
              fontStyle: 'italic'
            }}>
              {stylePreviewData[hoveredStyle].tagline}
            </div>

            {/* Color Palette - 5 swatches */}
            <div style={{
              display: 'flex',
              gap: '6px',
              marginBottom: '12px'
            }}>
              {stylePreviewData[hoveredStyle].palette.map((color, idx) => (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    height: '28px',
                    backgroundColor: color,
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)'
                  }}
                />
              ))}
            </div>

            {/* Characteristics - 2 bullets */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '12px'
            }}>
              {stylePreviewData[hoveredStyle].characteristics.map((char, idx) => (
                <div
                  key={idx}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.75)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '6px',
                    lineHeight: '1.4'
                  }}
                >
                  <span style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '10px',
                    marginTop: '1px',
                    flexShrink: 0
                  }}>
                    •
                  </span>
                  <span>{char}</span>
                </div>
              ))}
            </div>

            {/* Best For */}
            <div style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '11px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.9)',
              padding: '8px 10px',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.06)',
              lineHeight: '1.3'
            }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400 }}>Best for: </span>
              {stylePreviewData[hoveredStyle].bestFor}
            </div>
          </div>
        </>
      )}

      {/* Mood Preview Panel - Positioned to LEFT of dropdown */}
      {isOpen && showMoodPreview && hoveredMood && moodPreviewData[hoveredMood] && (
        <div
          style={{
            position: 'absolute',
            width: '280px',
            right: 'calc(100% + 20px)',
            top: '100%',
            marginTop: '4px',
            background: 'rgba(15, 15, 16, 0.92)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '18px',
            padding: '16px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.35)',
            zIndex: 1001,
            pointerEvents: 'none',
            animation: 'moodPreviewSlideIn 150ms ease-out'
          }}
        >
          <style>{`
            @keyframes moodPreviewSlideIn {
              from {
                opacity: 0;
                transform: translateX(8px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
          
          {/* Room Thumbnail */}
          <div style={{
            width: '100%',
            height: '120px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '12px',
            boxShadow: 'inset 0 1px 4px rgba(0, 0, 0, 0.2)',
            background: '#0A0A0A'
          }}>
            <img 
              src={moodPreviewData[hoveredMood].imageUrl}
              alt={hoveredMood}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </div>

          {/* Mood Title */}
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '4px'
          }}>
            {hoveredMood}
          </div>

          {/* Tagline */}
          <div style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.5)',
            marginBottom: '12px',
            fontStyle: 'italic'
          }}>
            {moodPreviewData[hoveredMood].tagline}
          </div>

          {/* Color Palette - 4 swatches */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '6px',
            marginBottom: '12px'
          }}>
            {moodPreviewData[hoveredMood].palette.map((color, idx) => (
              <div
                key={idx}
                style={{
                  height: '32px',
                  backgroundColor: color,
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.15)'
                }}
              />
            ))}
          </div>

          {/* Vibe Description - 2 bullets */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}>
            {moodPreviewData[hoveredMood].vibeDescription.map((desc, idx) => (
              <div
                key={idx}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.75)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  lineHeight: '1.4'
                }}
              >
                <span style={{
                  color: 'rgba(255, 255, 255, 0.4)',
                  fontSize: '10px',
                  marginTop: '1px',
                  flexShrink: 0
                }}>
                  •
                </span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Color Palette Preview Card - Positioned BELOW the input field */}
      {showColorPalettePreview && value && colorPalettePreviewData[value] && (
        <div
          style={{
            marginTop: '12px',
            width: '100%',
            background: 'rgba(15, 15, 16, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            animation: 'palettePreviewSlideDown 250ms ease-out',
            overflow: 'hidden'
          }}
        >
          <style>{`
            @keyframes palettePreviewSlideDown {
              from {
                opacity: 0;
                transform: translateY(-8px);
                maxHeight: 0;
              }
              to {
                opacity: 1;
                transform: translateY(0);
                maxHeight: 200px;
              }
            }
          `}</style>

          {/* Title */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '6px',
              letterSpacing: '-0.2px'
            }}
          >
            {colorPalettePreviewData[value].title}
          </div>

          {/* Description */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              marginBottom: '14px',
              lineHeight: '1.4'
            }}
          >
            {colorPalettePreviewData[value].description}
          </div>

          {/* Color Swatches */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {colorPalettePreviewData[value].colors.map((color, idx) => (
              <div
                key={idx}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: color,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0,
                  animation: `swatchFadeIn ${200 + idx * 40}ms ease-out`,
                  animationFillMode: 'backwards'
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes swatchFadeIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}

      {/* Accent Color Preview Card - Positioned BELOW the input field */}
      {showAccentColorPreview && value && accentColorPreviewData[value] && (
        <div
          style={{
            marginTop: '12px',
            width: '100%',
            background: 'rgba(15, 15, 16, 0.88)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.10)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            animation: 'accentPreviewSlideDown 250ms ease-out',
            overflow: 'hidden'
          }}
        >
          <style>{`
            @keyframes accentPreviewSlideDown {
              from {
                opacity: 0;
                transform: translateY(-8px);
                maxHeight: 0;
              }
              to {
                opacity: 1;
                transform: translateY(0);
                maxHeight: 200px;
              }
            }
          `}</style>

          {/* Title */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.95)',
              marginBottom: '6px',
              letterSpacing: '-0.2px'
            }}
          >
            {accentColorPreviewData[value].title}
          </div>

          {/* Description */}
          <div
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              marginBottom: '14px',
              lineHeight: '1.4'
            }}
          >
            {accentColorPreviewData[value].description}
          </div>

          {/* Color Swatches */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap'
            }}
          >
            {accentColorPreviewData[value].colors.map((color, idx) => (
              <div
                key={idx}
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  backgroundColor: color,
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                  flexShrink: 0,
                  animation: `accentSwatchFadeIn ${200 + idx * 40}ms ease-out`,
                  animationFillMode: 'backwards'
                }}
              />
            ))}
          </div>

          <style>{`
            @keyframes accentSwatchFadeIn {
              from {
                opacity: 0;
                transform: scale(0.8);
              }
              to {
                opacity: 1;
                transform: scale(1);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}