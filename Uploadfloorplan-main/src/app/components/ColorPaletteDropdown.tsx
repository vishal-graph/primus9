import { motion } from "motion/react";
import { Check, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { ColorPaletteSwatchRow } from "./ColorPaletteSwatchRow";

// All available palette options
const PALETTE_OPTIONS = [
  'Neutral & Earthy',
  'Monochromatic',
  'Bold & Vibrant',
  'Pastel',
  'Dark & Moody',
  'Light & Airy',
  'Warm Tones',
  'Cool Tones',
  'Earth & Clay',
  'Scandinavian Neutrals',
  'Modern Greys',
  'Soft Pastels',
  'Tropical Vibes',
  'Ocean Inspired',
  'Desert Minimal',
  'Urban Industrial',
  'Luxury Contrast',
  'Contemporary Monotone',
  'Vintage Classic',
  'Boho Blend',
  'Nature Inspired',
  'Sunset Palette',
  'Winter Whites',
  'Deep Saturated',
  'Muted Elegant',
  'Coastal Breeze'
];

interface ColorPaletteDropdownProps {
  value: string;
  onChange: (value: string) => void;
  selectedSwatchIndex: number;
  onSwatchSelect: (index: number) => void;
}

// Helper function to get color palette swatch colors
function getPaletteSwatchColors(palette: string): string[] {
  const paletteColors: Record<string, string[]> = {
    'Monochromatic': ['#111111', '#333333', '#555555', '#777777', '#999999', '#CCCCCC'],
    'Neutral & Earthy': ['#5C4A3E', '#8B6F5A', '#C2B280', '#A89F91', '#6D5F4B', '#D9D3C7'],
    'Bold & Vibrant': ['#FF3B3F', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#AF52DE'],
    'Pastel': ['#FADADD', '#CDE7F0', '#D5F5E3', '#FFF3B0', '#E4C1F9', '#B5EAEA'],
    'Dark & Moody': ['#1C1C1E', '#2C2C2E', '#3A3A3C', '#48484A', '#636366', '#8E8E93'],
    'Light & Airy': ['#F5F5F7', '#EAEAEA', '#FFFFFF', '#D6EAF8', '#FDEBD0', '#E8F8F5'],
    'Warm Tones': ['#8B4513', '#D2691E', '#CD853F', '#DEB887', '#F4A460', '#FFE4B5'],
    'Cool Tones': ['#4682B4', '#5F9EA0', '#87CEEB', '#B0C4DE', '#ADD8E6', '#E0F6FF'],
    'Earth & Clay': ['#8B5A3C', '#C1666B', '#D4A574', '#A0695F', '#B8734A', '#CB997E'],
    'Scandinavian Neutrals': ['#E8E8E8', '#D5D5D5', '#F5F5F5', '#C9C9C9', '#BEBEBE', '#FAFAFA'],
    'Modern Greys': ['#2C2C2C', '#404040', '#545454', '#6A6A6A', '#808080', '#969696'],
    'Soft Pastels': ['#F4E1D2', '#E8D5C4', '#FCE8E8', '#E4F1F1', '#EDD9E8', '#F9E7D0'],
    'Tropical Vibes': ['#00CED1', '#FF6F61', '#FFD700', '#FF4500', '#32CD32', '#FF1493'],
    'Ocean Inspired': ['#003E52', '#006B7D', '#008C9E', '#00A3B5', '#4FBFCC', '#8DD9E3'],
    'Desert Minimal': ['#E1C699', '#D4AF76', '#C9A66B', '#B89968', '#A58A5F', '#F2E5D3'],
    'Urban Industrial': ['#3B3B3B', '#5A5A5A', '#787878', '#8C8C8C', '#A0A0A0', '#B4B4B4'],
    'Luxury Contrast': ['#1A1A1A', '#2E2E2E', '#D4AF37', '#C9B037', '#8B7355', '#F5F5DC'],
    'Contemporary Monotone': ['#0A0A0A', '#1E1E1E', '#323232', '#464646', '#5A5A5A', '#6E6E6E'],
    'Vintage Classic': ['#8B4513', '#CD853F', '#DEB887', '#D2B48C', '#F5DEB3', '#FFF8DC'],
    'Boho Blend': ['#D4A574', '#C1666B', '#8B5A3C', '#A0695F', '#B8734A', '#CB997E'],
    'Nature Inspired': ['#228B22', '#32CD32', '#90EE90', '#8FBC8F', '#556B2F', '#6B8E23'],
    'Sunset Palette': ['#FF6B6B', '#FF8C42', '#FFD93D', '#FFA07A', '#FF7F50', '#FF6347'],
    'Winter Whites': ['#F8F8FF', '#FFFAF0', '#F5F5F5', '#E8E8E8', '#DCDCDC', '#D3D3D3'],
    'Deep Saturated': ['#8B0000', '#006400', '#00008B', '#4B0082', '#8B008B', '#FF8C00'],
    'Muted Elegant': ['#C8C8C8', '#B8B8B8', '#A8A8A8', '#989898', '#888888', '#D8D8D8'],
    'Coastal Breeze': ['#87CEEB', '#B0E0E6', '#ADD8E6', '#F0F8FF', '#E0FFFF', '#AFEEEE']
  };
  return paletteColors[palette] || ['#333', '#444', '#555', '#666', '#777', '#888'];
}

export function ColorPaletteDropdown({ value, onChange, selectedSwatchIndex, onSwatchSelect }: ColorPaletteDropdownProps) {
  // State management: "closed", "open", "selected"
  type DropdownState = 'closed' | 'open' | 'selected';
  
  const [componentState, setComponentState] = useState<DropdownState>(
    value ? 'selected' : 'closed'
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with value changes
  useEffect(() => {
    if (value && componentState === 'closed') {
      setComponentState('selected');
    } else if (!value && componentState === 'selected') {
      setComponentState('closed');
    }
  }, [value, componentState]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (componentState === 'open') {
          setComponentState(value ? 'selected' : 'closed');
        }
      }
    }

    if (componentState === 'open') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [componentState, value]);

  // Handle input click based on current state
  const handleInputClick = () => {
    if (componentState === 'closed' || componentState === 'selected') {
      // Closed → Open or Selected → Open
      setComponentState('open');
    } else if (componentState === 'open') {
      // Open → Closed/Selected
      setComponentState(value ? 'selected' : 'closed');
    }
  };

  // Handle option click
  const handleOptionClick = (option: string) => {
    // Update the selected label text dynamically
    onChange(option);
    // Change to Selected state with Smart Animate
    setComponentState('selected');
  };

  // Selected Label text (dynamic)
  const selectedLabel = value;

  // Swatch colors for selected state
  const swatchColors = value ? getPaletteSwatchColors(value) : [];

  return (
    <div>
      {/* Label */}
      <label
        style={{
          display: 'block',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.75)',
          marginBottom: '8px'
        }}
      >
        Color Palette
      </label>

      {/* Dropdown Container */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Input Field with State-based rendering */}
        <motion.div
          onClick={handleInputClick}
          layout
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            height: '44px',
            width: '100%',
            padding: '0 14px',
            borderRadius: '10px',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: componentState === 'selected' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)'
          }}
          whileHover={{
            background: 'rgba(255, 255, 255, 0.06)',
            borderColor: 'rgba(255, 255, 255, 0.18)'
          }}
        >
          {/* Dynamic Text: "Select palette" or Selected Label */}
          <motion.span
            key={componentState === 'selected' ? selectedLabel : 'placeholder'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {componentState === 'selected' ? selectedLabel : 'Select palette'}
          </motion.span>

          {/* Chevron with rotation animation */}
          <motion.div
            animate={{ rotate: componentState === 'open' ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
          </motion.div>
        </motion.div>

        {/* Dropdown List - Open state only */}
        {componentState === 'open' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: '48px',
              left: 0,
              right: 0,
              maxHeight: '280px',
              overflowY: 'auto',
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              padding: '6px',
              zIndex: 1000,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            {PALETTE_OPTIONS.map((option) => (
              <motion.div
                key={option}
                onClick={() => handleOptionClick(option)}
                whileHover={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  color: 'rgba(255, 255, 255, 0.95)'
                }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: value === option ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.75)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: value === option ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
                }}
              >
                <span>{option}</span>
                {value === option && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                  >
                    <Check size={14} color="rgba(255, 255, 255, 0.9)" strokeWidth={2.5} />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Palette Swatches - Selected state only */}
      {componentState === 'selected' && value && (
        <ColorPaletteSwatchRow
          swatchColors={swatchColors}
          selectedSwatchIndex={selectedSwatchIndex}
          onSwatchSelect={onSwatchSelect}
          paletteKey={value}
        />
      )}
    </div>
  );
}
