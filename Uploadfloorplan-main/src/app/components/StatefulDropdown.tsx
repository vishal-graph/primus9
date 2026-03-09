import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface StatefulDropdownProps {
  label: string;
  placeholder: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
}

export function StatefulDropdown({
  label,
  placeholder,
  options,
  value,
  onChange
}: StatefulDropdownProps) {
  // State: "closed" or "open"
  const [state, setState] = useState<'closed' | 'open'>('closed');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // "Value" text - shows selected value or placeholder
  const valueText = value || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (state === 'open') {
          setState('closed');
        }
      }
    }

    if (state === 'open') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state]);

  // Handle input click - toggle between closed and open
  const handleInputClick = () => {
    setState(state === 'closed' ? 'open' : 'closed');
  };

  // Handle option click - update value and close
  const handleOptionClick = (option: string) => {
    onChange(option); // Update "Value" text
    setState('closed'); // Change to Closed state
  };

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
        {label}
      </label>

      {/* Dropdown Container */}
      <div ref={dropdownRef} style={{ position: 'relative' }}>
        {/* Input Field */}
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
            color: value ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.5)',
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
          {/* "Value" Text Layer */}
          <motion.span
            key={valueText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {valueText}
          </motion.span>

          {/* Chevron Icon */}
          <motion.div
            animate={{ rotate: state === 'open' ? 180 : 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ display: 'flex', alignItems: 'center' }}
          >
            <ChevronDown size={16} color="rgba(255, 255, 255, 0.5)" />
          </motion.div>
        </motion.div>

        {/* Dropdown Menu List - Open state only */}
        <AnimatePresence>
          {state === 'open' && (
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
              {options.map((option) => (
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
        </AnimatePresence>
      </div>
    </div>
  );
}
