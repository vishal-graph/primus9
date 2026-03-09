import { motion, AnimatePresence } from "motion/react";
import { ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface MoodDropdownProps {
  value: string;
  onChange: (value: string) => void;
}

// All available mood options
const MOOD_OPTIONS = [
  'Calm & Relaxing',
  'Energetic & Vibrant',
  'Warm & Cozy',
  'Cool & Fresh',
  'Elegant & Sophisticated',
  'Playful & Fun',
  'Game',
  'Soft Girl',
  'Aesthetic',
  'Professional',
  'Luxurious',
  'Serene',
  'Moody & Dramatic',
  'Minimal & Quiet',
  'Bold & Expressive',
  'Earthy & Organic',
  'Bright & Airy',
  'Dark & Luxe',
  'Artistic & Creative',
  'Monochrome Modern',
  'Nature Inspired',
  'Urban Chic',
  'Soft & Romantic',
  'Industrial Edge',
  'Scandinavian Calm',
  'Contemporary Elegant',
  'High Energy',
  'Spa-Like',
  'Heritage Inspired',
  'Vibrant Fusion',
  'Premium Executive'
];

// Mood preview data
interface MoodPreview {
  title: string;
  description: string;
  imageUrl: string;
  colors: string[];
}

const MOOD_PREVIEWS: Record<string, MoodPreview> = {
  'Calm & Relaxing': {
    title: 'Calm & Relaxing',
    description: 'Soft tones, gentle textures, and open spaces create a peaceful sanctuary for rest and reflection.',
    imageUrl: 'https://images.unsplash.com/photo-1644082089290-0b8f2764e15f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjYWxtJTIwcmVsYXhpbmclMjBiZWRyb29tJTIwbmV1dHJhbCUyMGJlaWdlfGVufDF8fHx8MTc3MTg0Njg3MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E8F4F8', '#D5E8ED', '#B8D4DB', '#9ABFC9', '#7CA9B7']
  },
  'Energetic & Vibrant': {
    title: 'Energetic & Vibrant',
    description: 'Bold colors, dynamic patterns, and lively accents energize the space with personality and joy.',
    imageUrl: 'https://images.unsplash.com/photo-1621373660651-081fc7f94fa4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbmVyZ2V0aWMlMjB2aWJyYW50JTIwY29sb3JmdWwlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTg0Njg3MXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9D4EDD']
  },
  'Warm & Cozy': {
    title: 'Warm & Cozy',
    description: 'Rich wood tones, soft lighting, and plush textures invite comfort and intimate gatherings.',
    imageUrl: 'https://images.unsplash.com/photo-1553114552-c4ece3a33c93?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3YXJtJTIwY296eSUyMGxpdmluZyUyMHJvb20lMjB5ZWxsb3clMjBsaWdodGluZyUyMGN1c2hpb25zJTIwdGhyb3dzfGVufDF8fHx8MTc3MTg0Nzc1NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B5A3C', '#C17767', '#D4A574', '#E8C4A0', '#F5DEB3']
  },
  'Cool & Fresh': {
    title: 'Cool & Fresh',
    description: 'Crisp whites, cool blues, and airy layouts bring clarity and refreshing simplicity.',
    imageUrl: 'https://images.unsplash.com/photo-1721045028597-a8e2ebd3a457?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlnaHQlMjBhaXJ5JTIwbGl2aW5nJTIwcm9vbSUyMHNvZnQlMjBibHVlJTIwcGFzdGVsJTIwbmF0dXJhbCUyMGxpZ2h0fGVufDF8fHx8MTc3MTg0Nzc1NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F0F8FF', '#D6EAF8', '#AED6F1', '#85C1E9', '#5DADE2']
  },
  'Elegant & Sophisticated': {
    title: 'Elegant & Sophisticated',
    description: 'Refined materials, timeless design, and subtle luxury create an atmosphere of distinction.',
    imageUrl: 'https://images.unsplash.com/photo-1758448755778-90ebf4d0f1e7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwc29waGlzdGljYXRlZCUyMGx1eHVyeSUyMGxpdmluZyUyMHJvb20lMjBtYXJibGV8ZW58MXx8fHwxNzcxODQ2ODczfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2C2C2E', '#48484A', '#8E8E93', '#C7C7CC', '#D4AF37']
  },
  'Playful & Fun': {
    title: 'Playful & Fun',
    description: 'Whimsical details, bright accents, and creative elements spark imagination and delight.',
    imageUrl: 'https://images.unsplash.com/photo-1758687126595-edcb2bdf03bd?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwbGF5ZnVsJTIwZnVuJTIwY29sb3JmdWwlMjBtb2Rlcm4lMjByb29tfGVufDF8fHx8MTc3MTg0Njg3M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FF6B9D', '#FFC75F', '#845EC2', '#00C9A7', '#F9F871']
  },
  'Game': {
    title: 'Game',
    description: 'High-tech elements, RGB lighting, and ergonomic design optimize focus and performance.',
    imageUrl: 'https://images.unsplash.com/photo-1723792306904-c417c0da40e3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnYW1pbmclMjByb29tJTIwUkdCJTIwTEVEJTIwcHVycGxlJTIwYmx1ZSUyMG1vbml0b3JzJTIwZGVza3xlbnwxfHx8fDE3NzE4NDgyNTd8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#0F0F23', '#1E1E3F', '#00FF88', '#FF0080', '#9D00FF']
  },
  'Soft Girl': {
    title: 'Soft Girl',
    description: 'Pastel pinks, fluffy textures, and delicate details create a dreamy, gentle aesthetic.',
    imageUrl: 'https://images.unsplash.com/photo-1664347761197-b04b93f3feba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwYXN0ZWwlMjBwaW5rJTIwYmVkcm9vbSUyMHNvZnQlMjBnaXJsfGVufDF8fHx8MTc3MTg0Njg3NHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FFE5E5', '#FFC9DE', '#FFB8D1', '#FFA0C1', '#FF8FB1']
  },
  'Aesthetic': {
    title: 'Aesthetic',
    description: 'Curated visuals, artistic touches, and Instagram-worthy moments define this modern vibe.',
    imageUrl: 'https://images.unsplash.com/photo-1642293717839-e5fc6dbb7a5a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhZXN0aGV0aWMlMjBtb2Rlcm4lMjBpbnRlcmlvciUyMGluc3RhZ3JhbXxlbnwxfHx8fDE3NzE4NDY4NzV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F4ACB7', '#FFCDB2', '#FFB4A2', '#E5989B', '#B5838D']
  },
  'Professional': {
    title: 'Professional',
    description: 'Clean lines, organized spaces, and focused design support productivity and success.',
    imageUrl: 'https://images.unsplash.com/photo-1745970347652-8f22f5d7d3ba?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9mZXNzaW9uYWwlMjBvZmZpY2UlMjBpbnRlcmlvciUyMGNsZWFufGVufDF8fHx8MTc3MTg0Njg3NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7']
  },
  'Luxurious': {
    title: 'Luxurious',
    description: 'Premium materials, opulent details, and exquisite craftsmanship embody refined indulgence.',
    imageUrl: 'https://images.unsplash.com/photo-1671500073201-e408999ff8dc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cmlvdXMlMjBiZWRyb29tJTIwZ29sZCUyMGFjY2VudHN8ZW58MXx8fHwxNzcxODQ2ODc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1A1A1A', '#2E2E2E', '#D4AF37', '#C9B037', '#8B7355']
  },
  'Serene': {
    title: 'Serene',
    description: 'Minimal distractions, natural light, and balanced elements foster inner peace and clarity.',
    imageUrl: 'https://images.unsplash.com/photo-1699558983214-521c242961b1?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZXJlbmUlMjBtaW5pbWFsaXN0JTIwYmVkcm9vbSUyMG5hdHVyYWwlMjBsaWdodHxlbnwxfHx8fDE3NzE4NDY4NzZ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#D5D5D5', '#C9C9C9', '#A8C5DD']
  },
  'Moody & Dramatic': {
    title: 'Moody & Dramatic',
    description: 'Dark palettes, bold contrasts, and theatrical lighting create intense, captivating spaces.',
    imageUrl: 'https://images.unsplash.com/photo-1758972581344-85dd3ccb10db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb29keSUyMGRyYW1hdGljJTIwZGFyayUyMGxpdmluZyUyMHJvb218ZW58MXx8fHwxNzcxODQ2ODc2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#0A0A0A', '#1C1C1E', '#2C2C2E', '#48484A', '#8B4513']
  },
  'Minimal & Quiet': {
    title: 'Minimal & Quiet',
    description: 'Essential forms, restrained color, and purposeful space embrace simplicity and stillness.',
    imageUrl: 'https://images.unsplash.com/photo-1748787007524-d4bc8c7621da?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwcXVpZXQlMjB3aGl0ZSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FFFFFF', '#F5F5F5', '#E8E8E8', '#D5D5D5', '#C9C9C9']
  },
  'Bold & Expressive': {
    title: 'Bold & Expressive',
    description: 'Statement pieces, vivid colors, and fearless design choices make powerful impressions.',
    imageUrl: 'https://images.unsplash.com/photo-1758813531657-2aac59128515?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib2xkJTIwZXhwcmVzc2l2ZSUyMHN0YXRlbWVudCUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg3N3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E63946', '#F77F00', '#FCBF49', '#06A77D', '#118AB2']
  },
  'Earthy & Organic': {
    title: 'Earthy & Organic',
    description: 'Natural materials, earth tones, and biophilic elements reconnect the space with nature.',
    imageUrl: 'https://images.unsplash.com/photo-1768224461885-ea4785853779?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlYXJ0aHklMjBvcmdhbmljJTIwbmF0dXJhbCUyMHdvb2QlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzE4NDY4Nzh8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#6B5B3E', '#8B7355', '#A0826D', '#C2B280', '#D4C5A9']
  },
  'Bright & Airy': {
    title: 'Bright & Airy',
    description: 'Abundant light, open layouts, and light colors create expansive, uplifting environments.',
    imageUrl: 'https://images.unsplash.com/photo-1717703236091-c13a01c23448?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicmlnaHQlMjBhaXJ5JTIwd2hpdGUlMjBsaXZpbmclMjByb29tfGVufDF8fHx8MTc3MTg0Njg3OHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FFFFFF', '#FAFAFA', '#F0F0F0', '#E8F4F8', '#D6EAF8']
  },
  'Dark & Luxe': {
    title: 'Dark & Luxe',
    description: 'Deep tones, rich textures, and metallic accents evoke mystery and sophisticated glamour.',
    imageUrl: 'https://images.unsplash.com/photo-1639310940667-f7138678865f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkYXJrJTIwbHV4ZSUyMGludGVyaW9yJTIwZ29sZCUyMGFjY2VudHN8ZW58MXx8fHwxNzcxODQ2ODc5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#0F0F0F', '#1C1C1E', '#2C2C2E', '#D4AF37', '#8B7355']
  },
  'Artistic & Creative': {
    title: 'Artistic & Creative',
    description: 'Expressive artwork, unique finds, and eclectic touches inspire creativity and individuality.',
    imageUrl: 'https://images.unsplash.com/photo-1771196888841-d2fbe10a9d33?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnRpc3RpYyUyMGNyZWF0aXZlJTIwZWNsZWN0aWMlMjBpbnRlcmlvcnxlbnwxfHx8fDE3NzE4NDY4Nzl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#264653', '#2A9D8F', '#E9C46A', '#F4A261', '#E76F51']
  },
  'Monochrome Modern': {
    title: 'Monochrome Modern',
    description: 'Black, white, and shades of grey create timeless, sophisticated visual harmony.',
    imageUrl: 'https://images.unsplash.com/photo-1668761596087-932549fc99eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb25vY2hyb21lJTIwbW9kZXJuJTIwYmxhY2slMjB3aGl0ZSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg4MHww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#000000', '#333333', '#666666', '#999999', '#FFFFFF']
  },
  'Nature Inspired': {
    title: 'Nature Inspired',
    description: 'Botanical motifs, natural textures, and green accents bring the outdoors inside.',
    imageUrl: 'https://images.unsplash.com/photo-1768209198274-01dd8d79cd1e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuYXR1cmUlMjBpbnNwaXJlZCUyMGJvdGFuaWNhbCUyMGdyZWVuJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxODQ2ODgwfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2D5016', '#56AB2F', '#7CB342', '#A5D6A7', '#C8E6C9']
  },
  'Urban Chic': {
    title: 'Urban Chic',
    description: 'Industrial elements, modern aesthetics, and city-inspired design create cosmopolitan cool.',
    imageUrl: 'https://images.unsplash.com/photo-1681684565407-01d2933ed16f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1cmJhbiUyMGNoaWMlMjBpbmR1c3RyaWFsJTIwbG9mdHxlbnwxfHx8fDE3NzE4NDY4ODF8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3B3B3B', '#5A5A5A', '#787878', '#8C8C8C', '#A0A0A0']
  },
  'Soft & Romantic': {
    title: 'Soft & Romantic',
    description: 'Gentle curves, flowing fabrics, and tender colors evoke warmth and affection.',
    imageUrl: 'https://images.unsplash.com/photo-1664347770836-03d04faa3c04?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzb2Z0JTIwcm9tYW50aWMlMjBiZWRyb29tJTIwYmx1c2glMjBwaW5rJTIwcGFzdGVsJTIwY3VydGFpbnN8ZW58MXx8fHwxNzcxODQ4MjU3fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F8E8EE', '#F4D9E2', '#F0CAD6', '#ECBBCA', '#E8ACBE']
  },
  'Industrial Edge': {
    title: 'Industrial Edge',
    description: 'Exposed materials, raw finishes, and utilitarian design celebrate honest construction.',
    imageUrl: 'https://images.unsplash.com/photo-1627757691942-79ade9dde534?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwZWRnZSUyMGV4cG9zZWQlMjBicmljayUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg4Mnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#3E3E3E', '#5A5A5A', '#787878', '#8C6239', '#A0826D']
  },
  'Scandinavian Calm': {
    title: 'Scandinavian Calm',
    description: 'Light wood, neutral tones, and functional beauty embody Nordic design principles.',
    imageUrl: 'https://images.unsplash.com/photo-1761330439356-48ccd62f7e49?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzY2FuZGluYXZpYW4lMjBjYWxtJTIwbGlnaHQlMjB3b29kJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxODQ2ODgyfDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#F5F5F7', '#E8E8E8', '#D5D5D5', '#C9C9C9', '#A89F91']
  },
  'Contemporary Elegant': {
    title: 'Contemporary Elegant',
    description: 'Current trends, refined details, and polished execution define modern sophistication.',
    imageUrl: 'https://images.unsplash.com/photo-1760072513442-9872656c1b07?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBlbGVnYW50JTIwbW9kZXJuJTIwbGl2aW5nJTIwcm9vbXxlbnwxfHx8fDE3NzE4NDY4ODJ8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#2C2C2E', '#48484A', '#8E8E93', '#C7C7CC', '#E5E5EA']
  },
  'High Energy': {
    title: 'High Energy',
    description: 'Dynamic layouts, stimulating colors, and active spaces fuel motivation and enthusiasm.',
    imageUrl: 'https://images.unsplash.com/photo-1722648206480-92326f163769?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoaWdoJTIwZW5lcmd5JTIwZHluYW1pYyUyMGNvbG9yZnVsJTIwcm9vbXxlbnwxfHx8fDE3NzE4NDY4ODN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#FF3B3F', '#FF9500', '#FFD60A', '#34C759', '#007AFF']
  },
  'Spa-Like': {
    title: 'Spa-Like',
    description: 'Soothing elements, natural materials, and tranquil design promote wellness and relaxation.',
    imageUrl: 'https://images.unsplash.com/photo-1770941450515-50f2b8ca380b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGElMjBsaWtlJTIwdHJhbnF1aWwlMjBiYXRocm9vbSUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg4M3ww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#E8F4F8', '#D5E8ED', '#C3DCD3', '#A8C5BD', '#8DB0A8']
  },
  'Heritage Inspired': {
    title: 'Heritage Inspired',
    description: 'Traditional motifs, cultural elements, and timeless craftsmanship honor rich history.',
    imageUrl: 'https://images.unsplash.com/photo-1739028393313-29482fdc6622?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0cmFkaXRpb25hbCUyMGluZGlhbiUyMGxpdmluZyUyMHJvb20lMjBjYXJ2ZWQlMjB3b29kJTIwYnJhc3MlMjB3YXJtJTIwbGlnaHRpbmd8ZW58MXx8fHwxNzcxODQ4Mzk2fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2B48C']
  },
  'Vibrant Fusion': {
    title: 'Vibrant Fusion',
    description: 'Cultural blends, bold patterns, and eclectic combinations celebrate diversity and energy.',
    imageUrl: 'https://images.unsplash.com/photo-1736367874220-ebfa5c4f9ec6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWJyYW50JTIwZnVzaW9uJTIwZWNsZWN0aWMlMjBjb2xvcmZ1bCUyMGludGVyaW9yfGVufDF8fHx8MTc3MTg0Njg4NXww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#D95D39', '#F18F01', '#C73E1D', '#6A994E', '#A7C957']
  },
  'Premium Executive': {
    title: 'Premium Executive',
    description: 'Authoritative design, quality materials, and commanding presence project leadership.',
    imageUrl: 'https://images.unsplash.com/photo-1758448511255-ac2a24a135d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcmVtaXVtJTIwZXhlY3V0aXZlJTIwb2ZmaWNlJTIwaW50ZXJpb3J8ZW58MXx8fHwxNzcxODQ2ODg1fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    colors: ['#1A1A1A', '#2E2E2E', '#48484A', '#8E8E93', '#C7C7CC']
  }
};

export function MoodDropdown({ value, onChange }: MoodDropdownProps) {
  // State: "closed", "open", or "selected"
  const [state, setState] = useState<'closed' | 'open' | 'selected'>(
    value ? 'selected' : 'closed'
  );
  const [hoveredMood, setHoveredMood] = useState<string | null>(null);
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
          setHoveredMood(null);
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
      setHoveredMood(null);
    }
  };

  // Handle option click
  const handleOptionClick = (option: string) => {
    onChange(option);
    setState('selected');
    setHoveredMood(null);
  };

  const displayText = state === 'selected' && value ? value : 'Select mood';
  
  // Only show preview when actively hovering on a mood option
  const activePreview = hoveredMood && MOOD_PREVIEWS[hoveredMood] 
    ? MOOD_PREVIEWS[hoveredMood] 
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
        Mood / Vibe
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
              {MOOD_OPTIONS.map((option) => (
                <motion.div
                  key={option}
                  onClick={() => handleOptionClick(option)}
                  onMouseEnter={() => setHoveredMood(option)}
                  onMouseLeave={() => setHoveredMood(null)}
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

        {/* Floating Preview Card - ONLY on Hover */}
        <AnimatePresence>
          {state === 'open' && activePreview && (
            <motion.div
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{
                position: 'absolute',
                top: '50%',
                right: 'calc(100% + 24px)',
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
                  borderRadius: '14px',
                  backgroundImage: `url(${activePreview.imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  marginBottom: '16px'
                }}
              />

              {/* Mood Title */}
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
                  marginBottom: '16px'
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