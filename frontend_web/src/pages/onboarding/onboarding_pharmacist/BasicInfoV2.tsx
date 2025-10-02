/// <reference types="@types/google.maps" />
import * as React from 'react';
import {
  Box, Button, Chip,  TextField, Typography,   Dialog, DialogTitle, DialogContent, DialogActions, 

  InputAdornment, Alert, Snackbar
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

import apiClient from '../../../utils/apiClient';
import {  API_ENDPOINTS } from '../../../constants/api';
import { useAuth } from '../../../contexts/AuthContext';
import type { User } from '../../../contexts/AuthContext';


type ApiData = {
  // user*
  username?: string;
  first_name?: string;
  last_name?: string;

  phone_number?: string;
  ahpra_number?: string;
  government_id?: string | null;
  date_of_birth?: string | null;

  // optional address (saved on onboarding model)
  street_address?: string | null;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  google_place_id?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;

  // verification flags/notes
  ahpra_verified?: boolean | null;
  gov_id_verified?: boolean | null;
  ahpra_verification_note?: string | null;
  gov_id_verification_note?: string | null;
};

const GOOGLE_LIBRARIES = ['places'] as Array<'places'>;

export default function BasicInfoV2() {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [data, setData] = React.useState<ApiData>({});
  const [snack, setSnack] = React.useState<string>('');
  const [error, setError] = React.useState<string>('');
  const [addressDisplay, setAddressDisplay] = React.useState<string>('');
    const canSubmit = Boolean(data.ahpra_number);



  // --- mobile verification state & membership flag ---
  const { user, setUser } = useAuth();

  const hasMembership = Array.isArray(user?.memberships) && user.memberships.length > 0;
  const isMobileVerified = Boolean((user as any)?.is_mobile_verified);
  const [mobileVerifiedLocal, setMobileVerifiedLocal] = React.useState<boolean>(isMobileVerified);


  const [otpOpen, setOtpOpen] = React.useState(false);
  const [otp, setOtp] = React.useState('');
  const [otpBusy, setOtpBusy] = React.useState(false);
  const [otpMsg, setOtpMsg] = React.useState('');
  const [otpErr, setOtpErr] = React.useState('');

  // Google Places
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_Maps_API_KEY || '',
    libraries: GOOGLE_LIBRARIES,
  });
  const autocompleteRef = React.useRef<google.maps.places.Autocomplete | null>(null);

  const url = API_ENDPOINTS.onboardingV2Detail('pharmacist');

  React.useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError('');
    apiClient.get(url)
      .then(res => {
        if (!mounted) return;
        setData(res.data);
        // Pre-fill the visible address from parts so it never looks blank
        const s = [res.data.street_address, res.data.suburb, res.data.state, res.data.postcode]
          .filter(Boolean).join(', ');
        setAddressDisplay(s);
      })
      .catch(e => setError(e.response?.data?.detail || e.message))
      .finally(() => setLoading(false));
    return () => { mounted = false; };
  }, [url]);

  const setField = (name: keyof ApiData, value: any) =>
    setData(prev => ({ ...prev, [name]: value }));

  // const getFileUrl = (path?: string | null) =>
  //   path ? (path.startsWith('http') ? path : `${API_BASE_URL}${path}`) : '';

  // When user picks a place, keep a nice full string AND store structured parts
  const onPickPlace = () => {
    const a = autocompleteRef.current;
    if (!a) return;
    const place = a.getPlace();
    if (!place || !place.address_components) return;

    let streetNumber = '';
    let route = '';
    let locality = '';
    let postalCode = '';
    let stateShort = '';

    place.address_components.forEach(c => {
      const t = c.types;
      if (t.includes('street_number')) streetNumber = c.long_name;
      if (t.includes('route')) route = c.short_name;
      if (t.includes('locality')) locality = c.long_name;
      if (t.includes('postal_code')) postalCode = c.long_name;
      if (t.includes('administrative_area_level_1')) stateShort = c.short_name;
    });

    const pretty = place.formatted_address ||
      [streetNumber && route ? `${streetNumber} ${route}` : '', locality, stateShort, postalCode]
        .filter(Boolean).join(', ');

    setAddressDisplay(pretty);

    setData(prev => ({
      ...prev,
      street_address: `${streetNumber} ${route}`.trim() || prev.street_address || '',
      suburb: locality || prev.suburb || '',
      state: stateShort || prev.state || '',
      postcode: postalCode || prev.postcode || '',
      google_place_id: place.place_id || prev.google_place_id || '',
      latitude: place.geometry?.location?.lat() ?? prev.latitude ?? null,
      longitude: place.geometry?.location?.lng() ?? prev.longitude ?? null,
    }));
  };

  const save = async (submitForVerification: boolean) => {
    setSaving(true);
    setSnack('');
    setError('');
    try {
      const fd = new FormData();
      fd.append('tab', 'basic');
      if (submitForVerification) fd.append('submitted_for_verification', 'true');

      // user names
      if (data.username != null)   fd.append('username',   String(data.username));
      if (data.first_name != null) fd.append('first_name', String(data.first_name));
      if (data.last_name != null)  fd.append('last_name',  String(data.last_name));

      // phone/ahpra
      if (data.phone_number != null) fd.append('phone_number', String(data.phone_number));
      if (data.ahpra_number != null) fd.append('ahpra_number', String(data.ahpra_number));

      // date of birth
      if (data.date_of_birth != null) fd.append('date_of_birth', String(data.date_of_birth));

      // address
      (['street_address','suburb','state','postcode','google_place_id','latitude','longitude'] as const)
        .forEach(k => {
          const v = data[k];
          if (v != null && v !== '') fd.append(k, String(v));
        });

      // government id file

      const res = await apiClient.patch(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setData(res.data);

      // refresh the visible address line from saved parts (in case backend normalizes)
      const s = [res.data.street_address, res.data.suburb, res.data.state, res.data.postcode]
        .filter(Boolean).join(', ');
      if (s) setAddressDisplay(s);

      setSnack(submitForVerification ? 'Submitted for verification.' : 'Saved.');
    } catch (e: any) {
      const resp = e.response?.data;
      setError(
        resp && typeof resp === 'object'
          ? Object.entries(resp).map(([k, v]) => `${k}: ${(v as any[]).join(', ')}`).join('\n')
          : e.message
      );
    } finally {
      setSaving(false);
    }
  };

  const VerifiedChip = ({ ok, label }: { ok?: boolean | null; label: string }) => {
    if (ok === true)   return <Chip icon={<CheckCircleOutlineIcon />} color="success" label={label} variant="outlined" />;
    if (ok === false)  return <Chip icon={<ErrorOutlineIcon />}   color="error"   label={`${label}`} variant="outlined" />;
    return               <Chip icon={<HourglassBottomIcon />}      label={`${label}`}               variant="outlined" />;
  };


  // --- mobile OTP handlers ---
const sendMobileOtp = async () => {
  setOtpBusy(true); setOtpErr(''); setOtpMsg('');
  try {
    await apiClient.post(API_ENDPOINTS.mobileRequestOtp, {
      mobile_number: data.phone_number,
    });
    setOtpMsg('Code sent to your mobile.');
  } catch (e: any) {
    setOtpErr(e?.response?.data?.error || e?.response?.data?.detail || e.message || 'Failed to send code.');
  } finally {
    setOtpBusy(false);
  }
};

const verifyMobileOtp = async () => {
  setOtpBusy(true); setOtpErr(''); setOtpMsg('');
  try {
    await apiClient.post(API_ENDPOINTS.mobileVerifyOtp, { otp });
    setOtpMsg('Mobile verified!');
    setMobileVerifiedLocal(true);
if (setUser) {
  setUser((prev: User | null) => (prev ? { ...prev, is_mobile_verified: true } : prev));
}


    // Optionally close after success:
    // setTimeout(() => setOtpOpen(false), 800);
  } catch (e: any) {
    setOtpErr(e?.response?.data?.error || e?.response?.data?.detail || e.message || 'Verification failed.');
  } finally {
    setOtpBusy(false);
  }
};

const resendMobileOtp = async () => {
  setOtpBusy(true); setOtpErr(''); setOtpMsg('');
  try {
    await apiClient.post(API_ENDPOINTS.mobileResendOtp, {});
    setOtpMsg('New code sent.');
  } catch (e: any) {
    setOtpErr(e?.response?.data?.error || e?.response?.data?.detail || e.message || 'Could not resend code.');
  } finally {
    setOtpBusy(false);
  }
};

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Basic Information
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          label="First Legal Name"
          value={data.first_name || ''}
          onChange={e => setField('first_name', e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}
        />
        <TextField
          label="Last Legal Name"
          value={data.last_name || ''}
          onChange={e => setField('last_name', e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}
        />
        <TextField
          label="Username"
          value={data.username || ''}
          onChange={e => setField('username', e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}
        />
        <TextField
          label="Phone Number"
          value={data.phone_number || ''}
          onChange={e => setField('phone_number', e.target.value)}
          required={!hasMembership}
          disabled={isMobileVerified || mobileVerifiedLocal}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 320 }}
        />
{(isMobileVerified || mobileVerifiedLocal) ? (
  <Box sx={{ mt: 1 }}>
    <VerifiedChip ok={true} label="Mobile Verified" />
  </Box>
) : (
  <Box sx={{ mt: 1 }}>
    <Button
      size="small"
      variant="outlined"
      onClick={() => setOtpOpen(true)}
      disabled={!data.phone_number}
    >
      Verify mobile
    </Button>
    {!hasMembership && (
      <Typography variant="caption" sx={{ ml: 1 }} color="text.secondary">
        Required for regular registrations
      </Typography>
    )}
  </Box>
)}

      </Box>
        <TextField
          label="Date of Birth"
          type="date"
          value={data.date_of_birth || ''}
          onChange={e => setField('date_of_birth', e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ flex: '1 1 220px', minWidth: 200, maxWidth: 220 }}
        />


      {/* Address section */}
      <Typography variant="subtitle1" sx={{ mt: 1, mb: 1 }}>
        Address (optional)
      </Typography>

      {/* Search address (controlled) */}
      <Box sx={{ mb: 2 }}>
        {isLoaded ? (
          <Autocomplete
            onLoad={(ref) => (autocompleteRef.current = ref)}
            onPlaceChanged={onPickPlace}
            options={{
              componentRestrictions: { country: 'au' },
              fields: ['address_components', 'geometry', 'place_id', 'formatted_address'],
            }}
          >
            <TextField
              fullWidth
              label="Search Address"
              value={addressDisplay}
              onChange={(e) => setAddressDisplay(e.target.value)}
            />
          </Autocomplete>
        ) : loadError ? (
          <Typography color="error">Google Maps failed to load.</Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">Loading address input…</Typography>
        )}
      </Box>

      {/* Structured address parts */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
        <TextField
          label="Street Address"
          value={data.street_address || ''}
          onChange={e => setField('street_address', e.target.value)}
          sx={{ flex: '2 1 360px', minWidth: 260, maxWidth: 560 }} />
        <TextField
          label="Suburb"
          value={data.suburb || ''}
          onChange={e => setField('suburb', e.target.value)}
          sx={{ flex: '1 1 220px', minWidth: 180, maxWidth: 280 }} />
        <TextField
          label="State"
          value={data.state || ''}
          onChange={e => setField('state', e.target.value)}
          sx={{ flex: '0 1 120px', minWidth: 100, maxWidth: 140 }} />
        <TextField
          label="Postcode"
          value={data.postcode || ''}
          onChange={e => setField('postcode', e.target.value)}
          sx={{ flex: '0 1 140px', minWidth: 100, maxWidth: 160 }} />
      </Box>



      {/* AHPRA row — chip + note stay aligned, wrap nicely on small */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center', mb: 2 }}>
        <TextField
          label="AHPRA Number"
          value={data.ahpra_number || ''}
          onChange={e => setField('ahpra_number', e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start">PHA000</InputAdornment> }}
          sx={{ flex: '1 1 320px', minWidth: 240, maxWidth: 420 }}
        />
        <VerifiedChip ok={data.ahpra_verified} label="AHPRA" />
        {typeof data.ahpra_verified === 'boolean' && (
          <Typography
            variant="body2"
            title={data.ahpra_verification_note || (data.ahpra_verified ? 'Verified' : 'Pending/Not verified')}
            sx={{
              color: data.ahpra_verified
                ? 'success.main'
                : (data.ahpra_verification_note ? 'error.main' : 'text.secondary'),
              flex: '1 1 260px',
              minWidth: 180,
              maxWidth: 520,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.ahpra_verification_note || (data.ahpra_verified ? 'AHPRA registration is valid and current.' : 'Pending/Not verified')}
          </Typography>
        )}
      </Box>

      {/* Actions: Save left, Submit right */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, flexWrap: 'wrap', gap: 1.5 }}>
        <Button variant="outlined" disabled={saving} onClick={() => save(false)}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      <Button variant="contained" disabled={saving || !canSubmit} onClick={() => save(true)}>
        {saving ? 'Submitting…' : 'Submit & Verify Basic'}
      </Button>
      </Box>
      <Dialog open={otpOpen} onClose={() => setOtpOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Verify Mobile</DialogTitle>
        <DialogContent>
          {otpErr && <Alert severity="error" sx={{ mb: 1 }}>{otpErr}</Alert>}
          {otpMsg && <Alert severity="success" sx={{ mb: 1 }}>{otpMsg}</Alert>}

          <Typography variant="body2" sx={{ mb: 1 }}>
            Number: <b>{data.phone_number || '—'}</b>
          </Typography>

          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Button variant="outlined" onClick={sendMobileOtp} disabled={otpBusy || !data.phone_number}>
              Send code
            </Button>
            <Button variant="text" onClick={resendMobileOtp} disabled={otpBusy}>
              Resend
            </Button>
          </Box>

          <TextField
            fullWidth
            label="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            disabled={otpBusy}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOtpOpen(false)} disabled={otpBusy}>Close</Button>
          <Button variant="contained" onClick={verifyMobileOtp} disabled={otpBusy || !otp}>
            {otpBusy ? 'Please wait…' : 'Verify'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={2400} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
