'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { completeOnboarding, OnboardingData, getOnboardingStatus } from '@/lib/auth-client';
import { geolocationErrorMessage } from '@/lib/geolocation-errors';

// ============================================================
// Types
// ============================================================

type Persona = 'HOMEOWNER' | 'INTERIOR_DESIGNER' | 'REAL_ESTATE_DEVELOPER' | 'CONTRACTOR';
type ProjectVolume = '1-3' | '4-10' | '10+';

interface Step1Data { phoneNumber: string; whatsappSame: boolean; whatsappNumber: string; }
interface Step2Data { lat: number; lng: number; formattedAddress: string; pincode: string; }
interface Step3Data { persona: Persona | ''; }
interface Step4Data {
  companyName: string; portfolioLink: string; monthlyProjectVolume: ProjectVolume | '';
  gstNumber: string; businessPhone: string;
  businessLat: number | null; businessLng: number | null; businessAddress: string;
}

const MAPS_LIBRARIES: ('places')[] = ['places'];

// ============================================================
// Styles (shared tokens)
// ============================================================

const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0f 0%, #0f0f1a 50%, #0a0f1a 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: "'Inter', -apple-system, sans-serif",
    padding: '24px 16px',
  } as React.CSSProperties,
  card: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '24px', padding: '48px',
    maxWidth: '560px', width: '100%',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
  } as React.CSSProperties,
  label: { color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 500, marginBottom: '8px', display: 'block' } as React.CSSProperties,
  input: {
    width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '10px',
    color: '#fff', fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  btn: {
    padding: '13px 24px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px',
    fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease', fontFamily: 'inherit',
  } as React.CSSProperties,
  btnSecondary: {
    padding: '13px 24px', background: 'rgba(255,255,255,0.06)',
    color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px', fontSize: '15px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  } as React.CSSProperties,
};

// ============================================================
// Progress Bar Component
// ============================================================

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div style={{ marginBottom: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px' }}>Step {step} of {total}</span>
        <span style={{ color: '#6366f1', fontSize: '12px', fontWeight: 600 }}>{Math.round((step / total) * 100)}%</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px' }}>
        <div style={{
          height: '100%', width: `${(step / total) * 100}%`,
          background: 'linear-gradient(90deg, #6366f1, #8b5cf6)',
          borderRadius: '4px', transition: 'width 0.4s ease',
        }} />
      </div>
    </div>
  );
}

// ============================================================
// STEP 1: Phone + WhatsApp
// ============================================================

function Step1({ data, onChange }: { data: Step1Data; onChange: (d: Step1Data) => void }) {
  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>📱 Contact Details</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 32px' }}>
        We use this for project updates and support.
      </p>

      <div style={{ marginBottom: '20px' }}>
        <label style={S.label}>Phone Number *</label>
        <input
          style={S.input}
          type="tel"
          placeholder="+91 98765 43210"
          value={data.phoneNumber}
          onChange={(e) => onChange({ ...data, phoneNumber: e.target.value })}
        />
      </div>

      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <input
          type="checkbox"
          id="whatsapp-same"
          checked={data.whatsappSame}
          onChange={(e) => onChange({ ...data, whatsappSame: e.target.checked })}
          style={{ width: '16px', height: '16px', accentColor: '#6366f1' }}
        />
        <label htmlFor="whatsapp-same" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', cursor: 'pointer' }}>
          WhatsApp is the same number
        </label>
      </div>

      {!data.whatsappSame && (
        <div style={{ marginBottom: '20px' }}>
          <label style={S.label}>WhatsApp Number *</label>
          <input
            style={S.input}
            type="tel"
            placeholder="+91 98765 43210"
            value={data.whatsappNumber}
            onChange={(e) => onChange({ ...data, whatsappNumber: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// STEP 2: Location — Google Maps Pin
// ============================================================

function Step2({ data, onChange }: { data: Step2Data; onChange: (d: Step2Data) => void }) {
  const { isLoaded } = useJsApiLoader({
    // Support both legacy and current env key names.
    googleMapsApiKey:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ||
      '',
    libraries: MAPS_LIBRARIES,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  const autocompleteServiceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLoaded && !autocompleteServiceRef.current && window.google) {
      autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // India center
  const markerPos = data.lat ? { lat: data.lat, lng: data.lng } : null;

  const getAddressDetails = async (lat: number, lng: number) => {
    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
          if (status === 'OK' && results) resolve(results);
          else reject(new Error(status));
        });
      });

      const address = result[0]?.formatted_address || '';
      const pincodeComponent = result[0]?.address_components.find((c) =>
        c.types.includes('postal_code')
      );
      const pincode = pincodeComponent?.long_name || '';

      onChange({ lat, lng, formattedAddress: address, pincode });
    } catch {
      // If reverse geocoding fails, keep coordinates so user can still continue.
      onChange({
        ...data,
        lat,
        lng,
        formattedAddress: data.formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        pincode: data.pincode || '',
      });
    }
  };

  const handleMapClick = useCallback(async (e: google.maps.MapMouseEvent) => {
    const lat = e.latLng?.lat() ?? 0;
    const lng = e.latLng?.lng() ?? 0;
    await getAddressDetails(lat, lng);
  }, [data, onChange]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (!value.trim() || !autocompleteServiceRef.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    autocompleteServiceRef.current.getPlacePredictions(
      {
        input: value,
        componentRestrictions: { country: 'in' },
        types: ['geocode', 'establishment'],
      },
      (predictions, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          setSuggestions(predictions.slice(0, 5));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      }
    );
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSearchQuery(description);
    setShowSuggestions(false);

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
        geocoder.geocode({ placeId }, (results, status) => {
          if (status === 'OK' && results) resolve(results);
          else reject(new Error(status));
        });
      });

      const location = result[0]?.geometry?.location;
      if (location) {
        const lat = location.lat();
        const lng = location.lng();
        
        const address = result[0]?.formatted_address || '';
        const pincodeComponent = result[0]?.address_components.find((c) =>
          c.types.includes('postal_code')
        );
        const pincode = pincodeComponent?.long_name || '';

        onChange({ lat, lng, formattedAddress: address, pincode });
      }
    } catch (err) {
      console.error('Error fetching place details', err);
    }
  };

  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Location is not supported in this browser. Search for your address on the map instead.');
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        await getAddressDetails(lat, lng);
        setGettingLocation(false);
      },
      (error) => {
        setGettingLocation(false);
        console.error('Error getting location:', error);
        const code = (error as GeolocationPositionError).code;
        const msg =
          typeof code === 'number'
            ? geolocationErrorMessage(code, error.message)
            : `Unable to get your location: ${error.message}`;
        alert(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>📍 Your Location</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 20px' }}>
        Search for your location, use your current location, or drop a pin.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '20px' }}>
        <div style={{ position: 'relative' }} ref={suggestionsRef}>
          <div style={{ position: 'absolute', top: '15px', left: '16px', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input
            style={{
              ...S.input,
              paddingLeft: '44px',
              paddingRight: '16px',
              height: '50px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.2)',
              fontSize: '15px'
            }}
            placeholder="Search for an area or city..."
            value={searchQuery}
            onChange={handleSearchInput}
            onFocus={() => {
              if (suggestions.length > 0) setShowSuggestions(true);
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              marginTop: '8px',
              background: '#151520',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              backdropFilter: 'blur(20px)',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.6)',
            }}>
              {suggestions.map((s) => (
                <div
                  key={s.place_id}
                  onClick={() => handleSelectSuggestion(s.place_id, s.description)}
                  style={{
                    padding: '14px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    transition: 'background 0.2s',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ color: '#fff', fontSize: '14px', fontWeight: 500 }}>
                    {s.structured_formatting.main_text}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', marginTop: '4px' }}>
                    {s.structured_formatting.secondary_text}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>OR</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>
        
        <button
          onClick={handleCurrentLocation}
          disabled={gettingLocation}
          style={{
            ...S.btnSecondary,
            width: '100%',
            height: '50px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            background: gettingLocation ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)',
            borderColor: gettingLocation ? 'rgba(99,102,241,0.4)' : 'rgba(99,102,241,0.3)',
            color: '#a5b4fc',
            fontSize: '15px',
            fontWeight: 600,
            transition: 'all 0.2s',
            cursor: gettingLocation ? 'not-allowed' : 'pointer',
          }}
          onMouseOver={(e) => {
             if (!gettingLocation) e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
             if (!gettingLocation) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)';
          }}
          onMouseOut={(e) => {
             if (!gettingLocation) e.currentTarget.style.background = 'rgba(99,102,241,0.1)';
             if (!gettingLocation) e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)';
          }}
          title="Use Current Location"
        >
          {gettingLocation ? (
            <>
              <span className="spinner" style={{ 
                width: '16px', height: '16px', border: '2px solid rgba(165, 180, 252, 0.3)', 
                borderTopColor: '#a5b4fc', borderRadius: '50%', animation: 'spin 1s linear infinite' 
              }} />
              Fetching Location...
            </>
          ) : (
            <>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
              Use My Current Location
            </>
          )}
        </button>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(255, 255, 255, 0.45) !important;
          opacity: 1;
        }
      `}} />

      <div style={{ borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
        {isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '260px' }}
            center={markerPos || defaultCenter}
            zoom={markerPos ? 14 : 5}
            onClick={handleMapClick}
            options={{
              styles: [
                { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
                { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
                { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0f1a' }] },
              ],
              disableDefaultUI: false,
              zoomControl: true,
              streetViewControl: false,
              mapTypeControl: false,
              fullscreenControl: true,
            }}
          >
            {markerPos && <Marker position={markerPos} />}
          </GoogleMap>
        ) : (
          <div style={{ width: '100%', height: '260px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '14px' }}>
            Loading map...
          </div>
        )}
      </div>

      {data.formattedAddress && (
        <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '10px', padding: '12px 16px' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', margin: 0 }}>{data.formattedAddress}</p>
          {data.pincode && <p style={{ color: '#6366f1', fontSize: '12px', margin: '4px 0 0', fontWeight: 600 }}>Pincode: {data.pincode}</p>}
        </div>
      )}

      {!data.formattedAddress && (
        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px', textAlign: 'center', marginTop: '12px' }}>
          👆 Click on the map or use the options above to set your location
        </p>
      )}
    </div>
  );
}

// ============================================================
// STEP 3: Persona Selector
// ============================================================

const PERSONAS: { key: Persona; icon: string; label: string; desc: string }[] = [
  { key: 'HOMEOWNER', icon: '🏠', label: 'Homeowner', desc: 'Designing my own space' },
  { key: 'INTERIOR_DESIGNER', icon: '🎨', label: 'Interior Designer / Architect', desc: 'Designing for clients' },
  { key: 'REAL_ESTATE_DEVELOPER', icon: '🏗️', label: 'Developer / Builder', desc: 'Visualising property for sale' },
  { key: 'CONTRACTOR', icon: '🔨', label: 'Contractor / Carpenter', desc: 'Planning execution & builds' },
];

function Step3({ data, onChange }: { data: Step3Data; onChange: (d: Step3Data) => void }) {
  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>👤 How will you use Vision?</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 24px' }}>
        This helps us personalise your experience.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {PERSONAS.map((p) => {
          const selected = data.persona === p.key;
          return (
            <button
              key={p.key}
              onClick={() => onChange({ persona: p.key })}
              style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px 20px',
                background: selected ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.04)',
                border: selected ? '1px solid rgba(99,102,241,0.6)' : '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                transition: 'all 0.2s ease', width: '100%', fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: '24px' }}>{p.icon}</span>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{p.label}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '2px' }}>{p.desc}</div>
              </div>
              {selected && <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '18px' }}>✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// STEP 4: Business Details (conditional)
// ============================================================

function Step4({ data, onChange }: { data: Step4Data; onChange: (d: Step4Data) => void }) {
  return (
    <div>
      <h2 style={{ color: '#fff', fontSize: '22px', fontWeight: 700, margin: '0 0 6px' }}>🏢 Business Details</h2>
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', margin: '0 0 28px' }}>
        Help us understand your scale of work.
      </p>

      {[
        { key: 'companyName', label: 'Company / Studio Name', placeholder: 'Studio XYZ' },
        { key: 'portfolioLink', label: 'Portfolio or Instagram URL', placeholder: 'https://instagram.com/yourstudio' },
        { key: 'gstNumber', label: 'GST Number (optional)', placeholder: '27AAPFU0939F1ZV' },
        { key: 'businessPhone', label: 'Business Phone', placeholder: '+91 98765 43210' },
      ].map(({ key, label, placeholder }) => (
        <div key={key} style={{ marginBottom: '16px' }}>
          <label style={S.label}>{label}</label>
          <input
            style={S.input}
            placeholder={placeholder}
            value={(data as any)[key]}
            onChange={(e) => onChange({ ...data, [key]: e.target.value })}
          />
        </div>
      ))}

      <div style={{ marginBottom: '16px' }}>
        <label style={S.label}>Monthly Project Volume</label>
        <div style={{ display: 'flex', gap: '10px' }}>
          {(['1-3', '4-10', '10+'] as ProjectVolume[]).map((v) => (
            <button
              key={v}
              onClick={() => onChange({ ...data, monthlyProjectVolume: v })}
              style={{
                flex: 1, padding: '12px',
                background: data.monthlyProjectVolume === v ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)',
                border: data.monthlyProjectVolume === v ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px', color: data.monthlyProjectVolume === v ? '#fff' : 'rgba(255,255,255,0.5)',
                fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// STEP 5: Complete
// ============================================================

function Step5() {
  return (
    <div style={{ textAlign: 'center', padding: '20px 0' }}>
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
      <h2 style={{ color: '#fff', fontSize: '26px', fontWeight: 700, margin: '0 0 12px' }}>You're all set!</h2>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '15px', lineHeight: 1.6, margin: 0 }}>
        Your profile is complete. Let's start turning your floor plan into a stunning interior design.
      </p>
    </div>
  );
}

// ============================================================
// MAIN ONBOARDING PAGE
// ============================================================

const TOTAL_STEPS = 5;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true); // loading status from server
  const [error, setError] = useState('');

  const [step1, setStep1] = useState<Step1Data>({ phoneNumber: '', whatsappSame: true, whatsappNumber: '' });
  const [step2, setStep2] = useState<Step2Data>({ lat: 0, lng: 0, formattedAddress: '', pincode: '' });
  const [step3, setStep3] = useState<Step3Data>({ persona: '' });
  const [step4, setStep4] = useState<Step4Data>({
    companyName: '', portfolioLink: '', monthlyProjectVolume: '',
    gstNumber: '', businessPhone: '', businessLat: null, businessLng: null, businessAddress: '',
  });

  // On mount — fetch existing status and pre-fill form data
  useEffect(() => {
    getOnboardingStatus().then((status) => {
      if (!status) {
        setInitialising(false);
        return;
      }

      // If already completed, redirect to dashboard
      if (status.completed) {
        router.replace('/dashboard');
        return;
      }

      // Pre-populate form fields from existing data
      const e = status.existing;
      if (e) {
        setStep1({
          phoneNumber: e.phoneNumber || '',
          whatsappSame: !e.whatsappNumber || e.phoneNumber === e.whatsappNumber,
          whatsappNumber: e.whatsappNumber || '',
        });

        if (e.locationLat) {
          setStep2({
            lat: e.locationLat,
            lng: e.locationLng!,
            formattedAddress: e.formattedAddress || '',
            pincode: e.pincode || '',
          });
        }

        if (status.persona) {
          setStep3({ persona: status.persona as Persona });
        }

        const bp = e.businessProfile;
        if (bp) {
          setStep4((prev) => ({
            ...prev,
            companyName: bp.companyName || '',
            portfolioLink: bp.portfolioLink || '',
            monthlyProjectVolume: (bp.monthlyProjectVolume as any) || '',
            gstNumber: bp.gstNumber || '',
            businessPhone: bp.businessPhone || '',
          }));
        }
      }

      // Jump to the first INCOMPLETE step
      setStep(status.currentStep);
      setInitialising(false);
    });
  }, [router]);


  // Step-specific validation
  const canProceed = (): boolean => {
    if (step === 1) return step1.phoneNumber.length >= 10 && (step1.whatsappSame || step1.whatsappNumber.length >= 10);
    if (step === 2) return !!step2.formattedAddress || (step2.lat !== 0 && step2.lng !== 0);
    if (step === 3) return !!step3.persona;
    return true;
  };

  // Skip step 4 for homeowners
  const getNextStep = (current: number): number => {
    if (current === 3 && step3.persona === 'HOMEOWNER') return 5;
    return current + 1;
  };

  const getPrevStep = (current: number): number => {
    if (current === 5 && step3.persona === 'HOMEOWNER') return 3;
    return current - 1;
  };

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      setStep(getNextStep(step));
      return;
    }
    // Step 5 — submit
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload: OnboardingData = {
        phoneNumber: step1.phoneNumber,
        whatsappNumber: step1.whatsappSame ? step1.phoneNumber : step1.whatsappNumber,
        locationLat: step2.lat,
        locationLng: step2.lng,
        formattedAddress: step2.formattedAddress,
        pincode: step2.pincode,
        persona: step3.persona as Persona,
        ...(step3.persona !== 'HOMEOWNER' && {
          businessProfile: {
            companyName: step4.companyName || undefined,
            portfolioLink: step4.portfolioLink || undefined,
            monthlyProjectVolume: step4.monthlyProjectVolume || undefined,
            gstNumber: step4.gstNumber || undefined,
            businessPhone: step4.businessPhone || undefined,
          },
        }),
      };
      await completeOnboarding(payload);
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const isLastStep = step === TOTAL_STEPS;
  const displayStep = step < TOTAL_STEPS ? step : TOTAL_STEPS;

  return (
    <div style={S.page}>
      {initialising ? (
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
          Loading your profile…
        </div>
      ) : (
        <div style={S.card}>
          <ProgressBar step={displayStep} total={TOTAL_STEPS} />

          {step === 1 && <Step1 data={step1} onChange={setStep1} />}
          {step === 2 && <Step2 data={step2} onChange={setStep2} />}
          {step === 3 && <Step3 data={step3} onChange={setStep3} />}
          {step === 4 && <Step4 data={step4} onChange={setStep4} />}
          {step === 5 && <Step5 />}

          {error && (
            <div style={{ margin: '16px 0 0', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', color: '#ef4444', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
            {step > 1 && !isLastStep && (
              <button style={S.btnSecondary} onClick={() => setStep(getPrevStep(step))}>
                ← Back
              </button>
            )}
            <button
              style={{
                ...S.btn, flex: 1,
                opacity: (!canProceed() && !isLastStep) ? 0.5 : 1,
              }}
              disabled={(!canProceed() && !isLastStep) || loading}
              onClick={handleNext}
            >
              {loading ? 'Saving…' : isLastStep ? '🚀 Let\'s Go!' : 'Continue →'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
