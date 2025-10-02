// src/pages/onboardingV2/PharmacistOnboardingV2Layout.tsx
import * as React from "react";
import {
  Box,
  Button,
  Container,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import apiClient from "../../../utils/apiClient";
import { API_ENDPOINTS } from "../../../constants/api";

import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const BRAND = {
  grad: "linear-gradient(90deg, #7c3aed 0%, #2563eb 100%)",
};

const theme = createTheme({
  typography: { fontFamily: `"Inter", system-ui, Arial, sans-serif` },
  shape: { borderRadius: 12 },
});

// your tab pages
import BasicInfoV2 from "./BasicInfoV2";
import InterestsV2 from "./InterestsV2";
import RefereesV2 from "./RefereesV2";
import ProfileV2 from "./ProfileV2";
import IdentityV2 from "./IdentityV2";

type StepKey = "basic" | "identity" | "interests" | "referees" | "profile";

const STEPS: Array<{ key: StepKey; label: string }> = [
  { key: "basic",     label: "Basic Info" },
  { key: "identity",  label: "Identity" },
  { key: "interests", label: "Interests" },
  { key: "referees",  label: "Referees" },
  { key: "profile",   label: "Profile" },
];

export default function ExplorerOnboardingV2Layout() {
  const [step, setStep] = React.useState<StepKey>("basic");
  const [progress, setProgress] = React.useState<number>(0);
  const idx = STEPS.findIndex(s => s.key === step);
  const goNext = () => setStep(STEPS[Math.min(idx + 1, STEPS.length - 1)].key);
  const goBack = () => setStep(STEPS[Math.max(idx - 1, 0)].key);
  // const stepLabel = STEPS[idx]?.label ?? "";

  // Load real progress from backend on mount
  React.useEffect(() => {
    const url = API_ENDPOINTS.onboardingV2Detail("explorer");
    apiClient
      .get(url)
      .then((res) => {
        const p = res.data?.progress_percent ?? 0;
        setProgress(Number.isFinite(p) ? p : 0);
      })
      .catch(() => {
        setProgress(0);
      });
  }, []);

return (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 } }}>
        {/* Header + ONLY progress bar here */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Explorer Onboarding
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progress: {progress}%
            </Typography>
          </Box>
          <LinearProgress
            color="primary"
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 999 }}
          />
        </Box>
        {/* Top pills nav */}
          <Box
            sx={{
              display: { xs: "none", md: "flex" },
              justifyContent: "center",
              gap: 1,
              mb: 2,
              flexWrap: "wrap",
            }}
          >
          {STEPS.map((s) => {
            const active = s.key === step;
            return (
<Button
  key={s.key}
  onClick={() => setStep(s.key)}
  sx={{
    textTransform: "none",
    fontWeight: 700,
    borderRadius: 3,
    py: 1,
    px: 3,                 // give pills some horizontal padding
    minWidth: "auto",      // don't force Material default min width
    whiteSpace: "nowrap",  // keep label on one line
    flex: "0 0 auto",      // do not stretch in the flex row
    ...(active
      ? {
          background: BRAND.grad,
          color: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,.12)",
          "&:hover": { opacity: 0.95, background: BRAND.grad },
        }
      : {}),
  }}
  variant={active ? "contained" : "outlined"}
>
  {STEPS.findIndex(x => x.key === s.key) + 1}. {s.label}
</Button>
            );
          })}
        </Box>

        {/* Two-column layout */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "260px 1fr" },
            gap: 2.5,
          }}
        >
          {/* Left: step buttons — light blue border, subtle fade when active */}
          <Box>
            <Stack spacing={1.2}>
              {STEPS.map((s) => {
                const active = s.key === step;
                return (
                  <Button
                    key={s.key}
                    onClick={() => setStep(s.key)}
                    fullWidth
                    size="large"
                    variant={active ? "contained" : "outlined"}
                    color="primary"
                    sx={(theme) => ({
                      justifyContent: "flex-start",
                      fontWeight: 700,
                      textTransform: "none",
                      borderRadius: 2,
                      borderWidth: active ? 0 : 1,
                      borderColor: active ? "transparent" : theme.palette.divider,
                      ...(active
                        ? {
                            // match the top bar gradient
                            background: BRAND.grad,
                            color: "#fff",
                            boxShadow: "0 2px 6px rgba(0,0,0,.12)",
                            "&:hover": { opacity: 0.95, background: BRAND.grad },
                          }
                        : {
                            backgroundColor: "transparent",
                            "&:hover": {
                              borderColor: theme.palette.primary.main,
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }),
                    })}
                  >
                    {STEPS.findIndex((x) => x.key === s.key) + 1}. {s.label}
                  </Button>


                );
              })}
            </Stack>
          </Box>
        {/* Right: page content with header actions */}
        <Box
          sx={{
            minHeight: 320,
            p: { xs: 2, md: 3 },
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 3,
            bgcolor: "background.paper",
          }}
        >
          {/* Header row – hide Next on last step */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", mb: 2 }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              {/* Always show Back button except on the very first page */}
              {idx > 0 && (
                <Button variant="outlined" onClick={goBack}>
                  Back
                </Button>
              )}

              {/* Only show Next button when it's NOT the last step */}
              {idx < STEPS.length - 1 && (
                <Button
                  variant="contained"
                  onClick={goNext}
                  sx={{ background: BRAND.grad }}
                >
                  Next
                </Button>
              )}
            </Box>
          </Box>

          {/* Render the current page */}
            {step === "basic"     && <BasicInfoV2 />}
            {step === "identity"  && <IdentityV2 />}
            {step === "interests" && <InterestsV2 />}
            {step === "referees"  && <RefereesV2 />}
            {step === "profile"   && <ProfileV2 />}
        </Box>


        </Box>
      </Paper>
    </Container>
  </ThemeProvider>
);
}
