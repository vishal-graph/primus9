import { motion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

interface AccentColorSwatchRowProps {
  swatchColors: string[];
  selectedSwatchIndex: number;
  onSwatchSelect: (index: number) => void;
  accentKey: string; // Used to trigger animation reset
}

export function AccentColorSwatchRow({ 
  swatchColors, 
  selectedSwatchIndex, 
  onSwatchSelect,
  accentKey 
}: AccentColorSwatchRowProps) {
  const [animationKey, setAnimationKey] = useState(0);

  // Reset animation when accent selection changes
  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [accentKey]);

  return (
    <motion.div
      key={animationKey}
      initial="hidden"
      animate="visible"
      style={{
        marginTop: '12px',
        display: 'flex',
        flexDirection: 'row',
        gap: '8px',
        alignItems: 'center',
        width: 'fit-content'
      }}
    >
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const isSelected = selectedSwatchIndex === index;
        
        return (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: index * 0.12, // 120ms stagger delay
              duration: 0.25, // 250ms duration
              ease: [0.25, 0.1, 0.25, 1.0] // ease out
            }}
            onClick={() => {
              // Single-selection: always select the clicked swatch
              onSwatchSelect(index);
            }}
            style={{
              width: '48px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: swatchColors[index] || '#333',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'all 200ms ease', // Smart Animate 200ms
              outline: isSelected ? '2px solid rgba(255, 255, 255, 0.9)' : 'none',
              outlineOffset: '2px',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSelected) {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }
            }}
          >
            {/* Selected variant: Check icon */}
            {isSelected && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: '4px',
                  transform: 'translateY(-50%)',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Check size={8} color="#000" strokeWidth={3} />
              </div>
            )}
          </motion.div>
        );
      })}
    </motion.div>
  );
}
