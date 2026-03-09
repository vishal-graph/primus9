import { motion } from "motion/react";
import { Home, Download, Share2, Edit, Map, RefreshCw, Info, CheckCircle2, Sparkles, Grid3x3, LayoutGrid, Box, Square, CloudUpload, Palette, Building2, Sliders, Video, Armchair, X, Image, FileText, Lightbulb, Users, DollarSign, Check, Minus, Loader2, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Maximize2, LayoutDashboard, Images, Layers, Compass, Triangle, PencilRuler } from "lucide-react";
import { useNavigate } from "../utils/navigation";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Layout from "../components/Layout";
import { CustomDropdown } from "../components/CustomDropdown";
import { StatefulDropdown } from "../components/StatefulDropdown";
import { MoodDropdown } from "../components/MoodDropdown";
import { InteriorStylesDropdown } from "../components/InteriorStylesDropdown";
import { ColorPaletteDropdown } from "../components/ColorPaletteDropdown";
import { AccentColorSwatchRow } from "../components/AccentColorSwatchRow";
import heroImage from "figma:asset/cbb61108720d04d2ff8d142ee51098e6c2f1f1ef.png"; // Same hero background

// 4 Uploaded PNG Assets for Loading Animation
import imgImage3DCorner from "figma:asset/d21f94f51644333a2699ea1974b6862b9245bc01.png"; // Large 3D corner
import imgIcon from "figma:asset/25f7a0f01b3657ba23b03de42d4e77192f38e0b9.png"; // Small 3D cube room
import imgIcon1 from "figma:asset/6f35b1c63894b6b8e5fe71dcfc3210d690b10948.png"; // Vertical sheet/panel
import imgIcon2 from "figma:asset/7c7a2fc278403feb4818133f501f8057878144d8.png"; // Stacked layers

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

// Helper function to get accent color swatch colors
function getAccentSwatchColors(accent: string): string[] {
  const accentColors: Record<string, string[]> = {
    'Metallics (Gold, Silver)': ['#D4AF37', '#FFD700', '#C0C0C0', '#B8B8B8', '#E5E4E2', '#F8F8FF'],
    'Jewel Tones': ['#8B008B', '#4B0082', '#006400', '#8B0000', '#00008B', '#FF8C00'],
    'Earth Tones': ['#8B4513', '#A0522D', '#CD853F', '#DEB887', '#D2691E', '#F4A460'],
    'Pastels': ['#FADADD', '#E6E6FA', '#FFB6C1', '#B0E0E6', '#F0E68C', '#DDA0DD'],
    'Primary Colors': ['#FF0000', '#0000FF', '#FFFF00', '#FF4500', '#1E90FF', '#FFD700'],
    'None / Minimal': ['#F5F5F5', '#E8E8E8', '#FFFFFF', '#FAFAFA', '#F0F0F0', '#ECECEC'],
    'Black & White': ['#000000', '#1A1A1A', '#FFFFFF', '#F5F5F5', '#E8E8E8', '#CCCCCC'],
    'Custom Accent': ['#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3', '#F38181', '#AA96DA'],
    'Warm Neutrals': ['#D4A574', '#C9A66B', '#B89968', '#DEB887', '#E1C699', '#F5DEB3'],
    'Cool Neutrals': ['#B0C4DE', '#A8C4D0', '#87CEEB', '#D3D3D3', '#C0C0C0', '#E0E0E0'],
    'Terracotta & Clay': ['#C1666B', '#E07A5F', '#D4A574', '#A0695F', '#B8734A', '#CB997E'],
    'Forest Greens': ['#228B22', '#2E8B57', '#3CB371', '#90EE90', '#556B2F', '#6B8E23'],
    'Ocean Blues': ['#006994', '#007BA7', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF'],
    'Sunset Tones': ['#FF6B6B', '#FF8C42', '#FFD93D', '#FFA07A', '#FF7F50', '#FF6347'],
    'Industrial Greys': ['#3B3B3B', '#5A5A5A', '#787878', '#8C8C8C', '#A0A0A0', '#B4B4B4'],
    'Black & White Contrast': ['#000000', '#0D0D0D', '#FFFFFF', '#FAFAFA', '#1A1A1A', '#F5F5F5'],
    'Luxury Deep Tones': ['#2C1810', '#3E2723', '#4E342E', '#5D4037', '#6D4C41', '#795548'],
    'Soft Muted Tones': ['#D4C5B9', '#C9B8AB', '#BBA99D', '#AD9A8F', '#9F8B81', '#E8DDD3']
  };
  return accentColors[accent] || ['#444', '#555', '#666', '#777', '#888', '#999'];
}

export default function ResultsPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("floorplan");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [regenerationKey, setRegenerationKey] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [selectedDesignOption, setSelectedDesignOption] = useState<'single' | 'roomwise' | null>(null);
  const [intentFormActive, setIntentFormActive] = useState(false);
  const [intentFormType, setIntentFormType] = useState<'single' | 'roomwise' | null>(null);
  const [showRoomSelectionModal, setShowRoomSelectionModal] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [roomWiseMode, setRoomWiseMode] = useState(false);
  const [showRoomWiseForm, setShowRoomWiseForm] = useState(false);
  const [currentRoomIndex, setCurrentRoomIndex] = useState(0);
  const [roomIntentData, setRoomIntentData] = useState<Record<string, any>>({});
  const [isGeneratingMoodboard, setIsGeneratingMoodboard] = useState(false);
  const [showWhiteGlow, setShowWhiteGlow] = useState(false);
  const [previouslyHadData, setPreviouslyHadData] = useState(false);
  const [activeMoodboardRoom, setActiveMoodboardRoom] = useState<string>('');
  const [moodboardLoading, setMoodboardLoading] = useState(false);
  const [moodboardGenerated, setMoodboardGenerated] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [showGenerateGlow, setShowGenerateGlow] = useState(false);
  const [roomMoodboardStatus, setRoomMoodboardStatus] = useState<Record<string, boolean>>({});
  const [active2DView, setActive2DView] = useState<string>('Front Wall');
  const [activeComponentRoom, setActiveComponentRoom] = useState<string>('Living Room');

  // Color and Accent swatch selections per room (single-selection)
  const [colorPaletteSwatches, setColorPaletteSwatches] = useState<Record<string, number>>({});
  const [accentColorSwatches, setAccentColorSwatches] = useState<Record<string, number>>({});

  // Component table data for all rooms
  const componentTableData: Record<string, any[]> = {
    'Living Room': [
      { category: 'Furniture', name: 'Sofa', description: '3-seater sectional', material: 'Fabric', finish: 'Light Gray', size: '84" x 36"', placement: 'Center', wall: '—', confidence: '92%' },
      { category: 'Furniture', name: 'Coffee Table', description: 'Rectangular center table', material: 'Wood', finish: 'Walnut', size: '48" x 24"', placement: 'Center', wall: '—', confidence: '90%' },
      { category: 'Lighting', name: 'Pendant Light', description: 'Modern hanging dome', material: 'Metal & Glass', finish: 'Brass', size: '16" dia', placement: 'Ceiling', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Wall Art', description: 'Abstract framed canvas', material: 'Canvas', finish: 'Multicolor', size: '36" x 24"', placement: 'Wall', wall: 'Front Wall', confidence: '85%' },
      { category: 'Decor', name: 'Area Rug', description: 'Textured woven rug', material: 'Wool Blend', finish: 'Beige', size: '6\' x 9\'', placement: 'Floor', wall: '—', confidence: '87%' },
      { category: 'Furniture', name: 'TV Unit', description: 'Floating media console', material: 'MDF & Veneer', finish: 'Matte Oak', size: '72"', placement: 'Wall', wall: 'TV Wall', confidence: '91%' },
      { category: 'Lighting', name: 'Floor Lamp', description: 'Arc style lamp', material: 'Metal', finish: 'Black', size: '65" height', placement: 'Corner', wall: '—', confidence: '86%' },
      { category: 'Decor', name: 'Throw Cushions', description: 'Set of 4', material: 'Cotton', finish: 'Mixed tones', size: '18" x 18"', placement: 'Sofa', wall: '—', confidence: '84%' },
      { category: 'Storage', name: 'Bookshelf', description: 'Vertical open shelf', material: 'Engineered Wood', finish: 'Dark Brown', size: '72" height', placement: 'Side Wall', wall: 'Left', confidence: '89%' },
      { category: 'Decor', name: 'Curtains', description: 'Sheer layered drapes', material: 'Linen', finish: 'Off White', size: 'Full height', placement: 'Window', wall: 'Window Wall', confidence: '90%' },
      { category: 'Electronics', name: 'Smart TV', description: '55 inch LED', material: 'Composite', finish: 'Black', size: '55"', placement: 'Wall Mounted', wall: 'TV Wall', confidence: '93%' },
      { category: 'Furniture', name: 'Accent Chair', description: 'Lounge chair', material: 'Fabric', finish: 'Teal', size: '30" width', placement: 'Corner', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Indoor Plant', description: 'Decorative plant', material: 'Ceramic Pot', finish: 'Green', size: '3 ft', placement: 'Corner', wall: '—', confidence: '80%' },
      { category: 'Storage', name: 'Sideboard', description: 'Low cabinet', material: 'Wood', finish: 'Natural Oak', size: '60"', placement: 'Wall', wall: 'Rear Wall', confidence: '86%' },
      { category: 'Lighting', name: 'Wall Sconce', description: 'Minimal wall light', material: 'Metal', finish: 'Warm Gold', size: '12"', placement: 'Wall', wall: 'Accent Wall', confidence: '82%' },
      { category: 'Decor', name: 'Mirror', description: 'Circular mirror', material: 'Glass', finish: 'Gold Rim', size: '30" dia', placement: 'Wall', wall: 'Entry Side', confidence: '87%' },
      { category: 'Furniture', name: 'Console Table', description: 'Slim entry console', material: 'Wood', finish: 'Matte Black', size: '48"', placement: 'Entry', wall: '—', confidence: '85%' },
      { category: 'Decor', name: 'Wall Panels', description: 'Decorative slats', material: 'Wood', finish: 'Walnut', size: 'Custom', placement: 'Wall', wall: 'Feature Wall', confidence: '91%' },
      { category: 'Electronics', name: 'Soundbar', description: 'Home audio unit', material: 'Composite', finish: 'Black', size: '36"', placement: 'TV Unit', wall: '—', confidence: '89%' },
      { category: 'Lighting', name: 'Cove Lighting', description: 'Concealed strip', material: 'LED', finish: 'Warm White', size: 'Custom', placement: 'Ceiling', wall: '—', confidence: '94%' }
    ],
    'Master Bedroom': [
      { category: 'Furniture', name: 'Bed', description: 'King size platform', material: 'Upholstery', finish: 'Charcoal Gray', size: '76" x 80"', placement: 'Center', wall: 'Rear Wall', confidence: '95%' },
      { category: 'Furniture', name: 'Headboard', description: 'Tufted upholstered', material: 'Fabric', finish: 'Soft Beige', size: '84" x 60"', placement: 'Wall', wall: 'Bed Wall', confidence: '93%' },
      { category: 'Furniture', name: 'Bedside Tables', description: 'Set of 2', material: 'Wood & Veneer', finish: 'Walnut', size: '20" x 16"', placement: 'Bed Sides', wall: '—', confidence: '91%' },
      { category: 'Storage', name: 'Wardrobe', description: 'Built-in sliding door', material: 'Laminate', finish: 'Matte White', size: '96" x 84"', placement: 'Wall', wall: 'Side Wall', confidence: '94%' },
      { category: 'Furniture', name: 'Dresser', description: 'Chest of drawers', material: 'MDF & Veneer', finish: 'Natural Oak', size: '48" x 30"', placement: 'Wall', wall: 'Window Side', confidence: '88%' },
      { category: 'Furniture', name: 'Vanity Unit', description: 'Dressing table', material: 'Wood', finish: 'White Gloss', size: '42" x 18"', placement: 'Corner', wall: '—', confidence: '86%' },
      { category: 'Decor', name: 'Full Length Mirror', description: 'Standing mirror', material: 'Glass', finish: 'Champagne Gold', size: '72" height', placement: 'Corner', wall: '—', confidence: '89%' },
      { category: 'Lighting', name: 'Bedside Lamps', description: 'Set of 2 table lamps', material: 'Metal & Fabric', finish: 'Matte Black', size: '18" height', placement: 'Bedside', wall: '—', confidence: '92%' },
      { category: 'Lighting', name: 'Ceiling Light', description: 'Modern chandelier', material: 'Crystal & Metal', finish: 'Chrome', size: '24" dia', placement: 'Ceiling', wall: '—', confidence: '90%' },
      { category: 'Lighting', name: 'Pendant Lights', description: 'Hanging pair', material: 'Glass', finish: 'Smoked', size: '10" dia', placement: 'Bedside', wall: '—', confidence: '85%' },
      { category: 'Decor', name: 'Curtains', description: 'Floor length drapes', material: 'Velvet', finish: 'Navy Blue', size: 'Full height', placement: 'Window', wall: 'Window Wall', confidence: '91%' },
      { category: 'Decor', name: 'Blackout Blinds', description: 'Roller blinds', material: 'Fabric', finish: 'Cream', size: 'Window size', placement: 'Window', wall: 'Window Wall', confidence: '87%' },
      { category: 'Decor', name: 'Area Rug', description: 'Plush bedroom rug', material: 'Shaggy Fabric', finish: 'Light Gray', size: '8\' x 10\'', placement: 'Floor', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Wall Art', description: 'Set of 3 frames', material: 'Canvas', finish: 'Abstract Tones', size: '24" x 18"', placement: 'Wall', wall: 'Feature Wall', confidence: '83%' },
      { category: 'Lighting', name: 'Cove Lighting', description: 'Perimeter LED strip', material: 'LED', finish: 'Warm White', size: 'Custom', placement: 'Ceiling', wall: '—', confidence: '93%' },
      { category: 'Furniture', name: 'Accent Chair', description: 'Reading chair', material: 'Leatherette', finish: 'Tan Brown', size: '28" width', placement: 'Corner', wall: '—', confidence: '84%' },
      { category: 'Electronics', name: 'TV Unit', description: 'Wall mounted console', material: 'Veneer', finish: 'Dark Walnut', size: '55"', placement: 'Wall', wall: 'Opposite Bed', confidence: '89%' },
      { category: 'Decor', name: 'Wall Panel Upholstery', description: 'Padded feature wall', material: 'Fabric', finish: 'Dove Gray', size: 'Custom', placement: 'Wall', wall: 'Bed Wall', confidence: '92%' },
      { category: 'Storage', name: 'Storage Bench', description: 'End of bed bench', material: 'Upholstery', finish: 'Olive Green', size: '60" x 18"', placement: 'Bed End', wall: '—', confidence: '86%' },
      { category: 'Decor', name: 'Indoor Plant', description: 'Potted greenery', material: 'Ceramic Pot', finish: 'White', size: '2 ft', placement: 'Corner', wall: '—', confidence: '82%' }
    ],
    'Kitchen': [
      { category: 'Cabinetry', name: 'Base Cabinets', description: 'Modular units', material: 'Laminate', finish: 'Matte White', size: '8 ft run', placement: 'Floor', wall: 'Main Wall', confidence: '94%' },
      { category: 'Cabinetry', name: 'Wall Cabinets', description: 'Upper storage', material: 'Laminate', finish: 'High Gloss Gray', size: '8 ft run', placement: 'Wall', wall: 'Main Wall', confidence: '93%' },
      { category: 'Cabinetry', name: 'Tall Unit', description: 'Pantry cabinet', material: 'Laminate', finish: 'Matte White', size: '84" height', placement: 'Corner', wall: 'Side Wall', confidence: '91%' },
      { category: 'Appliance', name: 'Hob', description: '4 burner gas cooktop', material: 'Stainless Steel', finish: 'Brushed', size: '24" x 20"', placement: 'Countertop', wall: '—', confidence: '95%' },
      { category: 'Appliance', name: 'Chimney', description: 'Auto-clean chimney', material: 'Stainless Steel', finish: 'Black Glass', size: '36" width', placement: 'Wall', wall: 'Cooking Wall', confidence: '94%' },
      { category: 'Fixture', name: 'Sink', description: 'Double bowl sink', material: 'Stainless Steel', finish: 'Brushed', size: '32" x 18"', placement: 'Countertop', wall: '—', confidence: '92%' },
      { category: 'Fixture', name: 'Faucet', description: 'Pull-down faucet', material: 'Brass', finish: 'Chrome', size: '12" height', placement: 'Sink', wall: '—', confidence: '90%' },
      { category: 'Decor', name: 'Backsplash', description: 'Subway tile pattern', material: 'Ceramic Tiles', finish: 'White Gloss', size: '4 ft height', placement: 'Wall', wall: 'Cooking Wall', confidence: '89%' },
      { category: 'Countertop', name: 'Granite Countertop', description: 'Kitchen work surface', material: 'Granite', finish: 'Black Pearl', size: '10 ft run', placement: 'Cabinet Top', wall: '—', confidence: '93%' },
      { category: 'Appliance', name: 'Refrigerator', description: 'French door fridge', material: 'Stainless Steel', finish: 'Silver', size: '36" x 70"', placement: 'Floor', wall: 'Side Wall', confidence: '95%' },
      { category: 'Appliance', name: 'Oven', description: 'Built-in electric oven', material: 'Stainless Steel', finish: 'Black', size: '24" x 24"', placement: 'Tall Unit', wall: '—', confidence: '92%' },
      { category: 'Appliance', name: 'Microwave', description: 'Built-in microwave', material: 'Stainless Steel', finish: 'Black', size: '24" x 14"', placement: 'Wall Cabinet', wall: '—', confidence: '90%' },
      { category: 'Appliance', name: 'Dishwasher', description: 'Integrated dishwasher', material: 'Composite', finish: 'Panel Ready', size: '24" x 34"', placement: 'Base Unit', wall: '—', confidence: '88%' },
      { category: 'Storage', name: 'Open Shelves', description: 'Floating shelves', material: 'Wood', finish: 'Natural Oak', size: '36" width', placement: 'Wall', wall: 'Feature Wall', confidence: '86%' },
      { category: 'Lighting', name: 'Under Cabinet Lights', description: 'LED strip lighting', material: 'LED', finish: 'Cool White', size: 'Custom', placement: 'Cabinet Bottom', wall: '—', confidence: '91%' },
      { category: 'Furniture', name: 'Breakfast Counter', description: 'Island counter', material: 'Quartz', finish: 'Carrara White', size: '48" x 24"', placement: 'Center', wall: '—', confidence: '89%' },
      { category: 'Furniture', name: 'Bar Stools', description: 'Set of 3 stools', material: 'Metal & Wood', finish: 'Black & Oak', size: '26" height', placement: 'Counter', wall: '—', confidence: '87%' },
      { category: 'Cabinetry', name: 'Pull-out Pantry', description: 'Narrow pull-out', material: 'Laminate', finish: 'White', size: '12" width', placement: 'Base Unit', wall: '—', confidence: '85%' },
      { category: 'Storage', name: 'Cutlery Drawer', description: 'Organizer drawer', material: 'Wood', finish: 'Natural', size: '24" width', placement: 'Base Unit', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Wall Tiles', description: 'Full wall tiling', material: 'Ceramic', finish: 'Textured Gray', size: 'Full wall', placement: 'Wall', wall: 'Wet Area', confidence: '90%' }
    ],
    'Dining Room': [
      { category: 'Furniture', name: 'Dining Table', description: '8-seater rectangular', material: 'Solid Wood', finish: 'Walnut', size: '96" x 42"', placement: 'Center', wall: '—', confidence: '94%' },
      { category: 'Furniture', name: 'Dining Chairs', description: 'Set of 8 chairs', material: 'Fabric & Wood', finish: 'Gray & Walnut', size: '18" seat height', placement: 'Table', wall: '—', confidence: '93%' },
      { category: 'Lighting', name: 'Chandelier', description: 'Linear chandelier', material: 'Metal & Glass', finish: 'Brass & Clear', size: '48" length', placement: 'Ceiling', wall: '—', confidence: '92%' },
      { category: 'Storage', name: 'Sideboard', description: 'Storage credenza', material: 'Wood & Veneer', finish: 'Dark Oak', size: '72" x 34"', placement: 'Wall', wall: 'Side Wall', confidence: '90%' },
      { category: 'Storage', name: 'Crockery Unit', description: 'Glass front cabinet', material: 'Wood', finish: 'Matte Black', size: '48" x 72"', placement: 'Wall', wall: 'Feature Wall', confidence: '89%' },
      { category: 'Decor', name: 'Wall Mirror', description: 'Large decorative mirror', material: 'Glass', finish: 'Gold Frame', size: '48" x 36"', placement: 'Wall', wall: 'Side Wall', confidence: '87%' },
      { category: 'Decor', name: 'Wall Art', description: 'Statement artwork', material: 'Canvas', finish: 'Abstract', size: '60" x 40"', placement: 'Wall', wall: 'Feature Wall', confidence: '85%' },
      { category: 'Decor', name: 'Curtains', description: 'Full length drapes', material: 'Silk Blend', finish: 'Emerald Green', size: 'Full height', placement: 'Window', wall: 'Window Wall', confidence: '88%' },
      { category: 'Decor', name: 'Rug', description: 'Area rug', material: 'Wool', finish: 'Geometric Pattern', size: '10\' x 8\'', placement: 'Floor', wall: '—', confidence: '86%' },
      { category: 'Lighting', name: 'Ceiling Light', description: 'Recessed downlights', material: 'LED', finish: 'Warm White', size: '4" dia', placement: 'Ceiling', wall: '—', confidence: '91%' },
      { category: 'Decor', name: 'Accent Wall Panel', description: 'Wood slat panels', material: 'Wood', finish: 'Natural', size: 'Full wall', placement: 'Wall', wall: 'Feature Wall', confidence: '90%' },
      { category: 'Storage', name: 'Decor Shelf', description: 'Floating display shelf', material: 'Wood', finish: 'Walnut', size: '60" width', placement: 'Wall', wall: 'Side Wall', confidence: '84%' },
      { category: 'Furniture', name: 'Console', description: 'Entry console', material: 'Marble & Metal', finish: 'White & Gold', size: '48" x 16"', placement: 'Entry', wall: '—', confidence: '86%' },
      { category: 'Decor', name: 'Indoor Plant', description: 'Large potted plant', material: 'Ceramic Pot', finish: 'Matte Black', size: '4 ft', placement: 'Corner', wall: '—', confidence: '82%' },
      { category: 'Decor', name: 'Table Runner', description: 'Fabric table runner', material: 'Linen', finish: 'Natural Beige', size: '108" length', placement: 'Table', wall: '—', confidence: '83%' },
      { category: 'Decor', name: 'Centerpiece', description: 'Decorative bowl', material: 'Ceramic', finish: 'White Gloss', size: '16" dia', placement: 'Table', wall: '—', confidence: '81%' },
      { category: 'Lighting', name: 'Pendant Lights', description: 'Accent pendants', material: 'Glass', finish: 'Amber', size: '8" dia', placement: 'Sideboard', wall: '—', confidence: '87%' },
      { category: 'Lighting', name: 'Wall Sconce', description: 'Pair of sconces', material: 'Metal', finish: 'Matte Black', size: '12" height', placement: 'Wall', wall: 'Feature Wall', confidence: '85%' },
      { category: 'Storage', name: 'Storage Unit', description: 'Built-in cabinet', material: 'Laminate', finish: 'White', size: '36" x 72"', placement: 'Wall', wall: 'Storage Wall', confidence: '88%' },
      { category: 'Storage', name: 'Display Cabinet', description: 'Glass display unit', material: 'Wood & Glass', finish: 'Oak & Clear', size: '42" x 78"', placement: 'Wall', wall: 'Feature Wall', confidence: '89%' }
    ],
    'Bathroom': [
      { category: 'Fixture', name: 'Vanity Unit', description: 'Wall mounted vanity', material: 'Laminate', finish: 'Gray Oak', size: '48" x 20"', placement: 'Wall', wall: 'Basin Wall', confidence: '93%' },
      { category: 'Fixture', name: 'Mirror Cabinet', description: 'Medicine cabinet', material: 'Glass & Metal', finish: 'Aluminum Frame', size: '36" x 24"', placement: 'Wall', wall: 'Basin Wall', confidence: '91%' },
      { category: 'Decor', name: 'Wall Tiles', description: 'Ceramic wall tiles', material: 'Ceramic', finish: 'White Gloss', size: '12" x 24"', placement: 'Wall', wall: 'Wet Walls', confidence: '94%' },
      { category: 'Decor', name: 'Floor Tiles', description: 'Non-slip tiles', material: 'Porcelain', finish: 'Gray Matte', size: '24" x 24"', placement: 'Floor', wall: '—', confidence: '95%' },
      { category: 'Fixture', name: 'Shower Panel', description: 'Rain shower system', material: 'Stainless Steel', finish: 'Chrome', size: '10" x 60"', placement: 'Wall', wall: 'Shower Wall', confidence: '92%' },
      { category: 'Fixture', name: 'Glass Partition', description: 'Frameless glass', material: 'Tempered Glass', finish: 'Clear', size: '36" x 72"', placement: 'Shower', wall: '—', confidence: '90%' },
      { category: 'Fixture', name: 'WC', description: 'Wall hung toilet', material: 'Ceramic', finish: 'White', size: 'Standard', placement: 'Wall', wall: 'WC Wall', confidence: '93%' },
      { category: 'Fixture', name: 'Wash Basin', description: 'Countertop basin', material: 'Ceramic', finish: 'White', size: '18" dia', placement: 'Vanity', wall: '—', confidence: '94%' },
      { category: 'Fixture', name: 'Faucet', description: 'Single lever mixer', material: 'Brass', finish: 'Matte Black', size: '8" height', placement: 'Basin', wall: '—', confidence: '91%' },
      { category: 'Accessory', name: 'Towel Rod', description: 'Double towel rod', material: 'Stainless Steel', finish: 'Chrome', size: '24" width', placement: 'Wall', wall: 'Side Wall', confidence: '88%' },
      { category: 'Fixture', name: 'Exhaust Fan', description: 'Ventilation fan', material: 'Plastic', finish: 'White', size: '10" dia', placement: 'Ceiling', wall: '—', confidence: '89%' },
      { category: 'Storage', name: 'Wall Niche', description: 'Recessed shelf', material: 'Tile', finish: 'Matching Tiles', size: '12" x 24"', placement: 'Shower Wall', wall: 'Shower Wall', confidence: '87%' },
      { category: 'Appliance', name: 'Geyser', description: 'Electric water heater', material: 'Metal', finish: 'White', size: '25L capacity', placement: 'Wall', wall: 'Service Wall', confidence: '92%' },
      { category: 'Fixture', name: 'LED Mirror', description: 'Backlit mirror', material: 'Glass & LED', finish: 'Warm Light', size: '36" x 28"', placement: 'Wall', wall: 'Basin Wall', confidence: '90%' },
      { category: 'Accessory', name: 'Soap Dispenser', description: 'Wall mount dispenser', material: 'Ceramic', finish: 'White', size: '6" height', placement: 'Basin Wall', wall: 'Basin Wall', confidence: '85%' },
      { category: 'Storage', name: 'Storage Shelf', description: 'Corner shelf', material: 'Glass', finish: 'Frosted', size: '12" x 12"', placement: 'Corner', wall: '—', confidence: '84%' },
      { category: 'Accessory', name: 'Toilet Paper Holder', description: 'Wall mounted holder', material: 'Stainless Steel', finish: 'Chrome', size: '6" width', placement: 'Wall', wall: 'WC Wall', confidence: '86%' },
      { category: 'Fixture', name: 'Shower Mixer', description: 'Thermostatic mixer', material: 'Brass', finish: 'Chrome', size: '8" x 8"', placement: 'Shower Wall', wall: 'Shower Wall', confidence: '91%' },
      { category: 'Fixture', name: 'Drain Grating', description: 'Linear floor drain', material: 'Stainless Steel', finish: 'Brushed', size: '24" length', placement: 'Floor', wall: '—', confidence: '89%' },
      { category: 'Lighting', name: 'Ceiling Light', description: 'LED ceiling panel', material: 'LED', finish: 'Cool White', size: '12" x 12"', placement: 'Ceiling', wall: '—', confidence: '92%' }
    ],
    'Bedroom 2': [
      { category: 'Furniture', name: 'Bed', description: 'Queen size bed', material: 'Upholstery', finish: 'Light Beige', size: '60" x 80"', placement: 'Center', wall: 'Rear Wall', confidence: '93%' },
      { category: 'Furniture', name: 'Headboard', description: 'Padded headboard', material: 'Fabric', finish: 'Cream', size: '66" x 48"', placement: 'Wall', wall: 'Bed Wall', confidence: '91%' },
      { category: 'Storage', name: 'Wardrobe', description: 'Double door wardrobe', material: 'Laminate', finish: 'White Oak', size: '72" x 84"', placement: 'Wall', wall: 'Side Wall', confidence: '92%' },
      { category: 'Furniture', name: 'Study Desk', description: 'Wall mounted desk', material: 'Wood', finish: 'Natural', size: '48" x 24"', placement: 'Wall', wall: 'Window Side', confidence: '88%' },
      { category: 'Furniture', name: 'Study Chair', description: 'Ergonomic chair', material: 'Mesh & Metal', finish: 'Gray', size: 'Standard', placement: 'Desk', wall: '—', confidence: '86%' },
      { category: 'Furniture', name: 'Bedside Table', description: 'Single nightstand', material: 'Wood', finish: 'Walnut', size: '18" x 16"', placement: 'Bed Side', wall: '—', confidence: '90%' },
      { category: 'Lighting', name: 'Ceiling Fan', description: 'Fan with light', material: 'Metal', finish: 'White', size: '48" sweep', placement: 'Ceiling', wall: '—', confidence: '92%' },
      { category: 'Lighting', name: 'Table Lamp', description: 'Bedside lamp', material: 'Ceramic', finish: 'Blue', size: '16" height', placement: 'Nightstand', wall: '—', confidence: '87%' },
      { category: 'Lighting', name: 'Desk Lamp', description: 'LED desk lamp', material: 'Metal', finish: 'Black', size: '18" height', placement: 'Desk', wall: '—', confidence: '89%' },
      { category: 'Decor', name: 'Curtains', description: 'Blackout curtains', material: 'Polyester', finish: 'Gray', size: 'Full height', placement: 'Window', wall: 'Window Wall', confidence: '88%' },
      { category: 'Decor', name: 'Wall Art', description: 'Framed poster', material: 'Paper & Frame', finish: 'Colorful', size: '24" x 18"', placement: 'Wall', wall: 'Feature Wall', confidence: '82%' },
      { category: 'Decor', name: 'Area Rug', description: 'Bedroom rug', material: 'Cotton', finish: 'Light Blue', size: '5\' x 7\'', placement: 'Floor', wall: '—', confidence: '85%' },
      { category: 'Storage', name: 'Bookshelf', description: 'Wall shelf', material: 'Wood', finish: 'White', size: '36" width', placement: 'Wall', wall: 'Desk Wall', confidence: '84%' },
      { category: 'Storage', name: 'Drawer Unit', description: 'Mobile drawer', material: 'Plastic', finish: 'White', size: '15" x 24"', placement: 'Under Desk', wall: '—', confidence: '83%' },
      { category: 'Decor', name: 'Mirror', description: 'Wall mirror', material: 'Glass', finish: 'Frameless', size: '24" x 36"', placement: 'Wall', wall: 'Wardrobe Side', confidence: '86%' },
      { category: 'Decor', name: 'Indoor Plant', description: 'Small plant', material: 'Ceramic Pot', finish: 'White', size: '18" height', placement: 'Desk', wall: '—', confidence: '80%' },
      { category: 'Furniture', name: 'Ottoman', description: 'Storage ottoman', material: 'Fabric', finish: 'Gray', size: '24" x 18"', placement: 'Floor', wall: '—', confidence: '82%' },
      { category: 'Accessory', name: 'Wall Clock', description: 'Analog clock', material: 'Plastic', finish: 'Black', size: '12" dia', placement: 'Wall', wall: 'Feature Wall', confidence: '85%' },
      { category: 'Storage', name: 'Wall Hooks', description: 'Set of 4 hooks', material: 'Metal', finish: 'Brass', size: '3" each', placement: 'Wall', wall: 'Entry Wall', confidence: '84%' },
      { category: 'Lighting', name: 'LED Strip', description: 'Under bed lighting', material: 'LED', finish: 'Warm White', size: 'Custom', placement: 'Bed Base', wall: '—', confidence: '88%' }
    ],
    'Bathroom 2': [
      { category: 'Fixture', name: 'Vanity Unit', description: 'Compact vanity', material: 'MDF', finish: 'White Gloss', size: '36" x 18"', placement: 'Wall', wall: 'Basin Wall', confidence: '92%' },
      { category: 'Fixture', name: 'Mirror', description: 'Round mirror', material: 'Glass', finish: 'Black Frame', size: '24" dia', placement: 'Wall', wall: 'Basin Wall', confidence: '90%' },
      { category: 'Decor', name: 'Wall Tiles', description: 'Subway tiles', material: 'Ceramic', finish: 'Mint Green', size: '4" x 8"', placement: 'Wall', wall: 'Wet Walls', confidence: '93%' },
      { category: 'Decor', name: 'Floor Tiles', description: 'Mosaic tiles', material: 'Porcelain', finish: 'White Hex', size: '12" x 12"', placement: 'Floor', wall: '—', confidence: '94%' },
      { category: 'Fixture', name: 'Shower Enclosure', description: 'Corner shower', material: 'Glass & Aluminum', finish: 'Chrome', size: '36" x 36"', placement: 'Corner', wall: '—', confidence: '91%' },
      { category: 'Fixture', name: 'Showerhead', description: 'Overhead rain shower', material: 'Stainless Steel', finish: 'Brushed Nickel', size: '8" dia', placement: 'Ceiling', wall: '—', confidence: '89%' },
      { category: 'Fixture', name: 'Toilet', description: 'Close coupled WC', material: 'Ceramic', finish: 'White', size: 'Standard', placement: 'Floor', wall: 'WC Wall', confidence: '92%' },
      { category: 'Fixture', name: 'Wash Basin', description: 'Pedestal basin', material: 'Ceramic', finish: 'White', size: '20" width', placement: 'Floor', wall: 'Basin Wall', confidence: '93%' },
      { category: 'Fixture', name: 'Faucet', description: 'Wall mount faucet', material: 'Brass', finish: 'Chrome', size: '6" spout', placement: 'Wall', wall: 'Basin Wall', confidence: '90%' },
      { category: 'Accessory', name: 'Towel Bar', description: 'Single towel bar', material: 'Stainless Steel', finish: 'Chrome', size: '18" width', placement: 'Wall', wall: 'Side Wall', confidence: '87%' },
      { category: 'Fixture', name: 'Exhaust Fan', description: 'Ceiling fan', material: 'Plastic', finish: 'White', size: '8" dia', placement: 'Ceiling', wall: '—', confidence: '88%' },
      { category: 'Storage', name: 'Medicine Cabinet', description: 'Wall cabinet', material: 'Metal', finish: 'White', size: '16" x 20"', placement: 'Wall', wall: 'Basin Wall', confidence: '86%' },
      { category: 'Accessory', name: 'Robe Hook', description: 'Double hook', material: 'Brass', finish: 'Gold', size: '4" width', placement: 'Wall', wall: 'Door Wall', confidence: '83%' },
      { category: 'Lighting', name: 'Vanity Light', description: 'Wall sconce', material: 'Glass & Metal', finish: 'Brushed Nickel', size: '12" width', placement: 'Wall', wall: 'Mirror Side', confidence: '89%' },
      { category: 'Accessory', name: 'Soap Dish', description: 'Ceramic dish', material: 'Ceramic', finish: 'White', size: '5" width', placement: 'Wall', wall: 'Basin Area', confidence: '82%' },
      { category: 'Accessory', name: 'Toothbrush Holder', description: 'Wall mounted', material: 'Plastic', finish: 'White', size: '4" height', placement: 'Wall', wall: 'Basin Wall', confidence: '81%' },
      { category: 'Fixture', name: 'Shower Curtain Rod', description: 'Curved rod', material: 'Stainless Steel', finish: 'Chrome', size: '72" length', placement: 'Ceiling', wall: '—', confidence: '85%' },
      { category: 'Decor', name: 'Shower Curtain', description: 'Waterproof curtain', material: 'Polyester', finish: 'Geometric', size: '72" x 72"', placement: 'Rod', wall: '—', confidence: '84%' },
      { category: 'Accessory', name: 'Bath Mat', description: 'Anti-slip mat', material: 'Rubber', finish: 'Gray', size: '20" x 32"', placement: 'Floor', wall: '—', confidence: '86%' },
      { category: 'Lighting', name: 'Ceiling Light', description: 'LED downlight', material: 'LED', finish: 'Cool White', size: '6" dia', placement: 'Ceiling', wall: '—', confidence: '91%' }
    ],
    'Home Office': [
      { category: 'Furniture', name: 'Executive Desk', description: 'L-shaped desk', material: 'Wood & Metal', finish: 'Dark Walnut', size: '72" x 60"', placement: 'Corner', wall: '—', confidence: '94%' },
      { category: 'Furniture', name: 'Office Chair', description: 'Ergonomic task chair', material: 'Mesh & Leather', finish: 'Black', size: 'Adjustable', placement: 'Desk', wall: '—', confidence: '95%' },
      { category: 'Storage', name: 'Filing Cabinet', description: '3-drawer cabinet', material: 'Metal', finish: 'Gray', size: '15" x 28"', placement: 'Under Desk', wall: '—', confidence: '90%' },
      { category: 'Storage', name: 'Bookshelf', description: 'Tall open shelf', material: 'Wood', finish: 'Natural Oak', size: '36" x 72"', placement: 'Wall', wall: 'Side Wall', confidence: '91%' },
      { category: 'Lighting', name: 'Desk Lamp', description: 'Adjustable LED lamp', material: 'Metal', finish: 'Matte Black', size: '24" reach', placement: 'Desk', wall: '—', confidence: '92%' },
      { category: 'Lighting', name: 'Floor Lamp', description: 'Reading lamp', material: 'Metal', finish: 'Brass', size: '60" height', placement: 'Corner', wall: '—', confidence: '88%' },
      { category: 'Lighting', name: 'Ceiling Light', description: 'Modern pendant', material: 'Metal & Glass', finish: 'Black', size: '18" dia', placement: 'Ceiling', wall: '—', confidence: '89%' },
      { category: 'Electronics', name: 'Monitor', description: 'Dual monitor setup', material: 'LED Screen', finish: 'Black', size: '27" each', placement: 'Desk', wall: '—', confidence: '93%' },
      { category: 'Furniture', name: 'Side Table', description: 'Storage caddy', material: 'Metal', finish: 'White', size: '18" x 24"', placement: 'Desk Side', wall: '—', confidence: '86%' },
      { category: 'Storage', name: 'Wall Shelves', description: 'Floating shelves', material: 'Wood', finish: 'Walnut', size: '48" width', placement: 'Wall', wall: 'Desk Wall', confidence: '87%' },
      { category: 'Decor', name: 'Whiteboard', description: 'Magnetic board', material: 'Metal', finish: 'White', size: '36" x 24"', placement: 'Wall', wall: 'Side Wall', confidence: '85%' },
      { category: 'Decor', name: 'Bulletin Board', description: 'Cork board', material: 'Cork', finish: 'Natural', size: '24" x 18"', placement: 'Wall', wall: 'Desk Wall', confidence: '83%' },
      { category: 'Furniture', name: 'Guest Chair', description: 'Accent chair', material: 'Fabric', finish: 'Gray', size: 'Standard', placement: 'Corner', wall: '—', confidence: '84%' },
      { category: 'Decor', name: 'Area Rug', description: 'Office rug', material: 'Wool', finish: 'Dark Blue', size: '6\' x 8\'', placement: 'Floor', wall: '—', confidence: '86%' },
      { category: 'Decor', name: 'Wall Art', description: 'Motivational print', material: 'Canvas', finish: 'Black & White', size: '30" x 20"', placement: 'Wall', wall: 'Feature Wall', confidence: '82%' },
      { category: 'Decor', name: 'Indoor Plant', description: 'Large plant', material: 'Ceramic Pot', finish: 'Black', size: '4 ft', placement: 'Corner', wall: '—', confidence: '81%' },
      { category: 'Storage', name: 'Drawer Organizer', description: 'Desk organizer', material: 'Wood', finish: 'Natural', size: '12" x 8"', placement: 'Desk Top', wall: '—', confidence: '80%' },
      { category: 'Electronics', name: 'Cable Management', description: 'Cable tray', material: 'Metal', finish: 'Black', size: '48" length', placement: 'Under Desk', wall: '—', confidence: '87%' },
      { category: 'Decor', name: 'Window Blinds', description: 'Roller blinds', material: 'Fabric', finish: 'Light Gray', size: 'Window size', placement: 'Window', wall: 'Window Wall', confidence: '89%' },
      { category: 'Accessory', name: 'Wastebasket', description: 'Mesh bin', material: 'Metal', finish: 'Black', size: '12" height', placement: 'Desk Side', wall: '—', confidence: '85%' }
    ],
    'Balcony': [
      { category: 'Furniture', name: 'Outdoor Sofa', description: '2-seater sofa', material: 'Rattan', finish: 'Brown', size: '54" x 28"', placement: 'Side Wall', wall: '—', confidence: '91%' },
      { category: 'Furniture', name: 'Coffee Table', description: 'Weather-resistant table', material: 'Teak Wood', finish: 'Natural', size: '36" x 20"', placement: 'Center', wall: '—', confidence: '89%' },
      { category: 'Furniture', name: 'Outdoor Chairs', description: 'Set of 2 chairs', material: 'Metal & Fabric', finish: 'Gray', size: '24" width', placement: 'Seating Area', wall: '—', confidence: '90%' },
      { category: 'Decor', name: 'Planters', description: 'Set of 3 planters', material: 'Ceramic', finish: 'Terracotta', size: '12" height', placement: 'Floor', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Hanging Plants', description: 'Wall mounted planters', material: 'Metal', finish: 'Black', size: '8" dia', placement: 'Wall', wall: 'Railing', confidence: '85%' },
      { category: 'Fixture', name: 'Railing', description: 'Glass railing', material: 'Tempered Glass', finish: 'Clear', size: 'Full length', placement: 'Edge', wall: '—', confidence: '94%' },
      { category: 'Decor', name: 'Outdoor Rug', description: 'Weather-proof rug', material: 'Polypropylene', finish: 'Blue & White', size: '5\' x 7\'', placement: 'Floor', wall: '—', confidence: '86%' },
      { category: 'Lighting', name: 'String Lights', description: 'LED fairy lights', material: 'LED', finish: 'Warm White', size: '20 ft', placement: 'Ceiling', wall: '—', confidence: '87%' },
      { category: 'Lighting', name: 'Wall Sconce', description: 'Outdoor light', material: 'Metal', finish: 'Black', size: '12" height', placement: 'Wall', wall: 'Side Wall', confidence: '89%' },
      { category: 'Decor', name: 'Cushions', description: 'Outdoor cushions', material: 'Fabric', finish: 'Multi-color', size: '18" x 18"', placement: 'Seating', wall: '—', confidence: '84%' },
      { category: 'Furniture', name: 'Storage Box', description: 'Deck box', material: 'Plastic', finish: 'Brown', size: '48" x 24"', placement: 'Corner', wall: '—', confidence: '82%' },
      { category: 'Decor', name: 'Vertical Garden', description: 'Wall planter', material: 'Metal', finish: 'Green', size: '36" x 48"', placement: 'Wall', wall: 'Side Wall', confidence: '86%' },
      { category: 'Furniture', name: 'Bar Counter', description: 'Folding counter', material: 'Wood', finish: 'Teak', size: '48" x 16"', placement: 'Wall', wall: 'Back Wall', confidence: '83%' },
      { category: 'Furniture', name: 'Bar Stools', description: 'Set of 2 stools', material: 'Metal', finish: 'Black', size: '30" height', placement: 'Counter', wall: '—', confidence: '85%' },
      { category: 'Decor', name: 'Outdoor Curtain', description: 'Sheer curtain', material: 'Polyester', finish: 'White', size: 'Full height', placement: 'Side', wall: '—', confidence: '81%' },
      { category: 'Accessory', name: 'Umbrella', description: 'Patio umbrella', material: 'Fabric & Metal', finish: 'Beige', size: '8 ft dia', placement: 'Seating Area', wall: '—', confidence: '88%' },
      { category: 'Decor', name: 'Water Feature', description: 'Tabletop fountain', material: 'Resin', finish: 'Stone Effect', size: '18" height', placement: 'Table', wall: '—', confidence: '80%' },
      { category: 'Lighting', name: 'Solar Lights', description: 'Pathway lights', material: 'Plastic & Solar', finish: 'Black', size: '12" height', placement: 'Floor', wall: '—', confidence: '84%' },
      { category: 'Accessory', name: 'Wind Chimes', description: 'Metal chimes', material: 'Metal', finish: 'Silver', size: '24" length', placement: 'Ceiling', wall: '—', confidence: '82%' },
      { category: 'Decor', name: 'Outdoor Art', description: 'Weather-proof art', material: 'Metal', finish: 'Rust', size: '24" x 24"', placement: 'Wall', wall: 'Feature Wall', confidence: '83%' }
    ]
  };

  // Helper function to get component data for a room (with alias support)
  const getComponentDataForRoom = (roomName: string) => {
    // Try exact match first
    if (componentTableData[roomName]) {
      return componentTableData[roomName];
    }
    
    // Try aliases
    const roomAliases: Record<string, string> = {
      'Master Bedroom': 'Master Bedroom',
      'Bedroom': 'Bedroom 2',
      'Bedroom 1': 'Master Bedroom',
      'Bedroom 2': 'Bedroom 2',
      'Bathroom': 'Bathroom',
      'Bathroom 1': 'Bathroom',
      'Bathroom 2': 'Bathroom 2',
      'Living Room': 'Living Room',
      'Kitchen': 'Kitchen',
      'Dining Room': 'Dining Room',
      'Home Office': 'Home Office',
      'Study': 'Home Office',
      'Office': 'Home Office',
      'Balcony': 'Balcony',
      'Terrace': 'Balcony'
    };
    
    const mappedRoom = roomAliases[roomName];
    if (mappedRoom && componentTableData[mappedRoom]) {
      return componentTableData[mappedRoom];
    }
    
    // Fallback to Living Room if no match found
    return componentTableData['Living Room'];
  };

  // Helper function to check if current room has any filled fields
  const hasAnyFieldFilled = () => {
    const currentRoomData = roomIntentData[selectedRooms[currentRoomIndex]];
    if (!currentRoomData) return false;
    
    // Check all possible fields
    return !!(
      currentRoomData.interiorStyle ||
      currentRoomData.mood ||
      currentRoomData.colorPalette ||
      currentRoomData.accentColors ||
      currentRoomData.furnitureStyle ||
      currentRoomData.storagePreference ||
      currentRoomData.materials ||
      currentRoomData.textures ||
      currentRoomData.lightingStyle ||
      currentRoomData.lightTemperature
    );
  };

  // Helper function to check if a specific room has ALL required fields filled
  const roomIsComplete = (roomName: string) => {
    const roomData = roomIntentData[roomName];
    if (!roomData) return false;
    
    // All required fields must be filled
    return !!(
      roomData.interiorStyle &&
      roomData.mood &&
      roomData.colorPalette &&
      roomData.accentColors &&
      roomData.furnitureStyle &&
      roomData.storagePreference &&
      roomData.materials &&
      roomData.textures &&
      roomData.lightingStyle &&
      roomData.lightTemperature
    );
  };

  // Helper function to check if current room is complete
  const currentRoomComplete = () => {
    if (selectedRooms.length === 0 || currentRoomIndex >= selectedRooms.length) return false;
    return roomIsComplete(selectedRooms[currentRoomIndex]);
  };

  // Helper function to check if ALL rooms are complete
  const allRoomsComplete = () => {
    if (selectedRooms.length === 0) return false;
    return selectedRooms.every(room => roomIsComplete(room));
  };

  // Check if we're on the last room
  const isLastRoom = currentRoomIndex === selectedRooms.length - 1;

  // Determine CTA state based on CURRENT room only
  const getCTAState = () => {
    const currentRoom = selectedRooms[currentRoomIndex];
    if (!currentRoom) return { label: 'Next Room', icon: 'arrow', action: 'next', disabled: true };
    
    const isComplete = currentRoomComplete();
    const hasGeneratedMoodboard = roomMoodboardStatus[currentRoom] || false;
    
    // Rule 3: If current room moodboard is already generated, show "Next Room"
    if (hasGeneratedMoodboard) {
      return { label: 'Next Room', icon: 'arrow', action: 'next', disabled: false };
    }
    
    // Rule 2: If current room is complete but not generated, show "Generate Moodboard"
    if (isComplete && !hasGeneratedMoodboard) {
      return { label: 'Generate Moodboard', icon: 'sparkles', action: 'generate', disabled: false };
    }
    
    // Rule 1: Default - room incomplete, show "Next Room" (can be disabled or allow skip)
    return { label: 'Next Room', icon: 'arrow', action: 'next', disabled: false };
  };

  const ctaState = getCTAState();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showRoomSelectionModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showRoomSelectionModal]);

  // Auto-open Intent modal when Intent tab is clicked (only if form not active and not in room-wise mode)
  useEffect(() => {
    if (activeTab === 'intent' && !intentFormActive && !roomWiseMode) {
      setShowIntentModal(true);
      setSelectedDesignOption(null); // Reset selection when opening
    }
  }, [activeTab, intentFormActive, roomWiseMode]);

  // Trigger white glow when button changes from "Next Room" to "Create Moodboard"
  useEffect(() => {
    const hasData = hasAnyFieldFilled();
    
    // Only trigger glow on transition from empty to filled
    if (hasData && !previouslyHadData) {
      setShowWhiteGlow(true);
      // Remove glow after animation completes (400ms for white glow)
      const timer = setTimeout(() => setShowWhiteGlow(false), 400);
      setPreviouslyHadData(true);
      return () => clearTimeout(timer);
    } else if (!hasData && previouslyHadData) {
      // Reset when all fields are cleared
      setPreviouslyHadData(false);
    }
  }, [roomIntentData, currentRoomIndex, previouslyHadData]);

  // Reset previouslyHadData when switching rooms
  useEffect(() => {
    setPreviouslyHadData(false);
  }, [currentRoomIndex]);

  // Trigger glow animation when CTA changes to generate state
  useEffect(() => {
    if (ctaState.action === 'generate') {
      setShowGenerateGlow(true);
      const timer = setTimeout(() => setShowGenerateGlow(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [ctaState.action]);

  // Sync activeComponentRoom with selectedRooms
  useEffect(() => {
    if (selectedRooms.length > 0 && !selectedRooms.includes(activeComponentRoom)) {
      setActiveComponentRoom(selectedRooms[0]);
    }
  }, [selectedRooms, activeComponentRoom]);

  // ESC key listener - navigate back
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        navigate(-1);
      }
    };

    // Add event listener on mount
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup: remove event listener on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [navigate]);

  const handleFileUpload = (file: File) => {
    // Validate file type and size
    const validTypes = ['image/png', 'image/jpeg', 'application/pdf'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!validTypes.includes(file.type)) {
      alert('Please upload a PNG, JPG, or PDF file');
      return;
    }

    if (file.size > maxSize) {
      alert('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleReload = () => {
    // Trigger regeneration instead of clearing the file
    setRegenerationKey(prev => prev + 1);
  };

  const handleDeleteFloorPlan = () => {
    // Show confirmation modal
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    // Reset all floor plan related state
    setUploadedFile(null);
    setRegenerationKey(0);
    setShowDeleteConfirm(false);
    // State in FloorPlanContent (isAnalysisComplete, etc.) will reset automatically when uploadedFile is null
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const confirmResetAll = () => {
    // Reset all room intent data
    setRoomIntentData({});
    // Reset to first room
    setCurrentRoomIndex(0);
    // Reset generation state
    setMoodboardGenerated(false);
    setRoomMoodboardStatus({});
    // Close modal
    setShowResetConfirmModal(false);
  };

  const cancelResetAll = () => {
    setShowResetConfirmModal(false);
  };

  return (
    <Layout>
      {/* Background Layer - SAME blur and overlay */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 5,
          overflow: 'hidden',
          pointerEvents: 'none'
        }}
      >
        {/* Background Image Layer - SAME hero with SAME blur */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${heroImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center center',
            backgroundRepeat: 'no-repeat',
            filter: 'blur(27px)', // SAME blur as success screen
            transform: 'scale(1.08)',
            opacity: 0.75, // SAME opacity
            zIndex: 0
          }}
        />
        
        {/* Dark Overlay - SAME as success screen */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#000000',
            opacity: 0.45, // SAME opacity
            zIndex: 1,
            mixBlendMode: 'normal'
          }}
        />
      </div>

      {/* Page Shell - Scrollable Content Area (Main Content after Sidebar) */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 10,
          overflowY: 'auto',
          overflowX: 'hidden',
          paddingTop: '80px', // Account for fixed header height
          pointerEvents: 'auto',
          display: 'flex',
          justifyContent: 'center' // Center the Main Page Frame horizontally
        }}
      >
        {/* Main Page Frame - Fixed 1440px Width, Auto Layout Vertical, Top-Center Aligned */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '1440px',
            minHeight: 'calc(100vh - 80px)',
            alignItems: 'center',
            padding: 0,
            gap: 0,
            position: 'relative',
            marginTop: '-30px'
          }}
        >
          {/* Icon Navigation Rail - Absolutely Positioned */}
          <div
            style={{
              position: 'absolute',
              left: '244px',
              top: '-40px',
              width: '1050px',
              backgroundColor: 'transparent',
              paddingTop: '18px',
              paddingBottom: '18px'
            }}
          >
            {/* Horizontal Divider Line - Behind underline */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: '81px',
                width: '100%',
                height: '1px',
                background: 'rgba(255, 255, 255, 0.1)',
                zIndex: 1
              }}
            />
            
            {/* Icon Items Container - Auto Layout Horizontal */}
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                gap: '46px'
              }}
            >
              <IconRailItem
                icon={<PencilRuler size={20} />}
                label="Floor Plan"
                isActive={activeTab === "floorplan"}
                onClick={() => setActiveTab("floorplan")}
              />
              <IconRailItem
                icon={<Palette size={20} />}
                label="Intent"
                isActive={activeTab === "intent"}
                onClick={() => setActiveTab("intent")}
              />
              <IconRailItem
                icon={<Images size={20} />}
                label="Moodboard"
                isActive={activeTab === "moodboard"}
                onClick={() => setActiveTab("moodboard")}
              />
              <IconRailItem
                icon={<Box size={20} />}
                label="Elevations"
                isActive={activeTab === "elevations"}
                onClick={() => setActiveTab("elevations")}
              />
              <IconRailItem
                icon={<Maximize2 size={20} />}
                label="2D View"
                isActive={activeTab === "2dview"}
                onClick={() => setActiveTab("2dview")}
              />
              <IconRailItem
                icon={<Layers size={20} />}
                label="Components"
                isActive={activeTab === "components"}
                onClick={() => setActiveTab("components")}
              />
              <IconRailItem
                icon={<Video size={20} />}
                label="Walkthrough"
                isActive={activeTab === "walkthrough"}
                onClick={() => setActiveTab("walkthrough")}
              />
              <IconRailItem
                icon={<Download size={20} />}
                label="Export"
                isActive={activeTab === "export"}
                onClick={() => setActiveTab("export")}
              />
            </div>
          </div>

          {/* Main Content Wrapper - Absolutely Positioned for ALL Tabs */}
          <div
            style={{
              position: 'absolute',
              left: '244px',
              top: '95px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '1050px',
              paddingBottom: '60px',
              gap: '32px',
              backgroundColor: 'transparent'
            }}
          >
          {/* Room Stepper Row - Conditional, inside main wrapper */}
          {roomWiseMode && selectedRooms.length > 0 && activeTab === 'intent' && (
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: 'transparent'
              }}
            >
              <RoomStepperRow 
                selectedRooms={selectedRooms}
                currentRoomIndex={currentRoomIndex}
                activeTab={activeTab}
              />
            </div>
          )}
          {/* Floor Plan Tab Content - Centered Container */}
          {activeTab === "floorplan" && (
            <FloorPlanContent
              uploadedFile={uploadedFile}
              isDragging={isDragging}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onFileInput={handleFileInput}
              onReload={handleReload}
              onDelete={handleDeleteFloorPlan}
              regenerationKey={regenerationKey}
              setActiveTab={setActiveTab}
            />
          )}

          {/* Intent Tab Content */}
          {activeTab === "intent" && intentFormActive && intentFormType === 'single' && (
            <SingleThemeForm setActiveTab={setActiveTab} />
          )}
          
          {/* Room-wise Mode: Select Rooms Card */}
          {activeTab === "intent" && roomWiseMode && !showRoomWiseForm && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                minHeight: 'calc(100vh - 180px)'
              }}
            >
              {/* Select Rooms Card */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '780px',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(10px)',
                  borderRadius: '18px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  padding: '48px 32px',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '16px',
                  textAlign: 'center'
                }}
              >
                {/* Title */}
                <h3
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    margin: 0
                  }}
                >
                  Select Rooms to Design
                </h3>

                {/* Helper Text */}
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.65)',
                    margin: 0,
                    lineHeight: '1.5'
                  }}
                >
                  Choose which rooms you want to create moodboards for.
                </p>

                {/* Select Rooms Button */}
                <button
                  onClick={() => {
                    setShowRoomSelectionModal(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    height: '42px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    background: '#0B0B0B',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    cursor: 'pointer',
                    marginTop: '8px',
                    transition: 'all 150ms ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#111111';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#0B0B0B';
                    e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)';
                  }}
                >
                  <Grid3x3 size={16} style={{ color: 'rgba(255, 255, 255, 0.9)' }} />
                  Select Rooms
                </button>
              </div>
            </motion.div>
          )}

          {/* Room-wise Mode: Design Intent Form */}
          {activeTab === "intent" && roomWiseMode && showRoomWiseForm && (
            <motion.div
              key={`room-${currentRoomIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{
                width: '100%',
                minHeight: 'calc(100vh - 180px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                paddingBottom: '20px',
                marginTop: '-24px'
              }}
            >
              {/* Content Container - Match Icon Rail Width */}
              <div
                style={{
                  width: '100%',
                  maxWidth: '1050px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}
              >
                {/* Header Row - Title/Subtitle and Action Buttons */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    marginBottom: '16px'
                  }}
                >
                  {/* Left: Title and Subtitle */}
                  <div>
                    <h2
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '18px',
                        fontWeight: 500,
                        lineHeight: '22px',
                        color: 'rgba(255, 255, 255, 0.9)',
                        margin: '0 0 4px 0'
                      }}
                    >
                      Design Intent for {selectedRooms[currentRoomIndex]}
                    </h2>
                    <p
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.7)',
                        margin: 0
                      }}
                    >
                      Room {currentRoomIndex + 1} of {selectedRooms.length}
                    </p>
                  </div>

                  {/* Right: Action Buttons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}
                  >
                  {/* Primary Button - Generate Remaining */}
                  {(() => {
                    // Calculate incomplete rooms dynamically
                    const totalRooms = selectedRooms.length;
                    const incompleteRooms = selectedRooms.filter(room => !roomIsComplete(room)).length;
                    const roomText = incompleteRooms === 1 ? 'Room' : 'Rooms';
                    
                    // Only show button if there are incomplete rooms
                    if (incompleteRooms <= 0) return null;
                    
                    return (
                      <button
                        onClick={() => {
                          // Generate moodboards for all complete rooms
                          const completeRooms = selectedRooms.filter(room => roomIsComplete(room));
                          
                          if (completeRooms.length > 0) {
                            // Mark all complete rooms as generated
                            const newStatus: Record<string, boolean> = { ...roomMoodboardStatus };
                            completeRooms.forEach(room => {
                              newStatus[room] = true;
                            });
                            setRoomMoodboardStatus(newStatus);
                            
                            // Navigate to moodboard tab
                            setActiveMoodboardRoom(completeRooms[0]);
                            setActiveTab('moodboard');
                            setMoodboardLoading(true);
                            setMoodboardGenerated(false);
                            
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                            
                            setTimeout(() => {
                              setMoodboardLoading(false);
                              setMoodboardGenerated(true);
                            }, 3000);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          height: '36px',
                          padding: '0 14px',
                          borderRadius: '8px',
                          background: 'rgba(31, 63, 58, 0.8)',
                          border: '1px solid rgba(120, 255, 220, 0.15)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.9)',
                          cursor: 'pointer',
                          boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.06)',
                          backdropFilter: 'blur(8px)',
                          transition: 'all 150ms ease-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(40, 75, 68, 0.85)';
                          e.currentTarget.style.border = '1px solid rgba(120, 255, 220, 0.22)';
                          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 12px 2px rgba(80, 200, 180, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(31, 63, 58, 0.8)';
                          e.currentTarget.style.border = '1px solid rgba(120, 255, 220, 0.15)';
                          e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255, 255, 255, 0.06)';
                        }}
                      >
                        <Sparkles size={14} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                        Generate Remaining ({incompleteRooms} {roomText})
                      </button>
                    );
                  })()}

                  {/* Secondary Button - Reset All */}
                  <button
                    onClick={() => {
                      setShowResetConfirmModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      height: '36px',
                      padding: '0 14px',
                      borderRadius: '10px',
                      background: 'transparent',
                      border: '1px solid rgba(255, 255, 255, 0.18)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.75)',
                      cursor: 'pointer',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 150ms ease-out'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.28)';
                      e.currentTarget.style.background = 'rgba(255, 100, 100, 0.08)';
                      e.currentTarget.style.color = '#FFFFFF';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.18)';
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    }}
                  >
                    <RefreshCw size={14} />
                    Reset All
                  </button>
                  </div>
                </div>

                {/* Form Container */}
                <div
                  style={{
                    width: '100%',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '28px',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
                  }}
                >
                {/* SECTION 1: Style & Colors */}
                <div style={{ marginBottom: '20px' }}>
                  {/* Card Header with Title and Action Buttons */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '24px'
                  }}>
                    <h3
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.95)',
                        margin: 0
                      }}
                    >
                      Style & Colors
                    </h3>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {/* Reset Selection Button - Always visible */}
                      <button 
                        onClick={() => {
                          // Reset only Style & Colors fields for current room
                          const currentRoom = selectedRooms[currentRoomIndex];
                          setRoomIntentData(prev => ({
                            ...prev,
                            [currentRoom]: {
                              ...prev[currentRoom],
                              interiorStyle: '',
                              mood: '',
                              colorPalette: '',
                              accentColors: ''
                            }
                          }));
                          // Reset swatch selections to first index
                          setColorPaletteSwatches(prev => ({
                            ...prev,
                            [currentRoom]: 0
                          }));
                          setAccentColorSwatches(prev => ({
                            ...prev,
                            [currentRoom]: 0
                          }));
                        }}
                        style={{
                          height: '36px',
                          padding: '0 16px',
                          borderRadius: '8px',
                          background: 'transparent',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.7)',
                          cursor: 'pointer',
                          transition: 'all 200ms ease-out'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                        }}
                      >
                        Reset Selection
                      </button>

                      {/* View Moodboards + Start Over - Show after generation */}
                      {moodboardGenerated && (
                        <>
                          {/* View Moodboards - Primary */}
                          <button 
                            onClick={() => {
                              setActiveTab('moodboard');
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            style={{
                              height: '32px',
                              padding: '0 14px',
                              borderRadius: '10px',
                              background: 'rgba(255, 255, 255, 0.1)',
                              border: '1px solid rgba(255, 255, 255, 0.18)',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.9)',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.12)'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.14)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.28)';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.98)';
                              e.currentTarget.style.boxShadow = '0 3px 10px rgba(0, 0, 0, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.12)';
                            }}
                          >
                            <Image size={14} />
                            View Moodboards
                          </button>

                          {/* Start Over - Secondary */}
                          <button 
                            onClick={() => {
                              setShowResetConfirmModal(true);
                            }}
                            style={{
                              height: '32px',
                              padding: '0 14px',
                              borderRadius: '10px',
                              background: 'transparent',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.65)',
                              cursor: 'pointer',
                              transition: 'all 150ms ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.22)';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.88)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'transparent';
                              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                            }}
                          >
                            <RefreshCw size={13} />
                            Start Over
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Row 1 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px',
                      marginBottom: '14px'
                    }}
                  >
                    {/* Interior Styles */}
                    <InteriorStylesDropdown
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.interiorStyle || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            interiorStyle: value
                          }
                        }));
                      }}
                    />

                    {/* Mood / Vibe */}
                    <MoodDropdown
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.mood || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            mood: value
                          }
                        }));
                      }}
                    />
                  </div>

                  {/* Row 2 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px'
                    }}
                  >
                    {/* Color Palette */}
                    <ColorPaletteDropdown
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.colorPalette || ''}
                      onChange={(value) => {
                        const currentRoom = selectedRooms[currentRoomIndex];
                        setRoomIntentData(prev => ({
                          ...prev,
                          [currentRoom]: {
                            ...prev[currentRoom],
                            colorPalette: value
                          }
                        }));
                        // Reset to first swatch when palette changes
                        setColorPaletteSwatches(prev => ({
                          ...prev,
                          [currentRoom]: 0
                        }));
                      }}
                      selectedSwatchIndex={colorPaletteSwatches[selectedRooms[currentRoomIndex]] ?? 0}
                      onSwatchSelect={(index) => {
                        setColorPaletteSwatches(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: index
                        }));
                      }}
                    />

                    {/* Accent Colors */}
                    <div>
                      <StatefulDropdown
                        label="Accent Colors"
                        placeholder="Select accents"
                        options={[
                          'Metallics (Gold, Silver)',
                          'Jewel Tones',
                          'Earth Tones',
                          'Pastels',
                          'Primary Colors',
                          'None / Minimal',
                          'Black & White',
                          'Custom Accent',
                          'Warm Neutrals',
                          'Cool Neutrals',
                          'Terracotta & Clay',
                          'Forest Greens',
                          'Ocean Blues',
                          'Sunset Tones',
                          'Industrial Greys',
                          'Black & White Contrast',
                          'Luxury Deep Tones',
                          'Soft Muted Tones'
                        ]}
                        value={roomIntentData[selectedRooms[currentRoomIndex]]?.accentColors || ''}
                        onChange={(value) => {
                          const currentRoom = selectedRooms[currentRoomIndex];
                          setRoomIntentData(prev => ({
                            ...prev,
                            [currentRoom]: {
                              ...prev[currentRoom],
                              accentColors: value
                            }
                          }));
                          // Reset to first swatch when accent selection changes
                          setAccentColorSwatches(prev => ({
                            ...prev,
                            [currentRoom]: 0
                          }));
                        }}
                      />
                      
                      {/* Accent Color Swatches */}
                      {roomIntentData[selectedRooms[currentRoomIndex]]?.accentColors && (
                        <AccentColorSwatchRow
                          swatchColors={getAccentSwatchColors(roomIntentData[selectedRooms[currentRoomIndex]]?.accentColors)}
                          selectedSwatchIndex={accentColorSwatches[selectedRooms[currentRoomIndex]] ?? 0}
                          onSwatchSelect={(index) => {
                            setAccentColorSwatches(prev => ({
                              ...prev,
                              [selectedRooms[currentRoomIndex]]: index
                            }));
                          }}
                          accentKey={roomIntentData[selectedRooms[currentRoomIndex]]?.accentColors || ''}
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Furniture & Materials */}
                <div>
                  <h3
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      margin: '0 0 24px 0'
                    }}
                  >
                    Furniture & Materials
                  </h3>

                  {/* Row 1 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px',
                      marginBottom: '14px'
                    }}
                  >
                    {/* Furniture Style */}
                    <StatefulDropdown
                      label="Furniture Style"
                      placeholder="Select style"
                      options={[
                        'Modern & Sleek',
                        'Vintage / Retro',
                        'Rustic',
                        'Classic / Traditional',
                        'Contemporary',
                        'Minimalist',
                        'Industrial',
                        'Mixed Styles'
                      ]}
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.furnitureStyle || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            furnitureStyle: value
                          }
                        }));
                      }}
                    />

                    {/* Storage Preference */}
                    <StatefulDropdown
                      label="Storage Preference"
                      placeholder="Select preference"
                      options={[
                        'Minimal / Hidden',
                        'Open Shelving',
                        'Built-in Storage',
                        'Multifunctional Furniture',
                        'Traditional Cabinets',
                        'Modular Units',
                        'No Preference'
                      ]}
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.storagePreference || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            storagePreference: value
                          }
                        }));
                      }}
                    />
                  </div>

                  {/* Row 2 */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '14px'
                    }}
                  >
                    {/* Materials */}
                    <StatefulDropdown
                      label="Materials"
                      placeholder="Select materials"
                      options={[
                        'Natural Wood',
                        'Metal & Glass',
                        'Concrete',
                        'Mixed Materials',
                        'Leather & Fabric',
                        'Stone & Marble',
                        'Sustainable Materials',
                        'High-Gloss Finishes'
                      ]}
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.materials || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            materials: value
                          }
                        }));
                      }}
                    />

                    {/* Textures */}
                    <StatefulDropdown
                      label="Textures"
                      placeholder="Select textures"
                      options={[
                        'Smooth & Polished',
                        'Rough & Textured',
                        'Soft & Plush',
                        'Natural & Organic',
                        'Industrial & Raw',
                        'Layered Textures',
                        'Minimal Texture',
                        'Mixed Textures'
                      ]}
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.textures || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            textures: value
                          }
                        }));
                      }}
                    />
                  </div>
                </div>

                {/* SECTION 3: Lighting */}
                <div>
                  <h3
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '18px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      margin: '0 0 24px 0'
                    }}
                  >
                    Lighting
                  </h3>

                  {/* Lighting Row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '24px'
                    }}
                  >
                    {/* Lighting Style - Left */}
                    <StatefulDropdown
                      label="Lighting Style"
                      placeholder="Select lighting style"
                      options={[
                        'Ambient / Diffused',
                        'Task Lighting',
                        'Accent Lighting',
                        'Decorative Lighting',
                        'Mixed Layered Lighting'
                      ]}
                      value={roomIntentData[selectedRooms[currentRoomIndex]]?.lightingStyle || ''}
                      onChange={(value) => {
                        setRoomIntentData(prev => ({
                          ...prev,
                          [selectedRooms[currentRoomIndex]]: {
                            ...prev[selectedRooms[currentRoomIndex]],
                            lightingStyle: value
                          }
                        }));
                      }}
                    />

                    {/* Light Temperature - Right */}
                    <div>
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
                        Light Temperature
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '20px', alignItems: 'center', marginTop: '12px' }}>
                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            gap: '10px'
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Warm (2700K–3000K)' 
                                ? '1.5px solid rgba(255, 255, 255, 0.6)' 
                                : '1px solid rgba(255, 255, 255, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: 'transparent',
                              boxShadow: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Warm (2700K–3000K)' 
                                ? '0 0 10px 2px rgba(255, 255, 255, 0.18)' 
                                : 'none',
                              transition: 'border-color 120ms ease, box-shadow 120ms ease'
                            }}
                          >
                            {roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Warm (2700K–3000K)' && (
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#FFFFFF',
                                  animation: 'fadeInDot 120ms ease'
                                }}
                              />
                            )}
                          </div>
                          <input
                            type="radio"
                            name={`lightTemperature_${selectedRooms[currentRoomIndex]}`}
                            value="Warm (2700K–3000K)"
                            checked={roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Warm (2700K–3000K)'}
                            onChange={() => {
                              setRoomIntentData(prev => ({
                                ...prev,
                                [selectedRooms[currentRoomIndex]]: {
                                  ...prev[selectedRooms[currentRoomIndex]],
                                  lightTemperature: 'Warm (2700K–3000K)'
                                }
                              }));
                            }}
                            style={{ display: 'none' }}
                          />
                          <span
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.9)'
                            }}
                          >
                            Warm (2700K–3000K)
                          </span>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            gap: '10px'
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Neutral (3500K–4000K)' 
                                ? '1.5px solid rgba(255, 255, 255, 0.6)' 
                                : '1px solid rgba(255, 255, 255, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: 'transparent',
                              boxShadow: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Neutral (3500K–4000K)' 
                                ? '0 0 10px 2px rgba(255, 255, 255, 0.18)' 
                                : 'none',
                              transition: 'border-color 120ms ease, box-shadow 120ms ease'
                            }}
                          >
                            {roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Neutral (3500K–4000K)' && (
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#FFFFFF',
                                  animation: 'fadeInDot 120ms ease'
                                }}
                              />
                            )}
                          </div>
                          <input
                            type="radio"
                            name={`lightTemperature_${selectedRooms[currentRoomIndex]}`}
                            value="Neutral (3500K–4000K)"
                            checked={roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Neutral (3500K–4000K)'}
                            onChange={() => {
                              setRoomIntentData(prev => ({
                                ...prev,
                                [selectedRooms[currentRoomIndex]]: {
                                  ...prev[selectedRooms[currentRoomIndex]],
                                  lightTemperature: 'Neutral (3500K–4000K)'
                                }
                              }));
                            }}
                            style={{ display: 'none' }}
                          />
                          <span
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.9)'
                            }}
                          >
                            Neutral (3500K–4000K)
                          </span>
                        </label>

                        <label
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            cursor: 'pointer',
                            gap: '10px'
                          }}
                        >
                          <div
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '50%',
                              border: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Cool (4500K–5500K)' 
                                ? '1.5px solid rgba(255, 255, 255, 0.6)' 
                                : '1px solid rgba(255, 255, 255, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              backgroundColor: 'transparent',
                              boxShadow: roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Cool (4500K–5500K)' 
                                ? '0 0 10px 2px rgba(255, 255, 255, 0.18)' 
                                : 'none',
                              transition: 'border-color 120ms ease, box-shadow 120ms ease'
                            }}
                          >
                            {roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Cool (4500K–5500K)' && (
                              <div
                                style={{
                                  width: '6px',
                                  height: '6px',
                                  borderRadius: '50%',
                                  backgroundColor: '#FFFFFF',
                                  animation: 'fadeInDot 120ms ease'
                                }}
                              />
                            )}
                          </div>
                          <input
                            type="radio"
                            name={`lightTemperature_${selectedRooms[currentRoomIndex]}`}
                            value="Cool (4500K–5500K)"
                            checked={roomIntentData[selectedRooms[currentRoomIndex]]?.lightTemperature === 'Cool (4500K–5500K)'}
                            onChange={() => {
                              setRoomIntentData(prev => ({
                                ...prev,
                                [selectedRooms[currentRoomIndex]]: {
                                  ...prev[selectedRooms[currentRoomIndex]],
                                  lightTemperature: 'Cool (4500K–5500K)'
                                }
                              }));
                            }}
                            style={{ display: 'none' }}
                          />
                          <span
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              fontWeight: 500,
                              color: 'rgba(255, 255, 255, 0.9)'
                            }}
                          >
                            Cool (4500K–5500K)
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

                {/* Navigation Controls */}
                <div
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                {/* Back Button */}
                <button
                  onClick={() => {
                    if (currentRoomIndex > 0) {
                      setCurrentRoomIndex(currentRoomIndex - 1);
                    }
                  }}
                  disabled={currentRoomIndex === 0}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    backgroundColor: 'transparent',
                    border: currentRoomIndex === 0 
                      ? '1px solid rgba(255, 255, 255, 0.08)' 
                      : '1px solid rgba(255, 255, 255, 0.15)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: currentRoomIndex === 0 
                      ? 'rgba(255, 255, 255, 0.3)' 
                      : 'rgba(255, 255, 255, 0.75)',
                    cursor: currentRoomIndex === 0 ? 'not-allowed' : 'pointer',
                    transition: 'all 150ms ease-out',
                    opacity: currentRoomIndex === 0 ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (currentRoomIndex > 0) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentRoomIndex > 0) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)';
                    }
                  }}
                >
                  Back
                </button>

                {/* Dynamic CTA Button */}
                <button
                  onClick={() => {
                    const currentRoom = selectedRooms[currentRoomIndex];
                    
                    if (ctaState.action === 'generate') {
                      // Generate Moodboard for CURRENT room only
                      // Mark this room as having generated moodboard
                      setRoomMoodboardStatus(prev => ({
                        ...prev,
                        [currentRoom]: true
                      }));
                      
                      // Navigate to moodboard tab to show the generated result
                      setActiveMoodboardRoom(currentRoom);
                      setActiveTab('moodboard');
                      setMoodboardLoading(true);
                      setMoodboardGenerated(false);
                      
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                      
                      // Simulate generation - after 3 seconds show moodboard
                      setTimeout(() => {
                        setMoodboardLoading(false);
                        setMoodboardGenerated(true);
                      }, 3000);
                      
                    } else if (ctaState.action === 'next') {
                      // Next Room - move to next room or finish
                      if (currentRoomIndex < selectedRooms.length - 1) {
                        setCurrentRoomIndex(currentRoomIndex + 1);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      } else {
                        // Last room - navigate to moodboard tab
                        setActiveTab('moodboard');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }
                  }}
                  disabled={ctaState.disabled}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    borderRadius: '12px',
                    background: ctaState.action === 'generate'
                      ? 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)'
                      : '#000000',
                    border: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF',
                    cursor: ctaState.disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 200ms ease-out',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: ctaState.disabled ? 0.5 : 1,
                    boxShadow: ctaState.action === 'generate'
                      ? (showGenerateGlow 
                          ? '0 0 24px rgba(20, 184, 166, 0.6), 0 0 48px rgba(20, 184, 166, 0.3)'
                          : '0 4px 20px rgba(20, 184, 166, 0.4)')
                      : '0 2px 8px rgba(0, 0, 0, 0.15)',
                    transform: showGenerateGlow ? 'scale(1.04)' : 'scale(1)',
                    animation: showGenerateGlow ? 'ctaPulse 0.6s ease-out' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (!ctaState.disabled) {
                      if (ctaState.action === 'generate') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #0ea89a 0%, #0da872 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 24px rgba(20, 184, 166, 0.5)';
                      } else {
                        e.currentTarget.style.background = '#1a1a1a';
                      }
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!ctaState.disabled) {
                      if (ctaState.action === 'generate') {
                        e.currentTarget.style.background = 'linear-gradient(135deg, #14b8a6 0%, #10b981 100%)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(20, 184, 166, 0.4)';
                      } else {
                        e.currentTarget.style.background = '#000000';
                      }
                    }
                  }}
                >
                  <span style={{ transition: 'opacity 200ms ease-out' }}>
                    {ctaState.label}
                  </span>
                  {ctaState.icon === 'sparkles' ? (
                    <Sparkles size={16} style={{ color: '#FFFFFF' }} />
                  ) : (
                    <ChevronRight size={16} style={{ color: '#FFFFFF' }} />
                  )}
                </button>
                <style>{`
                  @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                  }
                  @keyframes fadeInDot {
                    from { opacity: 0; }
                    to { opacity: 1; }
                  }
                  @keyframes ctaPulse {
                    0% { 
                      transform: scale(1);
                    }
                    50% { 
                      transform: scale(1.04);
                    }
                    100% { 
                      transform: scale(1);
                    }
                  }
                `}</style>
              </div>
              </div>
            </motion.div>
          )}
          
          {activeTab === "intent" && !intentFormActive && !roomWiseMode && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: 'calc(100vh - 180px)',
                padding: '40px'
              }}
            >
              <div style={{ textAlign: 'center', color: 'rgba(255, 255, 255, 0.5)' }}>
                Loading preferences...
              </div>
            </div>
          )}

          {/* Moodboard Tab Content - Room-wise Moodboards */}
          {activeTab === "moodboard" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                width: '100%',
                maxWidth: '1050px',
                minHeight: 'calc(100vh - 180px)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                alignItems: 'flex-start'
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '8px' }}>
                <h2 style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '24px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.95)',
                  marginBottom: '8px',
                  letterSpacing: '-0.01em'
                }}>
                  Room-wise Moodboards
                </h2>
                <p style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.5)',
                  lineHeight: '20px'
                }}>
                  Individual design intent and moodboard for each room
                </p>
              </div>

              {/* Room Selector Chips */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                marginBottom: '8px'
              }}>
                {selectedRooms.map((room) => {
                  const isActive = activeMoodboardRoom === room;
                  return (
                    <button
                      key={room}
                      onClick={() => {
                        setActiveMoodboardRoom(room);
                        // Reset loading state for new room
                        setMoodboardLoading(true);
                        setMoodboardGenerated(false);
                        setTimeout(() => {
                          setMoodboardLoading(false);
                          setMoodboardGenerated(true);
                        }, 3000);
                      }}
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        borderRadius: '18px',
                        background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        boxShadow: isActive ? '0 0 16px 4px rgba(255, 255, 255, 0.15)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        }
                      }}
                    >
                      {room}
                    </button>
                  );
                })}
              </div>

              {/* 2-Column Layout Container (Horizontal Auto Layout with Stretch) */}
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: '24px',
                width: '100%',
                alignItems: 'stretch',
                marginLeft: '0',
                paddingLeft: '0'
              }}>
                {/* LEFT PANEL - Design Intent Summary */}
                <div style={{
                  flex: '1',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '28px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0
                }}>
                  {/* Title with Edit Icon */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px'
                  }}>
                    <h3 style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      letterSpacing: '-0.01em'
                    }}>
                      Design Intent
                    </h3>
                    
                    <button style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 150ms ease'
                      }}
                      onClick={() => setActiveTab("intent")}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }}>
                        <Edit size={14} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
                      </button>
                  </div>

                  {/* Intent Summary Content */}
                  {activeMoodboardRoom && roomIntentData[activeMoodboardRoom] && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      flex: 1,
                      justifyContent: 'space-between'
                    }}>
                      {/* Style Section */}
                      {roomIntentData[activeMoodboardRoom].interiorStyle && (
                        <>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '8px'
                            }}>
                              <Palette size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              STYLE
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {[roomIntentData[activeMoodboardRoom].interiorStyle, roomIntentData[activeMoodboardRoom].mood].filter(Boolean).map((style, idx) => (
                                <span key={idx} style={{
                                  padding: '4px 10px',
                                  borderRadius: '12px',
                                  background: 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.12)',
                                  fontFamily: 'Inter, sans-serif',
                                  fontSize: '12px',
                                  fontWeight: 400,
                                  color: 'rgba(255, 255, 255, 0.85)'
                                }}>
                                  {style}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
                        </>
                      )}

                      {/* Colors Section */}
                      {roomIntentData[activeMoodboardRoom].colorPalette && (
                        <>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '8px'
                            }}>
                              <Box size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              COLORS
                            </div>
                            <div style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              fontWeight: 400,
                              color: 'rgba(255, 255, 255, 0.75)',
                              marginBottom: '8px'
                            }}>
                              {roomIntentData[activeMoodboardRoom].colorPalette}
                            </div>
                            {/* Color Swatches */}
                            <div style={{ display: 'flex', gap: '8px' }}>
                              {['#E8DCC8', '#D4C5B0', '#8B7355', '#5A4A3A'].map((color, idx) => (
                                <div key={idx} style={{
                                  width: '16px',
                                  height: '16px',
                                  borderRadius: '50%',
                                  background: color,
                                  border: '1px solid rgba(255, 255, 255, 0.15)'
                                }} />
                              ))}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
                        </>
                      )}

                      {/* Furniture Section */}
                      {roomIntentData[activeMoodboardRoom].furnitureStyle && (
                        <>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '8px'
                            }}>
                              <Armchair size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              FURNITURE
                            </div>
                            <div style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              fontWeight: 400,
                              color: 'rgba(255, 255, 255, 0.75)'
                            }}>
                              {roomIntentData[activeMoodboardRoom].furnitureStyle}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
                        </>
                      )}

                      {/* Materials Section */}
                      {roomIntentData[activeMoodboardRoom].materials && (
                        <>
                          <div>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '11px',
                              fontWeight: 600,
                              color: 'rgba(255, 255, 255, 0.5)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              marginBottom: '8px'
                            }}>
                              <Grid3x3 size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                              MATERIALS
                            </div>
                            <div style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '13px',
                              fontWeight: 400,
                              color: 'rgba(255, 255, 255, 0.75)'
                            }}>
                              {roomIntentData[activeMoodboardRoom].materials}
                            </div>
                          </div>
                          <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />
                        </>
                      )}

                      {/* Lighting Section */}
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.5)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px'
                        }}>
                          <Lightbulb size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          LIGHTING
                        </div>
                        <div style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 400,
                          color: 'rgba(255, 255, 255, 0.75)'
                        }}>
                          Warm (2700K–3000K)
                        </div>
                      </div>
                      <div style={{ width: '100%', height: '1px', background: 'rgba(255, 255, 255, 0.06)' }} />

                      {/* Vibe Summary Section */}
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'rgba(255, 255, 255, 0.5)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          marginBottom: '8px'
                        }}>
                          <Sparkles size={16} style={{ color: 'rgba(255, 255, 255, 0.5)' }} />
                          VIBE SUMMARY
                        </div>
                        <div style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 400,
                          color: 'rgba(255, 255, 255, 0.75)',
                          lineHeight: '18px',
                          fontStyle: 'italic'
                        }}>
                          "Minimal, earthy space with warm ambient lighting and sleek modern forms."
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT PANEL - Moodboard */}
                <div style={{
                  flex: '2',
                  background: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(40px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '16px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0
                }}>
                  <h3 style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    letterSpacing: '-0.01em',
                    marginBottom: '20px'
                  }}>
                    Moodboard
                  </h3>

                  {/* Loading State */}
                  {moodboardLoading && (
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px'
                    }}>
                      {/* Spinner with Pulse */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '3px solid rgba(255, 255, 255, 0.1)',
                        borderTopColor: 'rgba(255, 255, 255, 0.6)',
                        animation: 'spin 1s linear infinite, pulse 2s ease-in-out infinite'
                      }} />
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.5)'
                      }}>
                        Queued for generation...
                      </p>
                      <style>{`
                        @keyframes pulse {
                          0%, 100% { opacity: 0.6; }
                          50% { opacity: 1; }
                        }
                      `}</style>
                    </div>
                  )}

                  {/* Generated Moodboard Preview Card */}
                  {moodboardGenerated && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4 }}
                      style={{
                        position: 'relative',
                        width: '100%',
                        height: '520px',
                        borderRadius: '20px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(20px)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        padding: '24px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        boxShadow: '0px 0px 40px rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      {/* Download Icon Button - Top Right */}
                      <button
                        title="Download Moodboard"
                        style={{
                          position: 'absolute',
                          top: '18px',
                          right: '18px',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: 'rgba(0, 0, 0, 0.2)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'all 200ms ease',
                          zIndex: 10
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.boxShadow = '0 0 12px rgba(255, 255, 255, 0.2)';
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) (icon as HTMLElement).style.color = 'rgba(255, 255, 255, 1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                          const icon = e.currentTarget.querySelector('svg');
                          if (icon) (icon as HTMLElement).style.color = 'rgba(255, 255, 255, 0.8)';
                        }}
                        onClick={() => {
                          // Download functionality placeholder
                          console.log('Download moodboard');
                        }}
                      >
                        <Download size={18} style={{ 
                          color: 'rgba(255, 255, 255, 0.8)',
                          transition: 'color 200ms ease'
                        }} />
                      </button>

                      {/* Large Image Icon */}
                      <Image size={64} style={{ color: 'rgba(255, 255, 255, 0.3)' }} />
                      
                      {/* Primary Text */}
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '14px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.7)',
                        textAlign: 'center',
                        marginTop: '8px'
                      }}>
                        AI-generated moodboard preview
                      </p>
                      
                      {/* Subtext */}
                      <p style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.5)',
                        textAlign: 'center',
                        lineHeight: '18px'
                      }}>
                        Based on your selected style, colors and materials
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Elevations Tab Content */}
          {activeTab === "elevations" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                width: '100%',
                maxWidth: '1050px',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
                paddingBottom: '40px'
              }}
            >
              {/* Header Section - Outside Glass Container */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: '24px'
                }}
              >
                  {/* Left: Title & Subtitle */}
                  <div style={{ flex: 1 }}>
                    <h2
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '20px',
                        fontWeight: 600,
                        color: 'rgba(255, 255, 255, 0.95)',
                        margin: '0 0 6px 0'
                      }}
                    >
                      Isometric Floor Elevation
                    </h2>
                    <p
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 400,
                        color: 'rgba(255, 255, 255, 0.65)',
                        margin: 0,
                        lineHeight: '18px'
                      }}
                    >
                      Bird's-eye view of your entire floor plan with all room styling applied
                    </p>
                  </div>

                  {/* Right: Status Chips & Button */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px'
                    }}
                  >
                    {/* Status Chips */}
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.08)',
                        borderRadius: '999px',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.65)'
                      }}
                    >
                      <span>13 Rooms</span>
                    </div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        backgroundColor: 'rgba(34, 197, 94, 0.12)',
                        borderRadius: '999px',
                        border: '1px solid rgba(34, 197, 94, 0.2)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'rgba(74, 222, 128, 0.9)'
                      }}
                    >
                      <span>✓</span>
                      <span>13 Styled</span>
                    </div>

                    {/* Regenerate Button */}
                    <button
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        backdropFilter: 'blur(10px)',
                        WebkitBackdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '8px',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.95)',
                        cursor: 'pointer',
                        transition: 'all 120ms ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }}
                    >
                      <RefreshCw size={14} />
                      Regenerate
                    </button>
                  </div>
                </div>

              {/* Preview Card - Glass Container */}
              <div
                style={{
                  width: '100%',
                  backgroundColor: 'rgba(255, 255, 255, 0.03)',
                  backdropFilter: 'blur(40px)',
                  WebkitBackdropFilter: 'blur(40px)',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflow: 'hidden'
                }}
              >
                {/* Preview Container */}
                <div
                  style={{
                    width: '100%',
                    height: '560px',
                    backgroundColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px'
                  }}
                >
                  {/* Skeleton Placeholder */}
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px dashed rgba(255, 255, 255, 0.12)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '16px',
                      position: 'relative'
                    }}
                  >
                    {/* Zoom Controls - Top Right Overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        zIndex: 10
                      }}
                    >
                      {/* Zoom Controls Capsule */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          backgroundColor: 'rgba(255, 255, 255, 0.06)',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '10px'
                        }}
                      >
                        {/* Zoom Out Icon */}
                        <ZoomOut 
                          size={14} 
                          style={{ 
                            color: 'rgba(255, 255, 255, 0.75)',
                            cursor: 'pointer'
                          }} 
                        />
                        
                        {/* Zoom Percentage */}
                        <span
                          style={{
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '12px',
                            fontWeight: 500,
                            color: 'rgba(255, 255, 255, 0.75)'
                          }}
                        >
                          100%
                        </span>
                        
                        {/* Zoom In Icon */}
                        <ZoomIn 
                          size={14} 
                          style={{ 
                            color: 'rgba(255, 255, 255, 0.75)',
                            cursor: 'pointer'
                          }} 
                        />
                      </div>
                      
                      {/* Download Icon - Standalone */}
                      <button
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <Download 
                          size={14} 
                          style={{ 
                            color: 'rgba(255, 255, 255, 0.75)'
                          }} 
                        />
                      </button>
                      
                      {/* Reset Icon - Standalone */}
                      <button
                        style={{
                          width: '28px',
                          height: '28px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: 'transparent',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'background-color 120ms ease',
                          padding: 0
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <RotateCcw 
                          size={14} 
                          style={{ 
                            color: 'rgba(255, 255, 255, 0.75)'
                          }} 
                        />
                      </button>
                    </div>

                    {/* Image Icon */}
                    <Image 
                      size={48} 
                      style={{ 
                        color: 'rgba(255, 255, 255, 0.25)',
                        strokeWidth: 1.5
                      }} 
                    />
                    
                    {/* Placeholder Text */}
                    <div style={{ textAlign: 'center' }}>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '15px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.5)',
                          margin: '0 0 6px 0'
                        }}
                      >
                        AI-generated elevation preview
                      </p>
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 400,
                          color: 'rgba(255, 255, 255, 0.35)',
                          margin: 0,
                          lineHeight: '18px'
                        }}
                      >
                        Based on your analyzed floor plan and selected styling
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom Metadata Row */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 28px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.55)'
                    }}
                  >
                    13 rooms visualized
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.55)'
                    }}
                  >
                    Geometric accuracy 97.9%
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.55)'
                    }}
                  >
                    Architectural accuracy 100%
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.55)'
                    }}
                  >
                    Generated 21/09/2026
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 2D View Tab Content */}
          {activeTab === "2dview" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{
                width: '100%',
                maxWidth: '1050px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                paddingBottom: '40px'
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  width: '100%'
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.95)',
                      margin: '0 0 6px 0',
                      lineHeight: '32px'
                    }}
                  >
                    2D Views
                  </h2>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0,
                      lineHeight: '18px'
                    }}
                  >
                    Five-point room views based on floor plan, moodboard, and elevation
                  </p>
                </div>
                
                {/* Generate All Rooms Button */}
                <button
                  style={{
                    padding: '10px 20px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                  }}
                >
                  Generate All Rooms
                </button>
              </div>

              {/* Room Tabs Row */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {selectedRooms.map((room, idx) => {
                  const isActive = idx === 0;
                  return (
                    <button
                      key={room}
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        borderRadius: '18px',
                        background: isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)',
                        border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        boxShadow: isActive ? '0 0 16px 4px rgba(255, 255, 255, 0.15)' : 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                        }
                      }}
                    >
                      {room}
                    </button>
                  );
                })}
              </div>

              {/* Main Two-Column Layout */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '24px',
                  width: '100%'
                }}
              >
                {/* Left: Preview Section with Button Strip & Card */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0'
                  }}
                >
                  {/* Segmented Control Bar */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderTopLeftRadius: '16px',
                      borderTopRightRadius: '16px',
                      borderBottomLeftRadius: '0',
                      borderBottomRightRadius: '0',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      height: '44px',
                      display: 'flex',
                      alignItems: 'stretch',
                      overflow: 'hidden'
                    }}
                  >
                    {['Front Wall', 'Back Wall', 'Left Wall', 'Right Wall', 'Ceiling View'].map((view, idx) => {
                      const isActive = active2DView === view;
                      return (
                      <div
                        key={view}
                        style={{
                          flex: 1,
                          display: 'flex',
                          position: 'relative'
                        }}
                      >
                        <button
                          onClick={() => setActive2DView(view)}
                          style={{
                            flex: 1,
                            backgroundColor: isActive ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                            border: 'none',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.7)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease-out',
                            boxShadow: isActive ? 'inset 0 1px 0 rgba(255, 255, 255, 0.1)' : 'none',
                            padding: '0 16px'
                          }}
                          onMouseEnter={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.85)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                            }
                          }}
                        >
                          {view}
                        </button>
                        {/* Divider */}
                        {idx < 4 && (
                          <div
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '12px',
                              bottom: '12px',
                              width: '1px',
                              backgroundColor: 'rgba(255, 255, 255, 0.08)'
                            }}
                          />
                        )}
                      </div>
                      );
                    })}
                  </div>

                  {/* Image Card */}
                  <div
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderTopLeftRadius: '0',
                      borderTopRightRadius: '0',
                      borderBottomLeftRadius: '16px',
                      borderBottomRightRadius: '16px',
                      borderTop: 'none',
                      backdropFilter: 'blur(30px)',
                      WebkitBackdropFilter: 'blur(30px)',
                      padding: '24px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '20px',
                      minHeight: '400px'
                    }}
                  >
                    {/* Image Icon */}
                    <Image
                      size={56}
                      style={{
                        color: 'rgba(255, 255, 255, 0.25)',
                        strokeWidth: 1.5
                      }}
                    />
                    
                    {/* Text */}
                    <p
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '15px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: 0
                      }}
                    >
                      No view generated yet
                    </p>
                    
                    {/* Generate Button */}
                    <button
                      style={{
                        padding: '12px 24px',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.9)',
                        cursor: 'pointer',
                        transition: 'all 120ms ease',
                        marginTop: '8px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                      }}
                    >
                      Generate 2D Views
                    </button>
                  </div>
                </div>

                {/* Right: Status Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '20px',
                    backdropFilter: 'blur(30px)',
                    WebkitBackdropFilter: 'blur(30px)',
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px'
                  }}
                >
                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0
                    }}
                  >
                    Status
                  </h3>
                  
                  {/* Tags */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {['Front Wall', 'Back Wall', 'Left Wall', 'Right Wall', 'Ceiling View'].map((tag) => (
                      <div
                        key={tag}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          backdropFilter: 'blur(12px)',
                          WebkitBackdropFilter: 'blur(12px)',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: 'rgba(255, 255, 255, 0.7)',
                          textAlign: 'center'
                        }}
                      >
                        {tag}
                      </div>
                    ))}
                  </div>
                  
                  {/* Generate Button */}
                  <button
                    style={{
                      padding: '12px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      marginTop: 'auto'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.18)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    }}
                  >
                    Generate 2D Views
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Components Tab Content */}
          {activeTab === "components" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '32px',
                width: '100%'
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '24px'
                }}
              >
                {/* Title & Subtitle */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}
                >
                  <h2
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '24px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      margin: 0
                    }}
                  >
                    Component & Material Extraction
                  </h2>
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      fontWeight: 400,
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0
                    }}
                  >
                    Room-wise component tables derived from moodboards, elevations, and 2D views
                  </p>
                </div>

                {/* Top Right Actions */}
                <div
                  style={{
                    display: 'flex',
                    gap: '12px'
                  }}
                >
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    Download CSV
                  </button>
                  <button
                    style={{
                      padding: '10px 20px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      borderRadius: '10px',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    Download Excel
                  </button>
                </div>
              </div>

              {/* Room Pills */}
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                {selectedRooms.map((room, idx) => {
                  const isActive = room === activeComponentRoom;
                  return (
                    <button
                      key={room}
                      onClick={() => setActiveComponentRoom(room)}
                      style={{
                        height: '36px',
                        padding: '0 16px',
                        borderRadius: '999px',
                        background: isActive ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                        border: `1px solid rgba(255, 255, 255, ${isActive ? '0.10' : '0.10'})`,
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: isActive ? 500 : 400,
                        color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.6)',
                        cursor: 'pointer',
                        transition: 'all 200ms ease',
                        boxShadow: isActive ? '0 0 16px 4px rgba(255, 255, 255, 0.12)' : 'none',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }
                      }}
                    >
                      {room}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons Row */}
              <div
                style={{
                  display: 'flex',
                  gap: '12px'
                }}
              >
                <button
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.95)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.2)',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.25) 0%, rgba(5, 150, 105, 0.15) 100%)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(16, 185, 129, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.1) 100%)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(16, 185, 129, 0.2)';
                  }}
                >
                  Generate for Room
                </button>
                <button
                  style={{
                    padding: '12px 24px',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    borderRadius: '12px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.9)',
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                    whiteSpace: 'nowrap'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.10)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                  }}
                >
                  Generate All Rooms
                </button>
              </div>

              {/* Glass Table Container */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '18px',
                  padding: '24px',
                  overflow: 'auto'
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'Inter, sans-serif'
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.06)'
                      }}
                    >
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Component Category
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Component Name
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Description
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Material
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Finish / Color
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Approx Size
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Placement
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Wall Location
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Suggested Buy Links
                      </th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.9)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {getComponentDataForRoom(activeComponentRoom).map((row, idx) => (
                      <tr
                        key={`${activeComponentRoom}-${idx}`}
                        style={{
                          transition: 'background-color 120ms ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.category}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.name}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.description}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.material}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.finish}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.size}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.placement}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.wall}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          <a
                            href="#"
                            style={{
                              color: 'rgba(59, 130, 246, 0.9)',
                              textDecoration: 'none',
                              transition: 'all 120ms ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.textDecoration = 'underline';
                              e.currentTarget.style.textShadow = '0 0 8px rgba(59, 130, 246, 0.6)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.textDecoration = 'none';
                              e.currentTarget.style.textShadow = 'none';
                            }}
                          >
                            View Options
                          </a>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.8)', borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
                          {row.confidence}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {/* Walkthrough Tab Content */}
          {activeTab === "walkthrough" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '40px',
                width: '100%'
              }}
            >
              {/* Section Header */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <h2
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '20px',
                    fontWeight: 600,
                    color: 'rgba(255, 255, 255, 0.95)',
                    margin: 0
                  }}
                >
                  Room Walkthroughs
                </h2>
                <p
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.5)',
                    margin: 0
                  }}
                >
                  8-second cinematic walkthroughs per room (Veo 3.1)
                </p>
              </div>

              {/* Room Pills */}
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  paddingBottom: '4px'
                }}
              >
                {selectedRooms.map((room, idx) => (
                  <button
                    key={room}
                    style={{
                      padding: '10px 20px',
                      borderRadius: '999px',
                      backgroundColor: idx === 0 ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                      border: idx === 0 ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(255, 255, 255, 0.08)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.9)',
                      cursor: 'pointer',
                      transition: 'all 120ms ease',
                      whiteSpace: 'nowrap',
                      boxShadow: idx === 0 ? '0 0 20px rgba(255, 255, 255, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15)' : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (idx !== 0) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (idx !== 0) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                  >
                    {room}
                  </button>
                ))}
              </div>

              {/* Main 2-Column Layout */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1fr',
                  gap: '32px',
                  width: '100%'
                }}
              >
                {/* Left: Preview Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '48px 32px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '24px',
                    minHeight: '400px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Video Icon */}
                  <Video
                    size={64}
                    style={{
                      color: 'rgba(255, 255, 255, 0.25)',
                      strokeWidth: 1.5
                    }}
                  />
                  
                  {/* Text */}
                  <p
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.5)',
                      margin: 0
                    }}
                  >
                    No walkthrough generated yet
                  </p>
                  
                  {/* Generate Button */}
                  <button
                    style={{
                      height: '44px',
                      padding: '0 20px',
                      backgroundColor: 'transparent',
                      border: '1.5px solid rgba(255, 255, 255, 0.8)',
                      borderRadius: '12px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      letterSpacing: '0.2px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: '0 0 18px rgba(255, 255, 255, 0.25)',
                      marginTop: '8px',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    Generate Walkthrough
                  </button>
                </div>

                {/* Right: Status Card */}
                <div
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                    boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)'
                  }}
                >
                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: 'rgba(255, 255, 255, 0.9)',
                      margin: 0
                    }}
                  >
                    Status
                  </h3>

                  {/* Status Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignSelf: 'flex-start',
                      padding: '8px 16px',
                      borderRadius: '999px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)'
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'rgba(255, 255, 255, 0.7)'
                      }}
                    >
                      Not Generated
                    </span>
                  </div>

                  {/* Generate Button */}
                  <button
                    style={{
                      height: '44px',
                      padding: '0 20px',
                      backgroundColor: 'transparent',
                      border: '1.5px solid rgba(255, 255, 255, 0.8)',
                      borderRadius: '12px',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '14px',
                      fontWeight: 500,
                      letterSpacing: '0.2px',
                      color: '#FFFFFF',
                      cursor: 'pointer',
                      transition: 'all 200ms ease',
                      boxShadow: '0 0 18px rgba(255, 255, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: 'auto',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.8)';
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.25)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.25), inset 0 0 20px rgba(255, 255, 255, 0.15)';
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.boxShadow = '0 0 18px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)';
                    }}
                  >
                    <RefreshCw size={16} strokeWidth={1.5} />
                    Generate Walkthrough
                  </button>
                </div>
              </div>
            </motion.div>
          )}
          </div>{/* End Main Content Wrapper */}
        </div>{/* End Main Page Frame */}
      </div>{/* End Page Shell */}

      {/* Reset All Confirmation Modal */}
      {showResetConfirmModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={cancelResetAll}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Modal Title */}
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '20px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: '0 0 12px 0'
              }}
            >
              Reset All Rooms?
            </h3>

            {/* Modal Message */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}
            >
              This will clear all selections across 9 rooms. This action cannot be undone.
            </p>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={cancelResetAll}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>

              {/* Reset All Button (Danger) */}
              <button
                onClick={confirmResetAll}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 80, 80, 0.15)',
                  border: '1px solid rgba(255, 80, 80, 0.4)',
                  color: 'rgba(255, 120, 120, 0.95)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 80, 80, 0.22)';
                  e.currentTarget.style.borderColor = 'rgba(255, 80, 80, 0.5)';
                  e.currentTarget.style.color = 'rgba(255, 140, 140, 1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 80, 80, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(255, 80, 80, 0.4)';
                  e.currentTarget.style.color = 'rgba(255, 120, 120, 0.95)';
                }}
              >
                Reset All
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={cancelDelete}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)'
            }}
          >
            {/* Modal Title */}
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '20px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: '0 0 12px 0'
              }}
            >
              Remove floor plan?
            </h3>

            {/* Modal Message */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.7)',
                margin: '0 0 24px 0',
                lineHeight: '1.5'
              }}
            >
              This will delete the uploaded plan and reset detected rooms.
            </p>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={cancelDelete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: 'rgba(255, 255, 255, 0.85)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                Cancel
              </button>

              {/* Remove Button (Destructive) */}
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  borderRadius: '8px',
                  backgroundColor: '#FF4444',
                  border: 'none',
                  color: '#FFFFFF',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF3333';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#FF4444';
                }}
              >
                Remove
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Intent Modal - Design Preference Selection */}
      {showIntentModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => {
            setShowIntentModal(false);
            setSelectedDesignOption(null);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(20, 20, 20, 0.92)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '32px',
              maxWidth: '640px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              position: 'relative'
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => {
                setShowIntentModal(false);
                setSelectedDesignOption(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 150ms ease-out'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              <X size={16} />
            </button>

            {/* Modal Title */}
            <h2
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '24px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: '0 0 8px 0',
                paddingRight: '40px'
              }}
            >
              How would you like to design your home?
            </h2>

            {/* Modal Subtitle */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.65)',
                margin: '0 0 28px 0',
                lineHeight: '1.5'
              }}
            >
              Choose how you want to define your design preferences
            </p>

            {/* Option Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '28px' }}>
              {/* Option 1: Single Theme */}
              <button
                onClick={() => setSelectedDesignOption('single')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: selectedDesignOption === 'single' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: selectedDesignOption === 'single' ? '1.5px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-out',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (selectedDesignOption !== 'single') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDesignOption !== 'single') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    flexShrink: 0
                  }}
                >
                  <Home size={20} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </div>

                {/* Text Content */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      marginBottom: '4px'
                    }}
                  >
                    Single Theme for Entire House
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255, 255, 255, 0.55)',
                      lineHeight: '1.5'
                    }}
                  >
                    Apply one consistent design style throughout your entire home
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedDesignOption === 'single' && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      marginLeft: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#000000'
                      }}
                    />
                  </div>
                )}
              </button>

              {/* Option 2: Room-wise Themes */}
              <button
                onClick={() => setSelectedDesignOption('roomwise')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '20px',
                  borderRadius: '12px',
                  backgroundColor: selectedDesignOption === 'roomwise' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: selectedDesignOption === 'roomwise' ? '1.5px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(255, 255, 255, 0.15)',
                  cursor: 'pointer',
                  transition: 'all 200ms ease-out',
                  textAlign: 'left'
                }}
                onMouseEnter={(e) => {
                  if (selectedDesignOption !== 'roomwise') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDesignOption !== 'roomwise') {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
                  }
                }}
              >
                {/* Icon */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '16px',
                    flexShrink: 0
                  }}
                >
                  <LayoutGrid size={20} style={{ color: 'rgba(255, 255, 255, 0.8)' }} />
                </div>

                {/* Text Content */}
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: '#FFFFFF',
                      marginBottom: '4px'
                    }}
                  >
                    Room-wise Themes
                  </div>
                  <div
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '13px',
                      fontWeight: 400,
                      color: 'rgba(255, 255, 255, 0.55)',
                      lineHeight: '1.5'
                    }}
                  >
                    Customize each room with its own unique design style
                  </div>
                </div>

                {/* Selection Indicator */}
                {selectedDesignOption === 'roomwise' && (
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                      marginLeft: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#000000'
                      }}
                    />
                  </div>
                )}
              </button>
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}
            >
              {/* Cancel Button */}
              <button
                onClick={() => {
                  setShowIntentModal(false);
                  setSelectedDesignOption(null);
                }}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.95)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                }}
              >
                Cancel
              </button>

              {/* Continue Button */}
              <button
                onClick={() => {
                  if (selectedDesignOption) {
                    setShowIntentModal(false);
                    if (selectedDesignOption === 'roomwise') {
                      // Room-wise flow: switch to Intent tab and show Select Rooms card
                      setActiveTab('intent');
                      setRoomWiseMode(true);
                    } else {
                      // Single theme flow: activate intent form
                      setIntentFormActive(true);
                      setIntentFormType(selectedDesignOption);
                    }
                  }
                }}
                disabled={!selectedDesignOption}
                style={{
                  padding: '10px 24px',
                  borderRadius: '8px',
                  backgroundColor: selectedDesignOption ? '#FFFFFF' : 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: selectedDesignOption ? '#000000' : 'rgba(255, 255, 255, 0.4)',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: selectedDesignOption ? 'pointer' : 'not-allowed',
                  transition: 'all 150ms ease-out',
                  opacity: selectedDesignOption ? 1 : 0.5
                }}
                onMouseEnter={(e) => {
                  if (selectedDesignOption) {
                    e.currentTarget.style.backgroundColor = '#F0F0F0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedDesignOption) {
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }
                }}
              >
                Continue
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Room Selection Modal */}
      {showRoomSelectionModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            overflow: 'hidden'
          }}
          onClick={() => setShowRoomSelectionModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '520px',
              maxHeight: '80vh',
              backgroundColor: '#1A1A1A',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              overflow: 'hidden'
            }}
          >
            {/* Header Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '20px',
                  fontWeight: 600,
                  color: '#FFFFFF',
                  margin: 0
                }}
              >
                Select Rooms to Design
              </h3>

              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.65)',
                  margin: 0,
                  lineHeight: '1.5'
                }}
              >
                Choose which rooms you want to create moodboards for.
              </p>

              {/* Info Banner */}
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  color: 'rgba(255, 255, 255, 0.7)',
                  lineHeight: '1.5'
                }}
              >
                You'll define design preferences for each selected room individually. Unselected rooms can be designed later.
              </div>
            </div>

            {/* Select All Row */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 0',
                marginBottom: '12px'
              }}
            >
              {/* Left: Select All Checkbox + Label */}
              <motion.div
                whileTap={{ scale: 0.96 }}
                onClick={() => {
                  const allSelected = selectedRooms.length === ROOM_DATA.length;
                  if (allSelected) {
                    setSelectedRooms([]);
                  } else {
                    setSelectedRooms(ROOM_DATA.map(room => room.id));
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
              >
                {/* Checkbox */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: `1.5px solid ${
                      selectedRooms.length === ROOM_DATA.length 
                        ? 'rgba(255, 255, 255, 0.8)' 
                        : 'rgba(255, 255, 255, 0.3)'
                    }`,
                    backgroundColor: 
                      selectedRooms.length === ROOM_DATA.length 
                        ? '#000000' 
                        : selectedRooms.length > 0 
                          ? 'rgba(0, 0, 0, 0.5)' 
                          : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 150ms ease-out'
                  }}
                >
                  {selectedRooms.length === ROOM_DATA.length && (
                    <Check size={12} style={{ color: '#FFFFFF' }} />
                  )}
                  {selectedRooms.length > 0 && selectedRooms.length < ROOM_DATA.length && (
                    <Minus size={12} style={{ color: '#FFFFFF' }} />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#FFFFFF'
                  }}
                >
                  Select All Rooms
                </span>
              </motion.div>

              {/* Right: Counter */}
              <span
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.6)'
                }}
              >
                {selectedRooms.length} selected
              </span>
            </div>

            {/* Room List Section (Scrollable) */}
            <div
              style={{
                height: '360px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                paddingRight: '4px'
              }}
            >
              {ROOM_DATA.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  isSelected={selectedRooms.includes(room.id)}
                  onToggle={() => {
                    setSelectedRooms(prev => 
                      prev.includes(room.id) 
                        ? prev.filter(id => id !== room.id)
                        : [...prev, room.id]
                    );
                  }}
                />
              ))}
            </div>

            {/* Footer Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Divider */}
              <div
                style={{
                  height: '1px',
                  backgroundColor: 'rgba(255, 255, 255, 0.06)'
                }}
              />

              {/* Buttons */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                {/* Cancel Button */}
                <button
                  onClick={() => setShowRoomSelectionModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: 'rgba(255, 255, 255, 0.7)',
                    cursor: 'pointer',
                    padding: '8px 16px',
                    transition: 'color 150ms ease-out'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
                  }}
                >
                  Cancel
                </button>

                {/* Proceed Button */}
                <button
                  onClick={() => {
                    // Handle proceeding with selected rooms
                    setShowRoomSelectionModal(false);
                    // Stay on Intent tab and show room-wise form
                    setShowRoomWiseForm(true);
                    setCurrentRoomIndex(0);
                    console.log('Proceeding with rooms:', selectedRooms);
                  }}
                  disabled={selectedRooms.length === 0}
                  style={{
                    height: '44px',
                    padding: '0 20px',
                    borderRadius: '10px',
                    background: selectedRooms.length > 0 ? '#000000' : 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: selectedRooms.length > 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)',
                    cursor: selectedRooms.length > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 150ms ease-out',
                    opacity: selectedRooms.length > 0 ? 1 : 0.5
                  }}
                  onMouseEnter={(e) => {
                    if (selectedRooms.length > 0) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedRooms.length > 0) {
                      e.currentTarget.style.background = '#000000';
                    }
                  }}
                >
                  Proceed ({selectedRooms.length} {selectedRooms.length === 1 ? 'room' : 'rooms'})
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </Layout>
  );
}

// Room Data
const ROOM_DATA = [
  { id: 'living-room', name: 'Living Room', category: 'Common Area', tag: 'Living Room' },
  { id: 'master-bedroom', name: 'Master Bedroom', category: 'Bedroom', tag: 'Bedroom' },
  { id: 'bedroom-2', name: 'Bedroom 2', category: 'Bedroom', tag: 'Bedroom' },
  { id: 'kitchen', name: 'Kitchen', category: 'Functional', tag: 'Kitchen' },
  { id: 'dining-room', name: 'Dining Room', category: 'Common Area', tag: 'Dining' },
  { id: 'bathroom-1', name: 'Bathroom 1', category: 'Functional', tag: 'Bathroom' },
  { id: 'bathroom-2', name: 'Bathroom 2', category: 'Functional', tag: 'Bathroom' },
  { id: 'home-office', name: 'Home Office', category: 'Work Space', tag: 'Office' },
  { id: 'balcony', name: 'Balcony', category: 'Outdoor', tag: 'Outdoor' }
];

// Room Card Component
function RoomCard({ 
  room, 
  isSelected, 
  onToggle 
}: { 
  room: { id: string; name: string; category: string; tag: string };
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onToggle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        height: '64px',
        borderRadius: '12px',
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.05)' : '#111111',
        border: `1.5px solid ${isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.06)'}`,
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        boxShadow: isSelected ? '0 0 12px rgba(255, 255, 255, 0.2)' : 'none',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)'
      }}
    >
      {/* Checkbox */}
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '6px',
          border: `2px solid ${isSelected ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)'}`,
          backgroundColor: isSelected ? '#000000' : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'all 150ms ease-out'
        }}
      >
        {isSelected && (
          <CheckCircle2 size={12} style={{ color: '#FFFFFF' }} />
        )}
      </div>

      {/* Room Info */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 600,
            color: '#FFFFFF'
          }}
        >
          {room.name}
        </span>
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.5)'
          }}
        >
          {room.category}
        </span>
      </div>

      {/* Tag Chip */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          padding: '4px 10px',
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.7)',
          border: isSelected ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid transparent',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          transition: 'all 150ms ease-out'
        }}
      >
        {room.tag}
      </div>
    </motion.div>
  );
}

// Palette Preview Component
function PalettePreview({ palette }: { palette: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Define color palettes
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
    'Luxury Contrast': ['#000000', '#B8860B', '#FFFFFF', '#2C2C2C', '#D4AF37', '#1A1A1A'],
    'Contemporary Monotone': ['#F0F0F0', '#E5E5E5', '#DADADA', '#CFCFCF', '#C4C4C4', '#B9B9B9'],
    'Vintage Classic': ['#8B7355', '#A0826D', '#C19A6B', '#D2B48C', '#CDAA7D', '#DEB887'],
    'Boho Blend': ['#8D5524', '#C97D60', '#E2C2A2', '#B7A99A', '#9A8777', '#D4C5B0'],
    'Nature Inspired': ['#2D5016', '#4A7C3B', '#6B9B63', '#8BB080', '#A5C49A', '#BED8B5'],
    'Sunset Palette': ['#FF6B35', '#F7931E', '#FDC830', '#E85D75', '#F48C7F', '#FFA69E'],
    'Winter Whites': ['#FAFAFA', '#F5F5F5', '#EFEFEF', '#E8E8E8', '#DCDCDC', '#F8F8F8'],
    'Deep Saturated': ['#8B0000', '#006400', '#00008B', '#8B008B', '#B8860B', '#8B4513'],
    'Muted Elegant': ['#9A8C98', '#C9ADA7', '#F2E9E4', '#A8DADC', '#B5A895', '#D5BDAF'],
    'Coastal Breeze': ['#A7C7E7', '#BFDFED', '#D4EAF2', '#89CFF0', '#6EB5D0', '#E0F2F7']
  };

  const colors = paletteColors[palette] || paletteColors['Neutral & Earthy'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
      style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px'
      }}
    >
      {colors.map((color, index) => (
        <motion.div
          key={`${palette}-${index}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.05,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: color,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            flexShrink: 0,
            cursor: 'pointer',
            transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
            boxShadow: hoveredIndex === index 
              ? '0px 0px 12px rgba(255, 255, 255, 0.15)' 
              : 'none',
            transition: 'all 200ms ease-out'
          }}
        />
      ))}
    </motion.div>
  );
}

// Accent Preview Component
function AccentPreview({ accent }: { accent: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Define accent color palettes
  const accentColors: Record<string, string[]> = {
    'Metallics (Gold, Silver)': ['#D4AF37', '#C0C0C0', '#B87333', '#8C7853', '#E6BE8A', '#A8A8A8'],
    'Jewel Tones': ['#0F3057', '#6A0572', '#9A031E', '#005F73', '#2A9D8F', '#3A0CA3'],
    'Earth Tones': ['#6B4F4F', '#8B5E3C', '#A47551', '#C2A878', '#5A3E36', '#9C6644'],
    'Pastels': ['#FADADD', '#CDE7F0', '#D5F5E3', '#FFF3B0', '#E4C1F9', '#B5EAEA'],
    'Primary Colors': ['#FF3B30', '#FF9500', '#FFD60A', '#34C759', '#007AFF', '#5856D6'],
    'None / Minimal': ['#FFFFFF', '#F5F5F7', '#EAEAEA', '#D1D1D6', '#BDBDBD', '#8E8E93'],
    'Black & White': ['#000000', '#1C1C1E', '#2C2C2E', '#FFFFFF', '#F5F5F7', '#EAEAEA'],
    'Custom Accent': ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'],
    'Warm Neutrals': ['#C9B5A0', '#D4C4B0', '#E8DDD0', '#A89985', '#BFB29E', '#F5F0E8'],
    'Cool Neutrals': ['#B8BCC4', '#D3D7DC', '#E8EAED', '#9DA3AC', '#CFD4DA', '#F0F2F5'],
    'Terracotta & Clay': ['#C1666B', '#D4A574', '#E48257', '#B8734A', '#CB997E', '#A0695F'],
    'Forest Greens': ['#2D5016', '#3D6728', '#4A7C3B', '#5A8C4E', '#6B9B63', '#8BB080'],
    'Ocean Blues': ['#003049', '#0077B6', '#0096C7', '#00B4D8', '#48CAE4', '#90E0EF'],
    'Sunset Tones': ['#FF6B35', '#F7931E', '#FDC830', '#FF8360', '#E8998D', '#F4A896'],
    'Industrial Greys': ['#3E3E3E', '#5C5C5C', '#7A7A7A', '#989898', '#B6B6B6', '#D4D4D4'],
    'Black & White Contrast': ['#000000', '#1A1A1A', '#333333', '#CCCCCC', '#E6E6E6', '#FFFFFF'],
    'Luxury Deep Tones': ['#1A1A2E', '#2E294E', '#541388', '#8B3A62', '#A64253', '#C95D63'],
    'Soft Muted Tones': ['#D5BDAF', '#E3CAA5', '#ADEFD1', '#C9ADA7', '#A8DADC', '#F1FAEE']
  };

  const colors = accentColors[accent] || accentColors['None / Minimal'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
      style={{
        marginTop: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '10px'
      }}
    >
      {colors.map((color, index) => (
        <motion.div
          key={`${accent}-${index}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ 
            duration: 0.3, 
            delay: index * 0.05,
            ease: [0.34, 1.56, 0.64, 1]
          }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            backgroundColor: color,
            border: '1px solid rgba(255, 255, 255, 0.15)',
            flexShrink: 0,
            cursor: 'pointer',
            transform: hoveredIndex === index ? 'scale(1.05)' : 'scale(1)',
            boxShadow: hoveredIndex === index 
              ? '0px 0px 12px rgba(255, 255, 255, 0.15)' 
              : 'none',
            transition: 'all 200ms ease-out'
          }}
        />
      ))}
    </motion.div>
  );
}

// Room Stepper Row Component
function RoomStepperRow({ selectedRooms, currentRoomIndex, activeTab }: { selectedRooms: string[]; currentRoomIndex: number; activeTab: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        paddingTop: '12px',
        paddingBottom: '12px'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1050px',
          overflowX: 'auto',
          overflowY: 'visible'
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingLeft: '8px',
            paddingRight: '8px'
          }}
        >
        {/* Background Progress Line - Behind all circles */}
        <div
          style={{
            position: 'absolute',
            top: '30px', // 12px padding + 18px (half of 36px circle) = center of circle
            left: '26px', // Start from center of first circle (8px padding + 18px)
            right: '26px', // End at center of last circle
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            zIndex: 0
          }}
        />

        {/* Progress Highlight Line - Shows completion with smooth animation */}
        <div
          style={{
            position: 'absolute',
            top: '30px',
            left: '26px',
            width: `calc(${(currentRoomIndex / (selectedRooms.length - 1)) * 100}%)`,
            height: '2px',
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            zIndex: 0,
            transition: 'width 400ms cubic-bezier(0.25, 0.1, 0.25, 1.0)',
            transformOrigin: 'left center'
          }}
        />

        {/* Step Indicators Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            width: '100%',
            position: 'relative',
            zIndex: 1
          }}
        >
          {selectedRooms.map((room, index) => {
            const isActive = index === currentRoomIndex;
            const isCompleted = index < currentRoomIndex;

            return (
              <div
                key={room}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 8px',
                  overflow: 'visible'
                }}
              >
                {/* Circle with solid background layer to block line */}
                <div
                  style={{
                    position: 'relative',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 2
                  }}
                >
                  {/* Solid background circle to block the line */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      backgroundColor: '#0B0B0B',
                      zIndex: 1
                    }}
                  />
                  
                  {/* Visual circle with styling */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      backgroundColor: isActive 
                        ? '#000000' 
                        : isCompleted 
                        ? '#111111' 
                        : 'rgba(255, 255, 255, 0.06)',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'visible',
                      boxShadow: (isActive && activeTab === 'intent')
                        ? '0 0 24px 6px rgba(255, 255, 255, 0.28), 0 0 40px 10px rgba(255, 255, 255, 0.15)' 
                        : 'none',
                      transition: 'background-color 120ms ease, box-shadow 120ms ease',
                      zIndex: 2
                    }}
                  >
                    {isCompleted ? (
                      <Check size={16} style={{ color: '#FFFFFF' }} />
                    ) : (
                      <span
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '13px',
                          fontWeight: 600,
                          color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.4)'
                        }}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                </div>

                {/* Room Label */}
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '11px',
                    fontWeight: isActive ? 500 : 400,
                    color: isActive ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.4)',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {room}
                </span>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}

// Icon Rail Item Component
function IconRailItem({ 
  icon, 
  label, 
  isActive, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '6px 12px 0px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        transition: 'all 150ms ease-out'
      }}
      onClick={onClick}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileTap={{ scale: 0.97 }}
    >
      {/* Content Stack - Icon + Label + Indicator in single vertical stack */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          width: 'fit-content'
        }}
      >
        {/* Icon */}
        <div 
          style={{ 
            color: isActive ? '#FFFFFF' : isHovered ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.55)',
            filter: isActive ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))' : 'none',
            transition: 'all 150ms ease-out',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
        
        {/* Label */}
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: isActive ? '#FFFFFF' : isHovered ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.55)',
            filter: isActive ? 'drop-shadow(0 0 7px rgba(255, 255, 255, 0.45))' : 'none',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            transition: 'all 150ms ease-out'
          }}
        >
          {label}
        </span>
        
        {/* Indicator - part of the same stack */}
        <div
          style={{
            height: '2px',
            width: isActive ? '100%' : '0%', // Match label width when active
            background: '#FFFFFF',
            boxShadow: isActive ? '0 0 10px rgba(255, 255, 255, 0.6)' : 'none',
            borderRadius: '1px',
            marginTop: '6px', // Spacing from label
            transition: 'all 200ms cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: isActive ? 1 : 0
          }}
        />
      </div>
    </motion.button>
  );
}

// Function to calculate underline position based on active tab
function getUnderlinePositionPixels(tab: string) {
  // Each tab width = label width + padding (12px left + 12px right = 24px)
  // Gap between tabs is 80px
  // Calculate cumulative position and center the indicator under each tab's content
  
  const padding = 24; // 12px left + 12px right
  const gap = 80;
  
  // Get label widths for each tab
  const labelWidths: Record<string, number> = {
    overview: 55,
    floorplan: 65,
    rooms: 44,
    designs: 52,
    insights: 69,
    materials: 61,
    cost: 82
  };
  
  // Calculate tab widths (label width + padding)
  const tabWidths: Record<string, number> = {
    overview: 55 + padding, // 79px
    floorplan: 65 + padding, // 89px
    rooms: 44 + padding, // 68px
    designs: 52 + padding, // 76px
    insights: 69 + padding, // 93px
    materials: 61 + padding, // 85px
    cost: 82 + padding // 106px
  };
  
  // Get the indicator width for current tab
  const indicatorWidth = labelWidths[tab];
  
  // Calculate cumulative position for each tab
  let position = 0;
  const tabOrder = ['overview', 'floorplan', 'rooms', 'designs', 'insights', 'materials', 'cost'];
  
  for (const t of tabOrder) {
    if (t === tab) {
      // Found the active tab - calculate center position
      const tabCenter = position + (tabWidths[t] / 2);
      const indicatorStart = tabCenter - (indicatorWidth / 2);
      return `${indicatorStart}px`;
    }
    // Move to next tab position
    position += tabWidths[t] + gap;
  }
  
  return '0px';
}

// Function to calculate underline width based on active tab
function getUnderlineWidthPixels(tab: string) {
  // Width matches the exact text label width for each tab
  // These measurements are based on 12px Inter font, weight 500
  switch (tab) {
    case "overview":
      return '55px'; // "Overview" text width
    case "floorplan":
      return '65px'; // "Floor Plan" text width
    case "rooms":
      return '44px'; // "Rooms" text width
    case "designs":
      return '52px'; // "Designs" text width
    case "insights":
      return '69px'; // "AI Insights" text width
    case "materials":
      return '61px'; // "Materials" text width
    case "cost":
      return '82px'; // "Cost Estimate" text width
    default:
      return '55px';
  }
}

// Single Theme Preference Form Component
function SingleThemeForm({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [interiorStyles, setInteriorStyles] = useState<string[]>([]);
  const [mood, setMood] = useState('');
  const [culturalInfluence, setCulturalInfluence] = useState('');
  const [primaryColorPalette, setPrimaryColorPalette] = useState('');
  const [accentColors, setAccentColors] = useState('');
  const [preferredMaterials, setPreferredMaterials] = useState('');
  const [textures, setTextures] = useState('');
  const [furnitureStyle, setFurnitureStyle] = useState('');
  const [storagePreference, setStoragePreference] = useState('Moderate / Balanced');
  const [comfortAestheticsValue, setComfortAestheticsValue] = useState(50);
  const [layoutPreference, setLayoutPreference] = useState('Mixed/Flexible');
  const [showStyleDropdown, setShowStyleDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputFieldRef = useRef<HTMLDivElement>(null);
  
  // New section states
  const [naturalLightImportance, setNaturalLightImportance] = useState(50);
  const [artificialLightingStyle, setArtificialLightingStyle] = useState('');
  const [lightTemperature, setLightTemperature] = useState('Neutral (3500K–4000K)');
  const [householdType, setHouseholdType] = useState('');
  const [entertainingFocus, setEntertainingFocus] = useState('');
  const [hasChildren, setHasChildren] = useState(false);
  const [hasElderly, setHasElderly] = useState(false);
  const [hasPets, setHasPets] = useState(false);
  const [workFromHome, setWorkFromHome] = useState(false);
  const [budgetRange, setBudgetRange] = useState('');
  const [maintenanceTolerance, setMaintenanceTolerance] = useState('');
  const [executionPriority, setExecutionPriority] = useState('Design Quality First');

  const availableStyles = [
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

  const toggleStyle = (style: string) => {
    if (interiorStyles.includes(style)) {
      setInteriorStyles(interiorStyles.filter(s => s !== style));
    } else if (interiorStyles.length < 3) {
      setInteriorStyles([...interiorStyles, style]);
    }
  };

  const removeStyle = (style: string) => {
    setInteriorStyles(interiorStyles.filter(s => s !== style));
  };

  // Update dropdown position when opened
  useEffect(() => {
    if (showStyleDropdown && inputFieldRef.current) {
      const rect = inputFieldRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width
      });
    }
  }, [showStyleDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown-container]')) {
        setShowStyleDropdown(false);
      }
    };

    if (showStyleDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStyleDropdown]);

  // Update position on scroll/resize
  useEffect(() => {
    if (!showStyleDropdown) return;

    const updatePosition = () => {
      if (inputFieldRef.current) {
        const rect = inputFieldRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width
        });
      }
    };

    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showStyleDropdown]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1076px',
        marginLeft: '0',
        marginRight: '0',
        paddingLeft: '0px',
        paddingRight: '0px',
        paddingTop: '40px',
        paddingBottom: '40px'
      }}
    >
      {/* Progress Indicator */}
      <div
        style={{
          marginBottom: '32px',
          paddingBottom: '20px'
        }}
      >
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.6)',
            letterSpacing: '0.5px'
          }}
        >
          STEP 1 OF 3
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '20px',
            fontWeight: 600,
            color: '#FFFFFF',
            marginTop: '6px'
          }}
        >
          Define Your Style
        </div>
      </div>

      {/* Section 1: Overall Style Direction */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginTop: '-20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <Sparkles size={16} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '17px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Overall Style Direction
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.7)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Define the core aesthetic and mood for your home
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', overflow: 'visible' }}>
          {/* Interior Styles Field with Tag Display */}
          <div>
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
              Interior Styles (Select up to 3)
            </label>
            
            {/* Custom Multi-Select Field */}
            <div style={{ position: 'relative' }} data-dropdown-container>
              <div
                ref={inputFieldRef}
                onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                style={{
                  minHeight: '44px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                  alignItems: 'center',
                  transition: 'all 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  if (!showStyleDropdown) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!showStyleDropdown) {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                {interiorStyles.length === 0 ? (
                  <span style={{ 
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.4)',
                    padding: '4px 0'
                  }}>
                    Select interior styles...
                  </span>
                ) : (
                  interiorStyles.map(style => (
                    <div
                      key={style}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '13px',
                        color: '#FFFFFF'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeStyle(style);
                      }}
                    >
                      {style}
                      <X size={12} style={{ cursor: 'pointer' }} />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Two Column Row for Mood and Cultural Influence */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '16px'
            }}
          >
            {/* Mood / Vibe */}
            <div>
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
              <CustomDropdown
                value={mood}
                onChange={setMood}
                placeholder="Select mood..."
                options={[
                  { value: 'Calm & Serene', label: 'Calm & Serene' },
                  { value: 'Energetic & Vibrant', label: 'Energetic & Vibrant' },
                  { value: 'Cozy & Warm', label: 'Cozy & Warm' },
                  { value: 'Elegant & Sophisticated', label: 'Elegant & Sophisticated' },
                  { value: 'Fresh & Airy', label: 'Fresh & Airy' },
                  { value: 'Bold & Dramatic', label: 'Bold & Dramatic' }
                ]}
                showMoodPreview={true}
              />
            </div>

            {/* Cultural Influence */}
            <div>
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
                Cultural Influence <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <CustomDropdown
                value={culturalInfluence}
                onChange={setCulturalInfluence}
                placeholder="None"
                options={[
                  { value: '', label: 'None' },
                  { value: 'Japanese', label: 'Japanese' },
                  { value: 'Mediterranean', label: 'Mediterranean' },
                  { value: 'Nordic', label: 'Nordic' },
                  { value: 'Middle Eastern', label: 'Middle Eastern' },
                  { value: 'Indian', label: 'Indian' },
                  { value: 'African', label: 'African' }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Color & Material Preferences */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '20px',
          marginBottom: '24px',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <Palette size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Color & Material Preferences
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Choose your preferred color palette and materials
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'visible' }}>
          {/* Primary Color Palette & Accent Colors Row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start', overflow: 'visible', position: 'relative' }}>
            {/* Left Column - Primary Color Palette */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '0px'
                }}
              >
                Primary Color Palette
              </label>
              <CustomDropdown
                value={primaryColorPalette}
                onChange={setPrimaryColorPalette}
                placeholder="Select palette..."
                showColorPalettePreview={true}
                options={[
                  { value: 'Neutral (White, Beige, Gray)', label: 'Neutral (White, Beige, Gray)' },
                  { value: 'Monochromatic', label: 'Monochromatic' },
                  { value: 'Earth Tones', label: 'Earth Tones' },
                  { value: 'Pastels', label: 'Pastels' },
                  { value: 'Dark & Moody', label: 'Dark & Moody' },
                  { value: 'Bright & Bold', label: 'Bright & Bold' }
                ]}
              />
            </div>

            {/* Right Column - Accent Colors */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '0px'
                }}
              >
                Accent Colors
              </label>
              <CustomDropdown
                value={accentColors}
                onChange={setAccentColors}
                placeholder="Select accent..."
                showAccentColorPreview={true}
                options={[
                  { value: 'Gold/Brass', label: 'Gold/Brass' },
                  { value: 'Navy Blue', label: 'Navy Blue' },
                  { value: 'Emerald Green', label: 'Emerald Green' },
                  { value: 'Terracotta', label: 'Terracotta' },
                  { value: 'Blush Pink', label: 'Blush Pink' },
                  { value: 'Deep Purple', label: 'Deep Purple' }
                ]}
              />
            </div>
          </div>

          {/* Materials & Textures Row */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '24px', alignItems: 'flex-start', overflow: 'visible', position: 'relative' }}>
            {/* Left Column - Preferred Materials */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '0px'
                }}
              >
                Preferred Materials
              </label>
              <CustomDropdown
                value={preferredMaterials}
                onChange={setPreferredMaterials}
                placeholder="Select materials..."
                options={[
                  { value: 'Wood', label: 'Wood' },
                  { value: 'Metal', label: 'Metal' },
                  { value: 'Glass', label: 'Glass' },
                  { value: 'Stone', label: 'Stone' },
                  { value: 'Concrete', label: 'Concrete' },
                  { value: 'Natural Fibers', label: 'Natural Fibers' }
                ]}
              />
            </div>

            {/* Right Column - Textures */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
              <label
                style={{
                  display: 'block',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.75)',
                  marginBottom: '0px'
                }}
              >
                Textures
              </label>
              <CustomDropdown
                value={textures}
                onChange={setTextures}
                placeholder="Select texture..."
                options={[
                  { value: 'Smooth & Sleek', label: 'Smooth & Sleek' },
                  { value: 'Rough & Natural', label: 'Rough & Natural' },
                  { value: 'Soft & Plush', label: 'Soft & Plush' },
                  { value: 'Mixed Textures', label: 'Mixed Textures' }
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Furniture & Layout Preferences */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          padding: '20px',
          marginBottom: '24px',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <Armchair size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Furniture & Layout Preferences
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Define furniture style and spatial preferences
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField label="Furniture Style">
            <CustomDropdown
              value={furnitureStyle}
              onChange={setFurnitureStyle}
              placeholder="Select style..."
              options={[
                { value: 'Low Profile', label: 'Low Profile' },
                { value: 'Statement Pieces', label: 'Statement Pieces' },
                { value: 'Multifunctional', label: 'Multifunctional' },
                { value: 'Classic Silhouettes', label: 'Classic Silhouettes' }
              ]}
            />
          </FormField>

          <FormField label="Storage Preference">
            <CustomDropdown
              value={storagePreference}
              onChange={setStoragePreference}
              placeholder="Select preference..."
              options={[
                { value: 'Hidden / Minimal', label: 'Hidden / Minimal' },
                { value: 'Moderate / Balanced', label: 'Moderate / Balanced' },
                { value: 'Ample / Visible', label: 'Ample / Visible' }
              ]}
            />
          </FormField>

          <FormField label="Comfort ↔ Aesthetics">
            <div style={{ padding: '8px 0' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={comfortAestheticsValue}
                onChange={(e) => setComfortAestheticsValue(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: `linear-gradient(to right, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) ${comfortAestheticsValue}%, rgba(255, 255, 255, 0.1) ${comfortAestheticsValue}%, rgba(255, 255, 255, 0.1) 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}
              >
                <span>Comfort</span>
                <span>Aesthetics</span>
              </div>
            </div>
          </FormField>

          <FormField label="Layout Preference">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '32px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {layoutPreference === 'Open & Flowing' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="layoutPreference"
                  value="Open & Flowing"
                  checked={layoutPreference === 'Open & Flowing'}
                  onChange={() => setLayoutPreference('Open & Flowing')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Open & Flowing
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {layoutPreference === 'Defined & Enclosed' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="layoutPreference"
                  value="Defined & Enclosed"
                  checked={layoutPreference === 'Defined & Enclosed'}
                  onChange={() => setLayoutPreference('Defined & Enclosed')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Defined & Enclosed
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: '2px solid rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {layoutPreference === 'Mixed/Flexible' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="layoutPreference"
                  value="Mixed/Flexible"
                  checked={layoutPreference === 'Mixed/Flexible'}
                  onChange={() => setLayoutPreference('Mixed/Flexible')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Mixed/Flexible
                </span>
              </label>
            </div>
          </FormField>
        </div>
      </div>

      {/* Section 4: Lighting Preferences */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <Lightbulb size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Lighting Preferences
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Indicate natural and artificial lighting preferences
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField label="Natural Light Importance">
            <div style={{ padding: '8px 0' }}>
              <input
                type="range"
                min="0"
                max="100"
                value={naturalLightImportance}
                onChange={(e) => setNaturalLightImportance(Number(e.target.value))}
                style={{
                  width: '100%',
                  height: '4px',
                  borderRadius: '2px',
                  background: `linear-gradient(to right, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.3) ${naturalLightImportance}%, rgba(255, 255, 255, 0.1) ${naturalLightImportance}%, rgba(255, 255, 255, 0.1) 100%)`,
                  outline: 'none',
                  cursor: 'pointer',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '8px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)'
                }}
              >
                <span>Not Important</span>
                <span>Moderate</span>
                <span>Very Important</span>
              </div>
            </div>
          </FormField>

          <FormField label="Artificial Lighting Style">
            <CustomDropdown
              value={artificialLightingStyle}
              onChange={setArtificialLightingStyle}
              placeholder="Select style..."
              options={[
                { value: 'Ambient Only', label: 'Ambient Only' },
                { value: 'Task-Focused', label: 'Task-Focused' },
                { value: 'Accent & Decorative', label: 'Accent & Decorative' },
                { value: 'Layered (Mixed)', label: 'Layered (Mixed)' }
              ]}
            />
          </FormField>

          <FormField label="Light Temperature">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <RadioOption
                label="Warm (2700K–3000K)"
                description="Cozy, relaxing atmosphere"
                checked={lightTemperature === 'Warm (2700K–3000K)'}
                onChange={() => setLightTemperature('Warm (2700K–3000K)')}
              />
              <RadioOption
                label="Neutral (3500K–4000K)"
                description="Balanced, versatile lighting"
                checked={lightTemperature === 'Neutral (3500K–4000K)'}
                onChange={() => setLightTemperature('Neutral (3500K–4000K)')}
              />
              <RadioOption
                label="Cool (4500K–5500K)"
                description="Bright, energizing ambiance"
                checked={lightTemperature === 'Cool (4500K–5500K)'}
                onChange={() => setLightTemperature('Cool (4500K–5500K)')}
              />
            </div>
          </FormField>
        </div>
      </div>

      {/* Section 5: Lifestyle & Usage */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <Users size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Lifestyle & Usage
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Help AI understand your living situation
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField label="Household Type">
            <CustomDropdown
              value={householdType}
              onChange={setHouseholdType}
              placeholder="Select type..."
              options={[
                { value: 'Single Person', label: 'Single Person' },
                { value: 'Couple', label: 'Couple' },
                { value: 'Family with Kids', label: 'Family with Kids' },
                { value: 'Roommates / Shared', label: 'Roommates / Shared' },
                { value: 'Multigenerational', label: 'Multigenerational' }
              ]}
            />
          </FormField>

          <FormField label="Entertaining Focus">
            <CustomDropdown
              value={entertainingFocus}
              onChange={setEntertainingFocus}
              placeholder="Select focus..."
              options={[
                { value: 'Rarely / Never', label: 'Rarely / Never' },
                { value: 'Occasional (Small Groups)', label: 'Occasional (Small Groups)' },
                { value: 'Frequent (Medium Gatherings)', label: 'Frequent (Medium Gatherings)' },
                { value: 'Regular Host (Large Events)', label: 'Regular Host (Large Events)' }
              ]}
            />
          </FormField>

          <FormField label="Household Members">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '32px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={hasChildren}
                  onChange={(e) => setHasChildren(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#FFFFFF'
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Has Children
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={hasElderly}
                  onChange={(e) => setHasElderly(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#FFFFFF'
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Has Elderly Members
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={hasPets}
                  onChange={(e) => setHasPets(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#FFFFFF'
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Has Pets
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <input
                  type="checkbox"
                  checked={workFromHome}
                  onChange={(e) => setWorkFromHome(e.target.checked)}
                  style={{
                    width: '16px',
                    height: '16px',
                    cursor: 'pointer',
                    accentColor: '#FFFFFF'
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Work from Home
                </span>
              </label>
            </div>
          </FormField>
        </div>
      </div>

      {/* Section 6: Budget & Practical Constraints */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
          overflow: 'visible',
          position: 'relative',
          zIndex: 1
        }}
      >
        {/* Section Header */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '6px'
            }}
          >
            <DollarSign size={18} style={{ color: 'rgba(255, 255, 255, 0.7)' }} />
            <h3
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                fontWeight: 600,
                color: '#FFFFFF',
                margin: 0
              }}
            >
              Budget & Practical Constraints
            </h3>
          </div>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.55)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Set realistic expectations for execution
          </p>
        </div>

        {/* Form Fields */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <FormField label="Budget Range">
            <CustomDropdown
              value={budgetRange}
              onChange={setBudgetRange}
              placeholder="Select range..."
              options={[
                { value: 'Budget ($5K–$15K)', label: 'Budget ($5K–$15K)' },
                { value: 'Moderate ($15K–$40K)', label: 'Moderate ($15K–$40K)' },
                { value: 'Premium ($40K–$100K)', label: 'Premium ($40K–$100K)' },
                { value: 'Luxury ($100K+)', label: 'Luxury ($100K+)' }
              ]}
            />
          </FormField>

          <FormField label="Maintenance Tolerance">
            <CustomDropdown
              value={maintenanceTolerance}
              onChange={setMaintenanceTolerance}
              placeholder="Select tolerance..."
              options={[
                { value: 'Low Maintenance Only', label: 'Low Maintenance Only' },
                { value: 'Moderate Upkeep OK', label: 'Moderate Upkeep OK' },
                { value: 'High Maintenance Acceptable', label: 'High Maintenance Acceptable' }
              ]}
            />
          </FormField>

          <FormField label="Execution Priority">
            <div style={{ display: 'flex', flexDirection: 'row', gap: '32px', flexWrap: 'wrap', alignItems: 'center', marginTop: '16px', marginBottom: '24px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {executionPriority === 'Design Quality First' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="executionPriority"
                  value="Design Quality First"
                  checked={executionPriority === 'Design Quality First'}
                  onChange={() => setExecutionPriority('Design Quality First')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Design Quality First
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {executionPriority === 'Cost Optimization First' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="executionPriority"
                  value="Cost Optimization First"
                  checked={executionPriority === 'Cost Optimization First'}
                  onChange={() => setExecutionPriority('Cost Optimization First')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Cost Optimization First
                </span>
              </label>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: 'pointer',
                  gap: '10px'
                }}
              >
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                >
                  {executionPriority === 'Speed/Timeline First' && (
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#FFFFFF'
                      }}
                    />
                  )}
                </div>
                <input
                  type="radio"
                  name="executionPriority"
                  value="Speed/Timeline First"
                  checked={executionPriority === 'Speed/Timeline First'}
                  onChange={() => setExecutionPriority('Speed/Timeline First')}
                  style={{ display: 'none' }}
                />
                <span
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#FFFFFF'
                  }}
                >
                  Speed/Timeline First
                </span>
              </label>
            </div>
          </FormField>
        </div>
      </div>

      {/* Section 7: AI Assist (Optional) */}
      <div
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          padding: '20px',
          marginTop: '24px'
        }}
      >
        <div style={{ marginBottom: '16px' }}>
          <h3
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '16px',
              fontWeight: 600,
              color: '#FFFFFF',
              marginBottom: '6px'
            }}
          >
            AI Assist (Optional)
          </h3>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.6)',
              margin: 0
            }}
          >
            Upload reference images for AI-powered suggestions
          </p>
        </div>

        {/* Info Banner */}
        <div
          style={{
            backgroundColor: 'rgba(120, 160, 255, 0.08)',
            border: '1px solid rgba(120, 160, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '16px'
          }}
        >
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.8)',
              margin: 0,
              lineHeight: '1.5'
            }}
          >
            Coming soon: upload reference images or paste Pinterest/Instagram links for AI to analyze and auto-fill preferences.
          </p>
        </div>

        {/* Disabled Button */}
        <button
          disabled
          style={{
            width: '100%',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          + Analyze & Auto Fill (Coming Soon)
        </button>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => {
          // Switch to Moodboard tab with smooth transition
          setActiveTab('moodboard');
        }}
        style={{
          width: '100%',
          height: '48px',
          borderRadius: '10px',
          background: '#000000',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '15px',
          fontWeight: 600,
          color: '#FFFFFF',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '32px',
          boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.4)',
          transition: 'all 200ms ease-out'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#111111';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.boxShadow = '0px 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.08)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#000000';
          e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.boxShadow = '0px 8px 24px rgba(0, 0, 0, 0.4)';
        }}
      >
        🔒 Lock Intent & Generate Moodboards
      </button>

      {/* Portal Dropdown - Rendered at document body level */}
      {showStyleDropdown && createPortal(
        <div
          data-dropdown-container
          style={{
            position: 'fixed',
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '280px',
            overflowY: 'auto',
            backgroundColor: '#0B0B0B',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            boxShadow: '0px 12px 32px rgba(0, 0, 0, 0.6)',
            zIndex: 99999
          }}
          className="custom-dropdown-scrollbar"
        >
          <style>{`
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
          {availableStyles.map(style => (
            <div
              key={style}
              onClick={() => {
                toggleStyle(style);
              }}
              style={{
                height: '40px',
                padding: '0 16px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                color: interiorStyles.includes(style) ? '#FFFFFF' : 'rgba(255, 255, 255, 0.85)',
                backgroundColor: interiorStyles.includes(style) ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                cursor: interiorStyles.includes(style) || interiorStyles.length < 3 ? 'pointer' : 'not-allowed',
                opacity: interiorStyles.includes(style) || interiorStyles.length < 3 ? 1 : 0.4,
                transition: 'all 150ms ease-out',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'relative',
                borderLeft: interiorStyles.includes(style) ? '2px solid rgba(102, 126, 234, 0.8)' : '2px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (interiorStyles.includes(style) || interiorStyles.length < 3) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.06)';
                }
              }}
              onMouseLeave={(e) => {
                if (!interiorStyles.includes(style)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                } else {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.08)';
                }
              }}
            >
              <span>{style}</span>
              {interiorStyles.includes(style) && (
                <svg 
                  width="14" 
                  height="14" 
                  viewBox="0 0 14 14" 
                  fill="none"
                  style={{ flexShrink: 0, marginLeft: '8px' }}
                >
                  <path 
                    d="M11.6667 3.5L5.25 9.91667L2.33333 7" 
                    stroke="rgba(255, 255, 255, 0.9)" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Helper component for form fields
function FormField({ label, sublabel, children }: { label: string; sublabel?: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          fontWeight: 500,
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '6px'
        }}
      >
        {label}
        {sublabel && (
          <span style={{ color: 'rgba(255, 255, 255, 0.5)', fontWeight: 400, marginLeft: '6px' }}>
            ({sublabel})
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

// Helper component for radio options
function RadioOption({ 
  label, 
  description, 
  checked, 
  onChange 
}: { 
  label: string; 
  description: string; 
  checked: boolean; 
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px 16px',
        borderRadius: '8px',
        backgroundColor: checked ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
        border: checked ? '1.5px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.15)',
        cursor: 'pointer',
        transition: 'all 150ms ease-out',
        textAlign: 'left',
        width: '100%'
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.2)';
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
      }}
    >
      {/* Radio Circle */}
      <div
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          border: '2px solid rgba(255, 255, 255, 0.5)',
          marginRight: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {checked && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF'
            }}
          />
        )}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: '#FFFFFF',
            marginBottom: '2px'
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.5)',
            lineHeight: '1.4'
          }}
        >
          {description}
        </div>
      </div>
    </button>
  );
}

// Floor Plan Content Component
function FloorPlanContent({ 
  uploadedFile, 
  isDragging, 
  onDrop, 
  onDragOver, 
  onDragLeave, 
  onFileInput, 
  onReload,
  onDelete,
  regenerationKey,
  setActiveTab
}: { 
  uploadedFile: File | null; 
  isDragging: boolean; 
  onDrop: (e: React.DragEvent) => void; 
  onDragOver: (e: React.DragEvent) => void; 
  onDragLeave: () => void; 
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  onReload: () => void;
  onDelete: () => void;
  regenerationKey: number;
  setActiveTab: (tab: string) => void;
}) {
  const [isHovering, setIsHovering] = useState(false);
  const [isReloadHovering, setIsReloadHovering] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [replaceHover, setReplaceHover] = useState(false);
  const [removeHover, setRemoveHover] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIconIndex, setActiveIconIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isAnalysisComplete, setIsAnalysisComplete] = useState(false);
  const [confirmHover, setConfirmHover] = useState(false);
  const [continueHover, setContinueHover] = useState(false);

  // Track regeneration state
  useEffect(() => {
    if (regenerationKey > 0) {
      setIsRegenerating(true);
      setIsAnalysisComplete(false); // Reset completion when regenerating
      const timer = setTimeout(() => {
        setIsRegenerating(false);
        setIsAnalysisComplete(true); // Mark as complete after 3 seconds
      }, 3000); // Match AI analysis duration
      return () => clearTimeout(timer);
    }
  }, [regenerationKey]);

  // Set initial analysis as complete after first load
  useEffect(() => {
    if (uploadedFile && regenerationKey === 0) {
      const timer = setTimeout(() => {
        setIsAnalysisComplete(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [uploadedFile, regenerationKey]);

  // Generate image preview URL when file changes
  useEffect(() => {
    if (uploadedFile && uploadedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(uploadedFile);
    } else {
      setImagePreview(null);
    }
  }, [uploadedFile]);

  // Handle loading state transition
  useEffect(() => {
    if (uploadedFile) {
      // Show loading state
      setIsLoading(true);
      
      // After 2.5 seconds, hide loading and show preview
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2500);

      return () => clearTimeout(timer);
    } else {
      setIsLoading(false);
    }
  }, [uploadedFile]);

  // Sequential icon animation (0 -> 1 -> 2 -> 3 -> 0 ...)
  useEffect(() => {
    if (isLoading) {
      // Total cycle: 400ms transition + 600ms hold = 1000ms per icon
      // 4 icons = 4000ms total loop
      const interval = setInterval(() => {
        setActiveIconIndex((prev) => (prev + 1) % 4);
      }, 1000); // Move to next icon every 1 second

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '1076px', // Match tab rail width exactly
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        paddingTop: '32px'
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          width: '100%'
        }}
      >
        {/* Left: Title + Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <h2
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '20px',
              fontWeight: 600,
              color: '#FFFFFF',
              margin: 0
            }}
          >
            Floor Plan Analysis
          </h2>
          <p
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.65)',
              margin: 0
            }}
          >
            Upload your floor plan and let AI detect rooms automatically
          </p>
        </div>

        {/* Right: Reload Button */}
        <motion.button
          onClick={onReload}
          onHoverStart={() => setIsReloadHovering(true)}
          onHoverEnd={() => setIsReloadHovering(false)}
          whileTap={{ scale: 0.98 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            backgroundColor: 'rgba(20, 20, 20, 0.45)',
            border: isReloadHovering ? '1px solid rgba(255, 255, 255, 0.20)' : '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '8px',
            cursor: 'pointer',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: '#FFFFFF',
            transition: 'all 150ms ease-out',
            boxShadow: isReloadHovering ? '0 0 12px rgba(255, 255, 255, 0.15)' : 'none',
            backdropFilter: 'blur(12px)'
          }}
        >
          <RefreshCw size={14} />
          Regenerate Floor Plan
        </motion.button>
      </div>

      {/* Upload Card */}
      <div
        style={{
          backgroundColor: 'rgba(18, 18, 18, 0.35)',
          backdropFilter: 'blur(20px)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          padding: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
        }}
      >
        {!uploadedFile ? (
          // STATE 1: Default - Drag & Drop Zone
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            style={{
              border: isDragging ? '2px dashed rgba(255, 255, 255, 0.28)' : '2px dashed rgba(255, 255, 255, 0.18)',
              borderRadius: '12px',
              padding: '48px 24px',
              minHeight: '280px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              backgroundColor: isDragging ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.18)',
              transition: 'all 200ms ease-out',
              cursor: 'pointer',
              boxShadow: isDragging ? '0 0 16px rgba(255, 255, 255, 0.12)' : 'none'
            }}
            onClick={() => {
              const input = document.getElementById('floor-plan-input') as HTMLInputElement;
              input?.click();
            }}
          >
            {/* Cloud Icon */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <CloudUpload 
                size={28} 
                color="rgba(255, 255, 255, 0.70)" 
                style={{
                  filter: isDragging ? 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.4))' : 'none',
                  transition: 'filter 200ms ease-out'
                }}
              />
            </div>

            {/* Main Text */}
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  margin: '0 0 4px'
                }}
              >
                Drag and drop your floor plan
              </p>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.55)',
                  margin: 0
                }}
              >
                or click to browse files
              </p>
            </div>

            {/* Choose File Button */}
            <motion.button
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => {
                e.stopPropagation();
                const input = document.getElementById('floor-plan-input') as HTMLInputElement;
                input?.click();
              }}
              style={{
                padding: '10px 24px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 150ms ease-out',
                marginTop: '8px',
                boxShadow: isHovering ? '0 0 16px rgba(255, 255, 255, 0.15)' : 'none',
                backdropFilter: 'blur(10px)'
              }}
            >
              Choose File
            </motion.button>

            {/* File Format Note */}
            <p
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '12px',
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.45)',
                margin: '8px 0 0',
                textAlign: 'center'
              }}
            >
              Supports: PNG, JPG, PDF (max 10MB)
            </p>

            {/* Hidden File Input */}
            <input
              id="floor-plan-input"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={onFileInput}
              style={{ display: 'none' }}
            />
          </motion.div>
        ) : isLoading ? (
          // STATE 2: Loading - 4-Icon Sequential Loader
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              borderRadius: '12px',
              minHeight: '280px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '28px',
              backgroundColor: 'rgba(15, 15, 15, 0.85)',
              backdropFilter: 'blur(10px)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* 4-Icon Horizontal Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '64px',
                position: 'relative'
              }}
            >
              {/* Icon 1: Large 3D Corner PNG - 72px inside 96px container */}
              <LoadingIconPNG 
                src={imgImage3DCorner}
                delay={0}
              />

              {/* Icon 2: Small 3D Cube Room PNG - 72px inside 96px container */}
              <LoadingIconPNG 
                src={imgIcon}
                delay={0.15}
              />

              {/* Icon 3: Vertical Sheet/Panel PNG - 72px inside 96px container */}
              <LoadingIconPNG 
                src={imgIcon1}
                delay={0.3}
              />

              {/* Icon 4: Stacked Layers PNG - 72px inside 96px container */}
              <LoadingIconPNG 
                src={imgIcon2}
                delay={0.45}
              />
            </div>

            {/* Loading Text - Fade In */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ textAlign: 'center' }}
            >
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '15px',
                  fontWeight: 500,
                  color: 'rgba(255, 255, 255, 0.85)',
                  margin: '0 0 6px'
                }}
              >
                Analyzing floor plan...
              </p>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '13px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.6)',
                  margin: 0
                }}
              >
                Detecting rooms, walls & layout
              </p>
            </motion.div>
          </motion.div>
        ) : (
          // STATE 3: Preview - Image Uploaded
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            style={{
              position: 'relative',
              borderRadius: '12px',
              minHeight: '400px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              overflow: 'hidden',
              boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.08) inset'
            }}
          >
            {/* Image Preview */}
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Floor plan preview"
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '600px',
                  objectFit: 'contain',
                  borderRadius: '12px'
                }}
              />
            )}

            {/* Regenerating Overlay - Top Left Corner */}
            {isRegenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  padding: '8px 14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  zIndex: 9
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {/* Spinner */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1.5,
                      ease: 'linear',
                      repeat: Infinity
                    }}
                    style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      borderTopColor: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '50%'
                    }}
                  />
                  <span
                    style={{
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: 'rgba(255, 255, 255, 0.85)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Regenerating layout…
                  </span>
                </div>
              </motion.div>
            )}

            {/* Top-Right Action Buttons Overlay */}
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                display: 'flex',
                gap: '8px',
                zIndex: 10
              }}
            >
              {/* Replace Button */}
              <motion.button
                onHoverStart={() => setReplaceHover(true)}
                onHoverEnd={() => setReplaceHover(false)}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  const input = document.getElementById('floor-plan-input') as HTMLInputElement;
                  input?.click();
                }}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                  boxShadow: replaceHover ? '0 0 12px rgba(255, 255, 255, 0.2)' : 'none'
                }}
              >
                <RefreshCw 
                  size={16} 
                  color={replaceHover ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)'}
                  style={{ transition: 'color 150ms ease-out' }}
                />
              </motion.button>

              {/* Remove Button */}
              <motion.button
                onHoverStart={() => setRemoveHover(true)}
                onHoverEnd={() => setRemoveHover(false)}
                whileTap={{ scale: 0.95 }}
                onClick={onDelete}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'all 150ms ease-out',
                  boxShadow: removeHover ? '0 0 12px rgba(255, 255, 255, 0.2)' : 'none'
                }}
              >
                <X 
                  size={16} 
                  color={removeHover ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.6)'}
                  style={{ transition: 'color 150ms ease-out' }}
                />
              </motion.button>
            </div>

            {/* Hidden File Input */}
            <input
              id="floor-plan-input"
              type="file"
              accept="image/png,image/jpeg,application/pdf"
              onChange={onFileInput}
              style={{ display: 'none' }}
            />
          </motion.div>
        )}
      </div>

      {/* AI Analysis Loading Section - Only visible after image preview */}
      {uploadedFile && !isLoading && (
        <AIAnalysisLoading key={regenerationKey} />
      )}

      {/* Action Buttons - Between AI Analysis and Tips */}
      {/* ONLY show when analysis is complete (progress = 100%) */}
      {uploadedFile && !isLoading && isAnalysisComplete && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            marginTop: '24px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}
        >
          {/* Confirm All Rooms - Secondary Button */}
          <motion.button
            onHoverStart={() => setConfirmHover(true)}
            onHoverEnd={() => setConfirmHover(false)}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              // Mark all rooms as confirmed (placeholder logic)
              console.log('All rooms confirmed');
            }}
            style={{
              height: '40px',
              padding: '0 18px',
              borderRadius: '8px',
              backgroundColor: confirmHover ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: `1px solid rgba(255, 255, 255, ${confirmHover ? 0.5 : 0.25})`,
              color: 'rgba(255, 255, 255, 0.85)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            Confirm All Rooms
          </motion.button>

          {/* Continue to Intent - Primary Button */}
          <motion.button
            onHoverStart={() => setContinueHover(true)}
            onHoverEnd={() => setContinueHover(false)}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setActiveTab('intent');
            }}
            style={{
              height: '40px',
              padding: '0 20px',
              borderRadius: '8px',
              backgroundColor: continueHover ? 'rgba(255, 255, 255, 0.95)' : '#FFFFFF',
              border: 'none',
              color: '#000000',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 150ms ease-out',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              whiteSpace: 'nowrap'
            }}
          >
            Continue to Intent
          </motion.button>
        </motion.div>
      )}

      {/* Tips Card */}
      <div
        style={{
          backgroundColor: 'rgba(18, 18, 18, 0.35)',
          backdropFilter: 'blur(20px)',
          borderRadius: '18px',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          padding: '24px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Tips Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px'
          }}
        >
          <Info 
            size={18} 
            color="rgba(255, 255, 255, 0.70)" 
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255, 255, 255, 0.25))'
            }}
          />
          <h3
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '15px',
              fontWeight: 600,
              color: '#FFFFFF',
              margin: 0
            }}
          >
            Floor Plan Tips
          </h3>
        </div>

        {/* Tips List */}
        <ul
          style={{
            margin: 0,
            padding: '0 0 0 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <li
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              lineHeight: '1.5'
            }}
          >
            Use high-resolution architectural floor plans for best results
          </li>
          <li
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              lineHeight: '1.5'
            }}
          >
            AI will automatically detect walls, doors, and room boundaries
          </li>
          <li
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              lineHeight: '1.5'
            }}
          >
            Rooms with low confidence should be reviewed manually
          </li>
          <li
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.60)',
              lineHeight: '1.5'
            }}
          >
            You can manually edit detected rooms before proceeding
          </li>
        </ul>
      </div>
    </div>
  );
}

// AI Analysis Loading Section Component
function AIAnalysisLoading() {
  const [linkHover, setLinkHover] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Generate random room layouts for each regeneration
  const generateRoomLayout = () => {
    const layouts = [
      // Layout 1 - Original
      [
        { id: 1, type: 'Living Area', confidence: 100, description: 'Explicitly labeled "Living Area" and contains common living room fixtures and layout patterns.' },
        { id: 2, type: 'Dining Area', confidence: 100, description: 'Adjacent to kitchen with dining furniture arrangement detected in floor plan.' },
        { id: 3, type: 'Kitchen', confidence: 100, description: 'Explicitly labeled "Kitchen" and contains common kitchen fixtures, counters, and appliances.' },
        { id: 4, type: 'Bedroom', confidence: 100, description: 'Private room with bed placement and closet space identified in architectural plan.' },
        { id: 5, type: 'Bath', confidence: 100, description: 'Bathroom fixtures detected including toilet, shower/tub, and sink arrangements.' },
        { id: 6, type: 'Passage', confidence: 90, description: 'Corridor connecting multiple rooms, identified by doorway patterns and width.' }
      ],
      // Layout 2 - Merged Living/Dining
      [
        { id: 1, type: 'Living Area', confidence: 95, description: 'Open-plan living and dining space with combined furniture layout detected.' },
        { id: 2, type: 'Kitchen', confidence: 100, description: 'Explicitly labeled "Kitchen" with appliances, counters, and storage identified.' },
        { id: 3, type: 'Bedroom', confidence: 98, description: 'Primary bedroom with walk-in closet and en-suite access.' },
        { id: 4, type: 'Bath', confidence: 100, description: 'Full bathroom with shower, toilet, and vanity fixtures.' },
        { id: 5, type: 'Passage', confidence: 85, description: 'Main corridor connecting all rooms with multiple access points.' },
        { id: 6, type: 'Balcony', confidence: 80, description: 'External space with door access, possibly a balcony or terrace.' }
      ],
      // Layout 3 - Different interpretation
      [
        { id: 1, type: 'Living Area', confidence: 92, description: 'Central living space with furniture arrangement and entertainment area.' },
        { id: 2, type: 'Dining Area', confidence: 88, description: 'Dedicated dining space adjacent to kitchen with table arrangement.' },
        { id: 3, type: 'Kitchen', confidence: 100, description: 'Galley-style kitchen with L-shaped counter configuration.' },
        { id: 4, type: 'Bedroom', confidence: 95, description: 'Master bedroom with built-in storage and natural light access.' },
        { id: 5, type: 'Bedroom', confidence: 90, description: 'Secondary bedroom or guest room with compact layout.' },
        { id: 6, type: 'Bath', confidence: 100, description: 'Shared bathroom with standard fixtures and ventilation.' },
        { id: 7, type: 'Passage', confidence: 82, description: 'Hallway system connecting bedrooms and common areas.' }
      ],
      // Layout 4 - Compact interpretation
      [
        { id: 1, type: 'Living Area', confidence: 100, description: 'Multi-functional living space with dining integration.' },
        { id: 2, type: 'Kitchen', confidence: 98, description: 'Compact kitchen with efficient appliance placement.' },
        { id: 3, type: 'Bedroom', confidence: 100, description: 'Single bedroom with optimal space utilization.' },
        { id: 4, type: 'Bath', confidence: 100, description: 'Bathroom with shower and modern fixtures.' },
        { id: 5, type: 'Office', confidence: 75, description: 'Potential home office or study area with desk space.' }
      ]
    ];
    
    return layouts[Math.floor(Math.random() * layouts.length)];
  };

  const [detectedRooms, setDetectedRooms] = useState(generateRoomLayout());

  // Animate progress from 0 to 100%
  useEffect(() => {
    // Increment progress gradually
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 2; // Increment by 2% every 60ms
      });
    }, 60); // 60ms interval = ~3 seconds total (100/2 * 60ms)

    // Mark complete when done
    const timer = setTimeout(() => {
      setProgress(100);
      setIsComplete(true);
    }, 3000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleDeleteRoom = (id: number) => {
    setDetectedRooms(detectedRooms.filter(room => room.id !== id));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={{
        backgroundColor: 'rgba(18, 18, 18, 0.35)',
        backdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.10)',
        padding: '24px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        marginTop: '24px',
        marginBottom: '24px'
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        {/* Left: AI Analysis Title */}
        <h3
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '16px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.8)',
            margin: 0
          }}
        >
          AI Analysis
        </h3>
      </div>

      {/* Progress Section - Fade out when complete */}
      {!isComplete ? (
        <motion.div 
          initial={{ opacity: 1 }}
          animate={{ opacity: isComplete ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{ marginBottom: '12px' }}
        >
          {/* Percentage Text */}
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: '18px',
              fontWeight: 500,
              color: '#FFFFFF',
              textShadow: '0 0 4px rgba(255, 255, 255, 0.1)',
              marginBottom: '6px'
            }}
          >
            {progress}%
          </div>

          {/* Progress Track Container */}
          <div
            style={{
              width: '100%',
              height: '14px',
              backgroundColor: 'rgba(30, 30, 30, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.30)',
              borderRadius: '0',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            {/* Progress Fill */}
            <motion.div
              animate={{
                width: `${progress}%`
              }}
              transition={{
                duration: 0.2,
                ease: 'easeOut'
              }}
              style={{
                height: '100%',
                backgroundColor: '#FFFFFF',
                borderRadius: '0'
              }}
            />
          </div>
        </motion.div>
      ) : (
        <div style={{ height: '8px' }} />
      )}

      {/* Status Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: isComplete ? '20px' : '0'
        }}
      >
        {/* Left: Spinner + Status Text */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          {/* Spinner Icon - Only show when not complete */}
          {!isComplete && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{
                duration: 1.5,
                ease: 'linear',
                repeat: Infinity
              }}
              style={{
                width: '14px',
                height: '14px',
                border: '2px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '50%'
              }}
            />
          )}
          
          {/* Status Text */}
          <span
            style={{
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: isComplete ? 'rgba(34, 197, 94, 0.9)' : 'rgba(255, 255, 255, 0.7)',
              transition: 'color 300ms ease-out'
            }}
          >
            {isComplete ? 'Analysis complete' : 'AI detecting rooms...'}
          </span>
        </div>

        {/* Right: Live Updates Link */}
        <motion.button
          onHoverStart={() => setLinkHover(true)}
          onHoverEnd={() => setLinkHover(false)}
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.5)',
            textDecoration: linkHover ? 'underline' : 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            transition: 'all 150ms ease-out'
          }}
        >
          Live Updates
        </motion.button>
      </div>

      {/* Detected Rooms Results - Show when complete */}
      {isComplete && (
        <DetectedRoomsResults 
          rooms={detectedRooms}
          onDeleteRoom={handleDeleteRoom}
        />
      )}
    </motion.div>
  );
}

// Detected Rooms Results Component
function DetectedRoomsResults({ 
  rooms, 
  onDeleteRoom 
}: { 
  rooms: { id: number, type: string, confidence: number, description: string }[];
  onDeleteRoom: (id: number) => void;
}) {
  const [addButtonHover, setAddButtonHover] = useState(false);
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoomType, setNewRoomType] = useState('Living Area');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      style={{
        marginTop: '4px'
      }}
    >
      {/* Section Header */}
      <div
        style={{
          marginBottom: '12px'
        }}
      >
        <h4
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.75)',
            margin: '0 0 4px'
          }}
        >
          Detected Rooms
        </h4>
        <p
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.50)',
            margin: 0
          }}
        >
          Review and edit room labels before proceeding
        </p>
      </div>

      {/* Add Room Manually Button - Aligned Right */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginBottom: '12px'
        }}
      >
        <motion.button
          onHoverStart={() => setAddButtonHover(true)}
          onHoverEnd={() => setAddButtonHover(false)}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowAddRoomForm(!showAddRoomForm)}
          style={{
            height: '36px',
            padding: '0 16px',
            borderRadius: '8px',
            backgroundColor: addButtonHover ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            border: addButtonHover ? '1px solid rgba(255, 255, 255, 0.40)' : '1px solid rgba(255, 255, 255, 0.20)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.85)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 150ms ease-out'
          }}
        >
          {/* Plus Icon */}
          <span style={{ fontSize: '14px', lineHeight: 1 }}>+</span>
          Add Room Manually
        </motion.button>
      </div>

      {/* Add Room Form - Inline (shows when button is clicked) */}
      {showAddRoomForm && (
        <AddRoomForm
          onClose={() => setShowAddRoomForm(false)}
          onAdd={(roomData) => {
            // Add new room logic would go here
            console.log('Adding room:', roomData);
            setShowAddRoomForm(false);
          }}
        />
      )}

      {/* List Container */}
      <div
        style={{
          backgroundColor: 'rgba(25, 25, 25, 0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.10)',
          padding: '12px',
          maxHeight: '320px',
          overflowY: 'auto',
          overflowX: 'hidden'
        }}
      >
        {/* Rooms List */}
        {rooms.map((room, index) => (
          <DetectedRoomRow
            key={room.id}
            room={room}
            onDelete={onDeleteRoom}
            isLast={index === rooms.length - 1}
          />
        ))}
      </div>
    </motion.div>
  );
}

// Add Room Form Component
function AddRoomForm({
  onClose,
  onAdd
}: {
  onClose: () => void;
  onAdd: (roomData: { type: string, description: string }) => void;
}) {
  const [type, setType] = useState('Living Area');
  const [description, setDescription] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const roomTypes = ['Living Area', 'Dining Area', 'Kitchen', 'Bedroom', 'Bath', 'Passage', 'Office', 'Balcony'];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        backgroundColor: 'rgba(25, 25, 25, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '16px',
        marginBottom: '12px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
      }}
    >
      {/* Form Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}
      >
        <h4
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '15px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.85)',
            margin: 0
          }}
        >
          Add Room Manually
        </h4>
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.95 }}
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 150ms ease-out'
          }}
        >
          <X
            size={16}
            color="rgba(255, 255, 255, 0.6)"
            style={{ transition: 'color 150ms ease-out' }}
          />
        </motion.button>
      </div>

      {/* Room Type Dropdown */}
      <div style={{ marginBottom: '12px' }}>
        <label
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '6px',
            display: 'block'
          }}
        >
          Room Type
        </label>
        <div style={{ position: 'relative' }}>
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(40, 40, 40, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontFamily: 'Inter, sans-serif',
              fontSize: '13px',
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.9)',
              cursor: 'pointer',
              textAlign: 'left',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
              transition: 'all 150ms ease-out'
            }}
          >
            {type}
            <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
          </motion.button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                backgroundColor: 'rgba(25, 25, 25, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                padding: '6px',
                width: '100%',
                zIndex: 100,
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
              }}
            >
              {roomTypes.map(roomType => (
                <button
                  key={roomType}
                  onClick={() => {
                    setType(roomType);
                    setIsDropdownOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    backgroundColor: roomType === type ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '13px',
                    fontWeight: 400,
                    color: 'rgba(255, 255, 255, 0.85)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'background-color 150ms ease-out'
                  }}
                  onMouseEnter={(e) => {
                    if (roomType !== type) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (roomType !== type) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {roomType}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Description Input */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '6px',
            display: 'block'
          }}
        >
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter room description..."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            backgroundColor: 'rgba(40, 40, 40, 0.6)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 400,
            color: 'rgba(255, 255, 255, 0.85)',
            resize: 'vertical',
            minHeight: '60px',
            outline: 'none',
            transition: 'border 150ms ease-out'
          }}
          onFocus={(e) => {
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.25)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.border = '1px solid rgba(255, 255, 255, 0.12)';
          }}
        />
      </div>

      {/* Action Buttons */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          justifyContent: 'flex-end'
        }}
      >
        <motion.button
          onClick={onClose}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            transition: 'all 150ms ease-out'
          }}
        >
          Cancel
        </motion.button>
        <motion.button
          onClick={() => onAdd({ type, description })}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '13px',
            fontWeight: 500,
            color: 'rgba(34, 197, 94, 0.95)',
            cursor: 'pointer',
            transition: 'all 150ms ease-out'
          }}
        >
          Add Room
        </motion.button>
      </div>
    </motion.div>
  );
}

// Detected Room Row Component
function DetectedRoomRow({
  room,
  onDelete,
  isLast
}: {
  room: { id: number, type: string, confidence: number, description: string };
  onDelete: (id: number) => void;
  isLast: boolean;
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(room.type);
  const [deleteHover, setDeleteHover] = useState(false);
  
  const roomTypes = ['Living Area', 'Dining Area', 'Kitchen', 'Bedroom', 'Bath', 'Passage', 'Office', 'Balcony'];

  // Get confidence color
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return { bg: 'rgba(34, 197, 94, 0.15)', text: 'rgba(34, 197, 94, 0.95)' };
    if (confidence >= 70) return { bg: 'rgba(234, 179, 8, 0.15)', text: 'rgba(234, 179, 8, 0.95)' };
    return { bg: 'rgba(239, 68, 68, 0.15)', text: 'rgba(239, 68, 68, 0.95)' };
  };

  const confidenceColors = getConfidenceColor(room.confidence);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 8px',
        borderBottom: isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.05)',
        minHeight: '48px'
      }}
    >
      {/* 1) Room Type Dropdown */}
      <div style={{ position: 'relative' }}>
        <motion.button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: '6px 12px',
            borderRadius: '8px',
            backgroundColor: 'rgba(40, 40, 40, 0.6)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            fontWeight: 500,
            color: 'rgba(255, 255, 255, 0.9)',
            cursor: 'pointer',
            minWidth: '140px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            transition: 'all 150ms ease-out'
          }}
        >
          {selectedType}
          <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
        </motion.button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: '4px',
              backgroundColor: 'rgba(25, 25, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '6px',
              minWidth: '140px',
              zIndex: 100,
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
            }}
          >
            {roomTypes.map(type => (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setIsDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: type === selectedType ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'rgba(255, 255, 255, 0.85)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color 150ms ease-out'
                }}
                onMouseEnter={(e) => {
                  if (type !== selectedType) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (type !== selectedType) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {type}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* 2) Confidence Badge */}
      <div
        style={{
          padding: '4px 10px',
          borderRadius: '6px',
          backgroundColor: confidenceColors.bg,
          fontFamily: 'Inter, sans-serif',
          fontSize: '11px',
          fontWeight: 600,
          color: confidenceColors.text,
          whiteSpace: 'nowrap'
        }}
      >
        {room.confidence}%
      </div>

      {/* 3) Status Chip */}
      <div
        style={{
          padding: '4px 8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          fontFamily: 'Inter, sans-serif',
          fontSize: '10px',
          fontWeight: 700,
          color: 'rgba(34, 197, 94, 0.95)',
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap'
        }}
      >
        CONF.
      </div>

      {/* 4) Description Text (expands to fill) */}
      <div
        style={{
          flex: 1,
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
          fontWeight: 400,
          color: 'rgba(255, 255, 255, 0.65)',
          lineHeight: '1.4',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
      >
        {room.description}
      </div>

      {/* 5) Delete Icon */}
      <motion.button
        onHoverStart={() => setDeleteHover(true)}
        onHoverEnd={() => setDeleteHover(false)}
        whileTap={{ scale: 0.92 }}
        onClick={() => onDelete(room.id)}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: deleteHover ? 'rgba(239, 68, 68, 0.15)' : 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 150ms ease-out'
        }}
      >
        <X
          size={16}
          color={deleteHover ? 'rgba(239, 68, 68, 0.95)' : 'rgba(255, 255, 255, 0.4)'}
          style={{ transition: 'color 150ms ease-out' }}
        />
      </motion.button>
    </div>
  );
}

// Loading Icon Component for PNG images
function LoadingIconPNG({ 
  src, 
  delay 
}: { 
  src: string; 
  delay: number; 
}) {
  return (
    <div
      style={{
        position: 'relative',
        width: '96px',
        height: '96px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {/* Enhanced Radial Gradient Background - Premium Glow */}
      <motion.div
        animate={{
          opacity: [0.5, 0.7, 0.5] // Smooth fade pulse
        }}
        transition={{
          duration: 2.4,
          ease: 'easeInOut',
          repeat: Infinity,
          delay: delay
        }}
        style={{
          position: 'absolute',
          width: '120px',
          height: '120px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 255, 255, 0.06) 0%, transparent 70%)',
          filter: 'blur(24px)',
          pointerEvents: 'none',
          zIndex: -1
        }}
      />

      {/* PNG Image with Smooth Luxury Float & Micro Tilt */}
      <motion.img
        src={src}
        alt="Loading icon"
        animate={{
          y: [0, -10, 0], // Gentle vertical float
          rotateX: [0, 6, 0], // Micro tilt X
          rotateY: [0, -4, 0], // Micro tilt Y
          opacity: [0.85, 1, 0.85] // Soft opacity pulse
        }}
        transition={{
          y: {
            duration: 2.4,
            ease: 'easeInOut',
            repeat: Infinity,
            delay
          },
          rotateX: {
            duration: 3,
            ease: 'easeInOut',
            repeat: Infinity,
            delay
          },
          rotateY: {
            duration: 3,
            ease: 'easeInOut',
            repeat: Infinity,
            delay
          },
          opacity: {
            duration: 2.4,
            ease: 'easeInOut',
            repeat: Infinity,
            delay
          }
        }}
        style={{
          width: '72px',
          height: '72px',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0px 12px 30px rgba(0,0,0,0.45)) drop-shadow(0px 0px 24px rgba(255,255,255,0.12))'
        }}
      />
    </div>
  );
}