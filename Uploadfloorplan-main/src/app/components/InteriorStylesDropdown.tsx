import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface InteriorStylesDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

// All available style options
const STYLE_OPTIONS = [
  'Minimalist',
  'Modern Contemporary',
  'Transitional',
  'Art Deco',
  'Mediterranean',
  'Scandinavian Modern',
  'Tropical',
  'Coastal',
  'Urban Industrial',
  'Japandi',
  'Japandi Soft',
  'Contemporary Luxe',
  'Luxury Classic',
  'Neo-Classical',
  'Classic European',
  'Wabi-Sabi',
  'High-Tech Modern',
  'Bohemian',
  'Eclectic',
  'Traditional Indian',
  'Modern Indian',
  'Rustic',
  'Farmhouse Modern',
  'Mid-Century Modern',
  'Zen Inspired',
  'Luxury Penthouse'
];

// Style preview data
interface StylePreview {
  title: string;
  description: string;
  imageUrl: string;
  colors: string[];
}

const STYLE_PREVIEWS: Record<string, StylePreview> = {
  'Minimalist': {
    title: 'Minimalist',
    description: 'Clean lines, neutral palettes, and uncluttered spaces create serene, functional beauty.',
    imageUrl: 'https://images.unsplash.com/photo-1761330439863-c5054148d0c1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsaXN0JTIwd2hpdGUlMjBsaXZpbmclMjByb29tJTIwY2xlYW58ZW58MXx8fHwxNzcxODQ2ODg4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FFFFFF', '#F5F5F5', '#E8E8E8', '#D5D5D5', '#C9C9C9']
  },
  'Modern Contemporary': {
    title: 'Modern Contemporary',
    description: 'Current design trends with sleek finishes and bold, clean architectural elements.',
    imageUrl: 'https://images.unsplash.com/photo-1760237438642-2f2a16cebd9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBjb250ZW1wb3JhcnklMjBzbGVlayUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg4OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2C2C2E', '#F5F5F7', '#8E8E93', '#D1D1D6', '#E5E5EA']
  },
  'Transitional': {
    title: 'Transitional',
    description: 'Balanced blend of traditional warmth and contemporary simplicity for timeless appeal.',
    imageUrl: 'https://images.unsplash.com/photo-1761725406659-088c97a81fc0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFuc2l0aW9uYWwlMjBsaXZpbmclMjByb29tJTIwYmxlbmQlMjB0cmFkaXRpb25hbHxlbnwxfHx8fDE3NzE4NDY4ODl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B7355', '#D4C5A9', '#F5F5F7', '#C2B280', '#E8E8E8']
  },
  'Art Deco': {
    title: 'Art Deco',
    description: 'Glamorous 1920s style with geometric patterns, rich colors, and luxurious materials.',
    imageUrl: 'https://images.unsplash.com/photo-1680261019812-f441f59448b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBkZWNvJTIwMTkyMHMlMjBsaXZpbmclMjByb29tJTIwZ2VvbWV0cmljJTIwdmVsdmV0JTIwYnJhc3MlMjBkcmFtYXRpY3xlbnwxfHx8fDE3NzE4NDkwNjh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1C1C1E', '#D4AF37', '#2C2C2E', '#C9B037', '#8B7355']
  },
  'Mediterranean': {
    title: 'Mediterranean',
    description: 'Warm terracotta, azure blues, and rustic textures evoke coastal European charm.',
    imageUrl: 'https://images.unsplash.com/photo-1561648107-68f1f8be4964?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtZWRpdGVycmFuZWFuJTIwbGl2aW5nJTIwcm9vbSUyMHRlcnJhY290dGElMjBhcmNoZWQlMjB3YXJtJTIwd29vZCUyMGNvenl8ZW58MXx8fHwxNzcxODQ5MDY4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E8C4A0', '#5DADE2', '#D4A574', '#AED6F1', '#8B5A3C']
  },
  'Scandinavian Modern': {
    title: 'Scandinavian Modern',
    description: 'Light wood, white walls, and functional design embody Nordic simplicity and warmth.',
    imageUrl: 'https://images.unsplash.com/photo-1767946876712-c78a132cc317?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBtb2Rlcm4lMjBsaWdodCUyMHdvb2QlMjB3aGl0ZXxlbnwxfHx8fDE3NzE4NDY4OTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#D5D5D5', '#C9C9C9', '#A89F91']
  },
  'Tropical': {
    title: 'Tropical',
    description: 'Lush greens, natural materials, and breezy openness bring island paradise indoors.',
    imageUrl: 'https://images.unsplash.com/photo-1767429013026-fefb4bc82879?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cm9waWNhbCUyMG5hdHVyYWwlMjBtYXRlcmlhbHMlMjBncmVlbiUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#56AB2F', '#7CB342', '#A5D6A7', '#C8E6C9', '#E8F4F8']
  },
  'Coastal': {
    title: 'Coastal',
    description: 'Soft blues, sandy neutrals, and airy layouts capture relaxed beachside living.',
    imageUrl: 'https://images.unsplash.com/photo-1760615792076-de514bc9be36?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2FzdGFsJTIwYmx1ZSUyMHdoaXRlJTIwYmVhY2h5JTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxODQ2ODk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E8F4F8', '#D6EAF8', '#AED6F1', '#85C1E9', '#F5F5F7']
  },
  'Urban Industrial': {
    title: 'Urban Industrial',
    description: 'Exposed brick, metal accents, and raw materials celebrate utilitarian aesthetics.',
    imageUrl: 'https://images.unsplash.com/photo-1615799752042-698d580570db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGluZHVzdHJpYWwlMjBleHBvc2VkJTIwYnJpY2slMjBtZXRhbHxlbnwxfHx8fDE3NzE4NDY4OTR8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3E3E3E', '#5A5A5A', '#787878', '#8C6239', '#A0826D']
  },
  'Japandi': {
    title: 'Japandi',
    description: 'Japanese minimalism meets Scandinavian warmth in perfect, balanced harmony.',
    imageUrl: 'https://images.unsplash.com/photo-1698675610962-2e4ee6a71d31?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmRpJTIwbWluaW1hbGlzdCUyMG5hdHVyYWwlMjB3b29kJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxODQ2ODk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#C9C9C9', '#8B7355', '#2C2C2E']
  },
  'Japandi Soft': {
    title: 'Japandi Soft',
    description: 'Gentle, muted tones and natural textures create serene, understated elegance.',
    imageUrl: 'https://images.unsplash.com/photo-1717860477853-9538cf52833c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxqYXBhbmRpJTIwc29mdCUyMG11dGVkJTIwdG9uZXMlMjBiZWRyb29tfGVufDF8fHx8MTc3MTg0Njg5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F8F8F8', '#E8E8E8', '#D5D5D5', '#C2B280', '#A89F91']
  },
  'Contemporary Luxe': {
    title: 'Contemporary Luxe',
    description: 'Modern sophistication with premium materials and refined, polished details.',
    imageUrl: 'https://images.unsplash.com/photo-1639663742190-1b3dba2eebcf?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBsdXhlJTIwcHJlbWl1bSUyMG1vZGVybiUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2C2C2E', '#48484A', '#8E8E93', '#D4AF37', '#C7C7CC']
  },
  'Luxury Classic': {
    title: 'Luxury Classic',
    description: 'Timeless opulence with rich fabrics, ornate details, and regal presence.',
    imageUrl: 'https://images.unsplash.com/photo-1694245413199-ca345d2670b5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjbGFzc2ljJTIwb3JuYXRlJTIwcmljaCUyMGZhYnJpY3N8ZW58MXx8fHwxNzcxODQ2ODk0fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B4513', '#D4AF37', '#2C2C2E', '#C9B037', '#8B7355']
  },
  'Neo-Classical': {
    title: 'Neo-Classical',
    description: 'Classical architecture reimagined with contemporary elegance and proportion.',
    imageUrl: 'https://images.unsplash.com/photo-1609367946896-35a3e6ccf772?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9jbGFzc2ljYWwlMjBlbGVnYW50JTIwY29sdW1ucyUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg5NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#C7C7CC', '#8E8E93', '#2C2C2E']
  },
  'Classic European': {
    title: 'Classic European',
    description: 'Old-world charm with ornamental details and timeless, sophisticated beauty.',
    imageUrl: 'https://images.unsplash.com/photo-1694514291510-018e4ffdf245?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljJTIwZXVyb3BlYW4lMjBvcm5hbWVudGFsJTIwdHJhZGl0aW9uYWwlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzE4NDY4OTV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B5A3C', '#C17767', '#D4A574', '#E8C4A0', '#F5DEB3']
  },
  'Wabi-Sabi': {
    title: 'Wabi-Sabi',
    description: 'Imperfection and transience celebrated through natural materials and organic forms.',
    imageUrl: 'https://images.unsplash.com/photo-1683735779537-80cc2d52ce29?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YWJpJTIwc2FiaSUyMG1pbmltYWwlMjBuZXV0cmFsJTIwcm9vbSUyMHJhdyUyMHRleHR1cmUlMjBuYXR1cmFsJTIwd29vZHxlbnwxfHx8fDE3NzE4NDg5MDJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E8E4DD', '#D4CEC3', '#A89F91', '#8B7E6E', '#6B5E4F']
  },
  'High-Tech Modern': {
    title: 'High-Tech Modern',
    description: 'Futuristic design with smart technology, sleek surfaces, and innovative materials.',
    imageUrl: 'https://images.unsplash.com/photo-1746061546854-1fb8b0b90862?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaWdoJTIwdGVjaCUyMG1vZGVybiUyMGZ1dHVyaXN0aWMlMjBzbWFydCUyMGhvbWUlMjBzbGVlayUyMG1pbmltYWx8ZW58MXx8fHwxNzcxODQ4OTAyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1C1C1E', '#2C2C2E', '#48484A', '#8E8E93', '#E5E5EA']
  },
  'Bohemian': {
    title: 'Bohemian',
    description: 'Eclectic patterns, vibrant colors, and global influences create free-spirited charm.',
    imageUrl: 'https://images.unsplash.com/photo-1761152006885-c30a627bff18?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2hlbWlhbiUyMGxpdmluZyUyMHJvb20lMjBjb2xvcmZ1bCUyMHBsYW50cyUyMHJ1Z3MlMjB0ZXh0aWxlcyUyMGxheWVyZWR8ZW58MXx8fHwxNzcxODQ4OTAzfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#D95D39', '#F18F01', '#E9C46A', '#6A994E', '#264653']
  },
  'Eclectic': {
    title: 'Eclectic',
    description: 'Curated mix of styles, eras, and textures for personalized, unique expression.',
    imageUrl: 'https://images.unsplash.com/photo-1764621616112-f70807d5fc6c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlY2xlY3RpYyUyMG1peCUyMHN0eWxlcyUyMHVuaXF1ZSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg5N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E76F51', '#F4A261', '#E9C46A', '#2A9D8F', '#264653']
  },
  'Traditional Indian': {
    title: 'Traditional Indian',
    description: 'Rich colors, intricate patterns, and cultural heritage create vibrant warmth.',
    imageUrl: 'https://images.unsplash.com/photo-1709237104643-3e11922ce515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGluZGlhbiUyMGxpdmluZyUyMHJvb20lMjBjYXJ2ZWQlMjB3b29kJTIwYnJhc3MlMjB0ZXh0aWxlc3xlbnwxfHx8fDE3NzE4NDg5MDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B4513', '#D4AF37', '#E76F51', '#F4A261', '#264653']
  },
  'Modern Indian': {
    title: 'Modern Indian',
    description: 'Contemporary design infused with traditional Indian elements and bold colors.',
    imageUrl: 'https://images.unsplash.com/photo-1626551039948-ddd7e595fe06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBpbmRpYW4lMjBsaXZpbmclMjByb29tJTIwY29udGVtcG9yYXJ5JTIwbmV1dHJhbCUyMHdvb2R8ZW58MXx8fHwxNzcxODQ4MjU4fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E76F51', '#2A9D8F', '#E9C46A', '#264653', '#F5F5F7']
  },
  'Rustic': {
    title: 'Rustic',
    description: 'Natural wood, stone, and earthy textures evoke countryside simplicity.',
    imageUrl: 'https://images.unsplash.com/photo-1726091097680-5da84f593ccd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxydXN0aWMlMjBsaXZpbmclMjByb29tJTIwZXhwb3NlZCUyMGJlYW1zJTIwc3RvbmUlMjBmaXJlcGxhY2UlMjB3b29kZW4lMjBmdXJuaXR1cmUlMjBjb3p5fGVufDF8fHx8MTc3MTkxMTM5OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#6B5B3E', '#8B7355', '#A0826D', '#C2B280', '#D4C5A9']
  },
  'Farmhouse Modern': {
    title: 'Farmhouse Modern',
    description: 'Rustic charm meets contemporary clean lines for comfortable, updated living.',
    imageUrl: 'https://images.unsplash.com/photo-1720096004902-9954af4e2fae?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmYXJtaG91c2UlMjBtb2Rlcm4lMjB3aGl0ZSUyMHJ1c3RpYyUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg5OXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FFFFFF', '#F5F5F5', '#8B7355', '#C2B280', '#2C2C2E']
  },
  'Mid-Century Modern': {
    title: 'Mid-Century Modern',
    description: '1950s-inspired design with organic forms, clean lines, and retro appeal.',
    imageUrl: 'https://images.unsplash.com/photo-1767769354788-1f9717f7c5f4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaWQlMjBjZW50dXJ5JTIwbW9kZXJuJTIwcmV0cm8lMjAxOTUwc3xlbnwxfHx8fDE3NzE4NDY4OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E9C46A', '#F4A261', '#2A9D8F', '#264653', '#8B7355']
  },
  'Zen Inspired': {
    title: 'Zen Inspired',
    description: 'Tranquil spaces with natural elements and mindful simplicity for inner peace.',
    imageUrl: 'https://images.unsplash.com/photo-1731780027137-0b808038a87f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx6ZW4lMjBqYXBhbmVzZSUyMGJlZHJvb20lMjBtaW5pbWFsJTIwY2FsbSUyMG5ldXRyYWwlMjBwbGFudHN8ZW58MXx8fHwxNzcxODQ4MjYxfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#D5D5D5', '#A8C5DD', '#8B7355']
  },
  'Luxury Penthouse': {
    title: 'Luxury Penthouse',
    description: 'High-end urban living with panoramic views and sophisticated, exclusive design.',
    imageUrl: 'https://images.unsplash.com/photo-1568115286680-d203e08a8be6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBwZW50aG91c2UlMjBoaWdoJTIwZW5kJTIwdXJiYW58ZW58MXx8fHwxNzcxODQ2OTAwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1A1A1A', '#2E2E2E', '#48484A', '#D4AF37', '#C7C7CC']
  }
};

export function InteriorStylesDropdown({ value, onChange }: InteriorStylesDropdownProps) {
  // State: "closed", "open", or "selected"
  const [state, setState] = useState<'closed' | 'open' | 'selected'>(
    value ? 'selected' : 'closed'
  );
  const [hoveredStyle, setHoveredStyle] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync state with value changes
  useEffect(() => {
    if (value && state === 'closed') {
      setState('selected');
    } else if (!value && state === 'selected') {
      setState('closed');
    }
  }, [value, state]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (state === 'open') {
          setState(value ? 'selected' : 'closed');
          setHoveredStyle(null);
        }
      }
    }

    if (state === 'open') {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [state, value]);

  // Handle input click
  const handleInputClick = () => {
    if (state === 'closed' || state === 'selected') {
      setState('open');
    } else if (state === 'open') {
      setState(value ? 'selected' : 'closed');
      setHoveredStyle(null);
    }
  };

  // Handle option click
  const handleOptionClick = (option: string) => {
    onChange(option);
    setState('selected');
    setHoveredStyle(null);
  };

  const displayText = state === 'selected' && value ? value : 'Select style';
  
  // Only show preview when actively hovering on a style option
  const activePreview = hoveredStyle && STYLE_PREVIEWS[hoveredStyle] 
    ? STYLE_PREVIEWS[hoveredStyle] 
    : null;

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
        Interior Styles
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
          {/* Text */}
          <motion.span
            key={displayText}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {displayText}
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

        {/* Dropdown List - Below Input (Normal Behavior) */}
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
                maxHeight: '400px',
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
              {STYLE_OPTIONS.map((option) => (
                <motion.div
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHoveredStyle(option)}
                  onMouseLeave={() => setHoveredStyle(null)}
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

        {/* Floating Preview Card - ONLY on Hover - RIGHT SIDE */}
        <AnimatePresence>
          {state === 'open' && activePreview && (
            <motion.div
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                left: 'calc(100% + 24px)',
                transform: 'translateY(-50%)',
                width: '300px',
                borderRadius: '16px',
                background: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                zIndex: 999,
                pointerEvents: 'none'
              }}
            >
              {/* Preview Image */}
              <motion.div
                key={activePreview.title}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  height: '200px',
                  borderRadius: '12px',
                  backgroundImage: `url(${activePreview.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px'
                }}
              />

              {/* Style Title */}
              <motion.h4
                key={`title-${activePreview.title}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.95)',
                  margin: 0,
                  marginBottom: '8px'
                }}
              >
                {activePreview.title}
              </motion.h4>

              {/* Description */}
              <motion.p
                key={`desc-${activePreview.title}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.65)',
                  lineHeight: '1.5',
                  margin: 0,
                  marginBottom: '10px'
                }}
              >
                {activePreview.description}
              </motion.p>

              {/* Color Swatches */}
              <motion.div
                key={`swatches-${activePreview.title}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '8px',
                  alignItems: 'center'
                }}
              >
                {activePreview.colors.map((color, index) => (
                  <div
                    key={index}
                    style={{
                      width: '26px',
                      height: '14px',
                      borderRadius: '3px',
                      backgroundColor: color,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      flexShrink: 0
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}