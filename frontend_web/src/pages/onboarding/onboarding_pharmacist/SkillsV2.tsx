// src/pages/onboardingV2/SkillsV2.tsx
import * as React from 'react';
import {
  Box, Stack, Typography, Checkbox, FormControlLabel, Button, Link,
  Alert, Snackbar, Chip, Divider, CircularProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';

import apiClient from '../../../utils/apiClient';
import { API_BASE_URL, API_ENDPOINTS } from '../../../constants/api';

// ---- Legacy choices (match old codes/labels you used) ----
// You can extend this with the full set you had historically.
const SKILL_CHOICES: Array<{ value: string; label: string }> = [
  { value: 'VACCINATION', label: 'Vaccination (w/ Anaphylaxis training)' },
  { value: 'CANNABIS',    label: 'Cannabis handling (no cert)' },
  { value: 'COMPOUNDING', label: 'Compounding' },
  { value: 'CRED_PHARM',  label: 'Credentialed Pharmacist' },
  { value: 'FIRST_AID',   label: 'First Aid/CPR' },
  { value: 'PDL',         label: 'PDL Insurance Certificate' },
];

type CertRow = {
  skill_code: string;
  path: string;
  url?: string | null;
  uploaded_at?: string | null;
};

type ApiData = {
  skills?: string[];
  skill_certificates?: CertRow[];
};

export default function SkillsV2() {
  const url = API_ENDPOINTS.onboardingV2Detail('pharmacist');

  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [snack, setSnack] = React.useState('');
  const [error, setError] = React.useState('');

  const [selected, setSelected] = React.useState<string[]>([]);
  const [existingCerts, setExistingCerts] = React.useState<Record<string, CertRow>>({});
  const [pendingFiles, setPendingFiles] = React.useState<Record<string, File | null>>({}); // newly chosen (not yet uploaded)

  // Build absolute link if backend returned a relative media path
  const getFileUrl = (path?: string | null) =>
    path ? (path.startsWith('http') ? path : `${API_BASE_URL}${path}`) : '';

  // ---------- load ----------
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await apiClient.get(url);
        if (!mounted) return;
        const d: ApiData = res.data || {};
        setSelected(d.skills || []);
        const byCode: Record<string, CertRow> = {};
        (d.skill_certificates || []).forEach(row => { byCode[row.skill_code] = row; });
        setExistingCerts(byCode);
      } catch (e: any) {
        setError(e.response?.data?.detail || e.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [url]);

  // ---------- interactions ----------
  const toggleSkill = (code: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    setSelected(prev => checked ? [...new Set([...prev, code])] : prev.filter(x => x !== code));
    // Optional: if unchecking, keep any previously picked file in case user re-checks quickly
  };

  const pickFileFor = (code: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setPendingFiles(prev => ({ ...prev, [code]: f }));
  };

  const hasExisting = (code: string) => Boolean(existingCerts[code]?.path);
  const hasPending = (code: string) => Boolean(pendingFiles[code]);

  const previewPendingUrl = (code: string) => {
    const f = pendingFiles[code];
    return f ? URL.createObjectURL(f) : '';
  };

  const validateClientSide = (): string[] => {
    // If a skill is checked, the user must either have an existing cert OR pick a new file now.
    const missing = selected.filter(code => !hasExisting(code) && !hasPending(code));
    return missing;
  };

  // ---------- save ----------
  const save = async () => {
    setSaving(true);
    setSnack('');
    setError('');
    try {
      // Client-side precheck (server enforces as well)
      const missing = validateClientSide();
      if (missing.length) {
        setError(`Please upload a certificate for: ${missing.join(', ')}`);
        setSaving(false);
        return;
      }

      const fd = new FormData();
      fd.append('tab', 'skills');
      fd.append('skills', JSON.stringify(selected));
      // Append each *checked* skill's file if user picked one this round
      selected.forEach(code => {
        const f = pendingFiles[code];
        if (f) fd.append(code, f); // serializer accepts flat "CBR" or "skill_files[CBR]"
      });

      const res = await apiClient.patch(url, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const d: ApiData = res.data || {};
      setSelected(d.skills || []);
      const byCode: Record<string, CertRow> = {};
      (d.skill_certificates || []).forEach(row => { byCode[row.skill_code] = row; });
      setExistingCerts(byCode);

      // Clear pending files that were just uploaded successfully
      setPendingFiles(prev => {
        const next = { ...prev };
        selected.forEach(code => { if (next[code]) delete next[code]; });
        return next;
      });

      setSnack('Skills saved.');
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

  if (loading) return <Typography>Loading…</Typography>;

  return (
    <Box sx={{ width: '100%', maxWidth: 960, px: { xs: 2, md: 3 }, pb: 3 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
        Skills
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2, whiteSpace: 'pre-line' }}>{error}</Alert>}

      {/* Legend / guidance */}
      <Alert severity="info" sx={{ mb: 2 }}>
        Checking a skill is optional. If a skill is checked, you <b>must upload</b> a certificate (PDF or image). 
      </Alert>

      {/* Checkbox grid — 2 cols on md+, 1 col on mobile */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: '1fr', md: '1fr 1fr' },
          gap: 1.5,
        }}
      >
        {SKILL_CHOICES.map(opt => {
          const checked = selected.includes(opt.value);
          const existingUrl = getFileUrl(existingCerts[opt.value]?.url || existingCerts[opt.value]?.path);
          const pendingUrl = previewPendingUrl(opt.value);
          const needsFile = checked && !hasExisting(opt.value) && !hasPending(opt.value);

          return (
            <Box
              key={opt.value}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
                p: 1.25,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
              }}
            >
              <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap' }}>
                <FormControlLabel
                  control={<Checkbox checked={checked} onChange={toggleSkill(opt.value)} />}
                  label={opt.label}
                />

                {/* status chip: has existing? has pending? needs file? */}
                {checked ? (
                  hasPending(opt.value) ? (
                    <Chip icon={<UploadFileIcon />} label="File selected" size="small" />
                  ) : hasExisting(opt.value) ? (
                    <Chip icon={<CheckCircleOutlineIcon />} color="success" variant="outlined" label="On file" size="small" />
                  ) : needsFile ? (
                    <Chip icon={<HourglassBottomIcon />} color="warning" variant="outlined" label="Certificate required" size="small" />
                  ) : null
                ) : null}
              </Stack>

              {/* Upload / View row (shown only when checked) */}
              {checked && (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: 'wrap' }}>
                  <Button
                    variant="outlined"
                    size="small"
                    component="label"
                    startIcon={<UploadFileIcon />}
                  >
                    {hasPending(opt.value) ? 'Change file' : 'Upload certificate'}
                    <input
                      hidden
                      type="file"
                      accept="image/*,.pdf"
                      onChange={pickFileFor(opt.value)}
                    />
                  </Button>

                  {/* Show "View" for existing in storage */}
                  {hasExisting(opt.value) && (
                    <Link href={existingUrl} target="_blank" rel="noopener noreferrer">
                      View current
                    </Link>
                  )}

                  {/* Show "Preview" for just-picked file this session */}
                  {hasPending(opt.value) && (
                    <Link href={pendingUrl} target="_blank" rel="noopener noreferrer">
                      Preview selected
                    </Link>
                  )}
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Stack direction="row" spacing={1.5} sx={{ pt: .5 }}>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? (<><CircularProgress size={18} sx={{ mr: 1 }} />Saving…</>) : 'Save Skills'}
        </Button>
      </Stack>

      <Snackbar open={!!snack} autoHideDuration={2400} onClose={() => setSnack('')} message={snack} />
    </Box>
  );
}
