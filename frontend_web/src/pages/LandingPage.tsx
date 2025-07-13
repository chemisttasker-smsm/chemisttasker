import React, { useEffect, useRef, useState } from 'react';
import {
  AppBar, Box, Button, Container, CssBaseline, IconButton, Menu, MenuItem, ThemeProvider,
  Toolbar, Typography, createTheme, styled, Modal
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import * as THREE from 'three';
import YouTube from 'react-youtube';
import logoBanner from '../assets/logo-banner.jpg';

// --- Constants ---
const PAGE_ROUTES = {
  login: '/login',
  register: '/register',
  publicJobBoard: '/shifts/public-board',
};

// --- Theme and Global Styles ---
const theme = createTheme({
  palette: {
    primary: { main: '#00a99d' },
    secondary: { main: '#c724b1' },
    text: { primary: '#344767', secondary: '#0d1a2e' },
    background: { default: '#f8f9fa', paper: '#ffffff' },
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
    h1: { fontWeight: 800, color: '#0d1a2e' },
    h2: { fontWeight: 700, color: '#0d1a2e' },
    h3: { fontWeight: 700, color: '#0d1a2e' },
    h4: { fontWeight: 700, color: '#0d1a2e' },
  },
});

const CtaButton = styled(Button)(({ theme }) => ({
  transition: 'all 0.3s ease',
  boxShadow: `0 4px 6px rgba(0, 0, 0, 0.1), 0 10px 20px ${theme.palette.primary.main}33`,
  backgroundColor: theme.palette.primary.main,
  color: 'white',
  borderRadius: '8px',
  fontWeight: 600,
  '&:hover': {
    backgroundColor: theme.palette.primary.dark,
    transform: 'translateY(-5px) scale(1.05)',
    boxShadow: `0 7px 14px rgba(0, 0, 0, 0.1), 0 15px 30px ${theme.palette.primary.main}4D`,
  },
}));
const FeatureCard = styled(Box)({
  backgroundColor: 'white',
  borderRadius: '1.5rem',
  border: '1px solid #e2e8f0',
  transition: 'all 0.3s ease',
  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
  height: '100%',
  textAlign: 'center',
  padding: '2rem',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
  },
});

function LandingPage() {
  const [anchorElNav, setAnchorElNav] = useState<null | HTMLElement>(null);

  const handleOpenNavMenu = (event: React.MouseEvent<HTMLElement>) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);
  const handleNavClick = (anchor: string) => {
    document.querySelector(anchor)?.scrollIntoView({ behavior: 'smooth' });
    handleCloseNavMenu();
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" sx={{ bgcolor: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)', boxShadow: 'none', borderBottom: '1px solid #e2e8f0' }}>
        <Container maxWidth="xl">
          <Toolbar disableGutters sx={{ justifyContent: 'space-between' }}>
            <a href="/" style={{ display: 'flex', alignItems: 'center' }}>
              <img src={logoBanner} alt="ChemistTaskerRx Logo" style={{ height: '48px', width: 'auto' }} />
            </a>
            <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end', alignItems: 'center', gap: 4 }}>
              <Button onClick={() => handleNavClick('#how-it-works')} sx={{ color: 'text.primary', fontWeight: 500 }}>How It Works</Button>
              <Button onClick={() => handleNavClick('#for-who')} sx={{ color: 'text.primary', fontWeight: 500 }}>For Who?</Button>
              <Button href={PAGE_ROUTES.login} sx={{ color: 'text.primary', fontWeight: 500 }}>Login</Button>
              <CtaButton href={PAGE_ROUTES.register} variant="contained" size="small" sx={{ px: 2.5, py: 1 }}>Sign Up</CtaButton>
            </Box>
            <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' }, justifyContent: 'flex-end' }}>
              <IconButton size="large" onClick={handleOpenNavMenu} color="inherit">
                <MenuIcon sx={{ color: 'text.primary' }} />
              </IconButton>
              <Menu anchorEl={anchorElNav} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                keepMounted transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                open={Boolean(anchorElNav)} onClose={handleCloseNavMenu}
                sx={{ display: { xs: 'block', md: 'none' } }}>
                <MenuItem onClick={() => handleNavClick('#how-it-works')}><Typography>How It Works</Typography></MenuItem>
                <MenuItem onClick={() => handleNavClick('#for-who')}><Typography>For Who?</Typography></MenuItem>
                <MenuItem component="a" href={PAGE_ROUTES.login}><Typography>Login</Typography></MenuItem>
                <MenuItem component="a" href={PAGE_ROUTES.register}>
                  <CtaButton variant="contained" fullWidth>Sign Up</CtaButton>
                </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>``
      </AppBar>

      <main>
        <HeroSection />
        <HowItWorksSplitSection />
        <ForWhoSection />
        <FinalCTASection />
      </main>

      <Box component="footer" sx={{ bgcolor: '#e9ecef', py: 4, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          &copy; {new Date().getFullYear()} ChemistTasker Pty Ltd. All rights reserved.
        </Typography>
      </Box>
    </ThemeProvider>
  );
}

// --- Hero Section ---
const HeroSection: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let network: THREE.Group;
    let animationFrameId: number;
    let mouseX = 0;
    const heroSection = canvasRef.current.parentElement as HTMLElement;

    const init = () => {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(60, heroSection.offsetWidth / heroSection.offsetHeight, 1, 2000);
      camera.position.z = 500;

      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true, alpha: true });
      renderer.setSize(heroSection.offsetWidth, heroSection.offsetHeight);
      renderer.setClearColor(0xffffff, 0);

      network = new THREE.Group();
      scene.add(network);

      const nodeGeometry = new THREE.SphereGeometry(4, 16, 16);
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0x00a99d });
      const nodes: THREE.Mesh[] = [];
      for (let i = 0; i < 50; i++) {
        const node = new THREE.Mesh(nodeGeometry, nodeMaterial);
        node.position.set(
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000,
          (Math.random() - 0.5) * 1000
        );
        network.add(node);
        nodes.push(node);
      }
      const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00a99d, transparent: true, opacity: 0.1 });
      nodes.forEach(startNode => {
        const endNode = nodes[Math.floor(Math.random() * nodes.length)];
        if (startNode === endNode) return;
        const points = [startNode.position, endNode.position];
        const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(lineGeometry, lineMaterial);
        network.add(line);
      });

      const onMouseMove = (event: MouseEvent) => {
        mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      };

      const onWindowResize = () => {
        camera.aspect = heroSection.offsetWidth / heroSection.offsetHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(heroSection.offsetWidth, heroSection.offsetHeight);
      };

      document.addEventListener('mousemove', onMouseMove);
      window.addEventListener('resize', onWindowResize);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        network.rotation.y += 0.0005 + (mouseX * 0.001);
        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animationFrameId);
        document.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('resize', onWindowResize);
        renderer.dispose();
      };
    };

    const cleanup = init();
    return cleanup;
  }, []);

  return (
    <Box
      component="section"
      sx={{
        position: 'relative',
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        bgcolor: 'background.paper',
      }}
    >
      <Box
        component="canvas"
        ref={canvasRef}
        sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1 }}
      />
      <Container sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '90vh' }}>
        <Box
          sx={{
            px: { xs: 2, sm: 6, md: 10 },
            py: { xs: 6, sm: 8, md: 10 },
            borderRadius: 4,
            bgcolor: 'rgba(255,255,255,0.98)',
            boxShadow: '0 8px 32px 0 rgba(31,38,135,0.10)',
            border: '1.5px solid rgba(255,255,255,0.32)',
            backdropFilter: 'blur(12px)',
            maxWidth: 900,
            width: { xs: '98%', sm: '95%', md: '85%' },
            textAlign: 'center',
            mx: 'auto'
          }}
        >
          <Typography variant="h1" component="h1" sx={{
            mb: 2.5,
            fontSize: { xs: '2.1rem', sm: '2.7rem', md: '3.1rem' },
            fontWeight: 800,
            lineHeight: 1.16
          }}>
            One Platform. Every Pharmacy Solution
          </Typography>
          <Typography variant="h6" sx={{
            mb: 4,
            color: 'text.primary',
            fontWeight: 400,
            fontSize: { xs: '1.08rem', sm: '1.18rem', md: '1.23rem' }
          }}>
            Easily manage schedules, staff, compliance, and payments—all in one place,<br />
            all with ChemistTasker.
          </Typography>
          <Box sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            justifyContent: 'center',
            alignItems: 'center',
            mt: 2
          }}>
            <CtaButton href={PAGE_ROUTES.publicJobBoard} sx={{ px: 4, py: 1.5, fontSize: '1.08rem' }}>
              Find a Flexible Shift
            </CtaButton>
            <CtaButton href={PAGE_ROUTES.register} sx={{
              px: 4, py: 1.5, fontSize: '1.08rem',
              bgcolor: '#c724b1', color: 'white', '&:hover': { bgcolor: '#a0178a' }
            }}>
              Sign Up for Early Access
            </CtaButton>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

// --- How It Works Split Section (carousel/rotation+video for both roles) ---

interface Step {
  title: string;
  description: string;
  videoId?: string | null;
}

const ownerSteps: Step[] = [
  {
    title: "Instant Roster Link",
    description: "Your open shifts are detected automatically from your system.",
    videoId: "dQw4w9WgXcQ"
  },
  {
    title: "Internal Team Notified First",
    description: "Staff get first chance to fill shifts before escalation.",
    videoId: "dQw4w9WgXcQ"
  },
  {
    title: "Public Platform Escalation",
    description: "Broadcast to verified locums for fast, Award-compliant coverage.",
    videoId: "dQw4w9WgXcQ"
  }
];

const pharmacistSteps: Step[] = [
    {
      title: "Find & Manage Shifts",
      description: "Set your availability, apply for shifts that suit you, and see your entire roster in one place.",
      videoId: "dQw4w9WgXcQ"
    },
    {
      title: "Seamless Invoicing",
      description: "Handle all your billing and payments easily with instant, automated invoices.",
      videoId: "dQw4w9WgXcQ"
    },
    {
      title: "Pitch Yourself",
      description: "Make yourself visible among pharmacy professionals—showcase your strengths, build your profile, and get noticed for the best shifts.",
      videoId: "PITCH_VIDEO_ID"
    },
];

const HowItWorksSplitSection: React.FC = () => (
  <Box id="how-it-works" component="section" sx={{ py: { xs: 8, md: 12 }, bgcolor: 'background.paper' }}>
    <Container>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h2">
          How It Works
        </Typography>
      </Box>
        <Box
          sx={{
            display: 'flex',
            // On medium (md) screens and up, arrange them in a row
            flexDirection: { xs: 'column', md: 'row' },
            // Increase the gap on medium screens
            gap: { xs: 8, md: 12 },
            justifyContent: 'center',
            alignItems: { xs: 'center', md: 'flex-start' },
          }}
        >

        <Box sx={{ width: 340, minWidth: 320, display: 'flex', justifyContent: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', textAlign: 'center' }}>
              For Pharmacy Owners
            </Typography>
            <StepsCarousel steps={ownerSteps} />
          </Box>
        </Box>
        <Box sx={{ width: 340, minWidth: 320, display: 'flex', justifyContent: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ mb: 3, color: 'primary.main', textAlign: 'center' }}>
              For Pharmacy Staff
            </Typography>
            <StepsCarousel steps={pharmacistSteps} />
          </Box>
        </Box>
      </Box>
    </Container>
  </Box>
);

// --- Steps Carousel (3D) ---
const StepsCarousel: React.FC<{ steps: Step[] }> = ({ steps }) => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [videoOpenIndex, setVideoOpenIndex] = useState<number | null>(null);

  const anglePerSlide = 360 / steps.length;
  
  // CORRECTED: Using a smaller, more stable radius to prevent layout issues.
  const radius = 210;

  return (
    <Box sx={{
      position: 'relative',
      width: 320,
      height: 390,
      perspective: '1800px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      mx: 'auto'
    }}>
      {/* Rotating Slides */}
      <Box sx={{
        width: 320,
        height: 370,
        position: 'absolute',
        transformStyle: 'preserve-3d',
        transition: 'transform 1s cubic-bezier(0.77, 0, 0.175, 1)',
        transform: `rotateY(${-currentIndex * anglePerSlide}deg)`
      }}>
        {steps.map((slide, i) => (
          <Box key={i} sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 320,
            height: 370,
            background: 'white',
            borderRadius: '1.25rem',
            boxShadow: '0 12px 24px -5px rgba(0,0,0,0.10), 0 6px 12px -5px rgba(0,0,0,0.06)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: '2rem',
            textAlign: 'center',
            backfaceVisibility: 'hidden',
            transform: `rotateY(${i * anglePerSlide}deg) translateZ(${radius}px)`
          }}>
            <Typography variant="h5" component="h3" sx={{ fontWeight: 700, color: 'primary.main', mb: 1.5 }}>
              {slide.title}
            </Typography>
            <Typography variant="body2" sx={{ mb: slide.videoId ? 2 : 0 }}>{slide.description}</Typography>
            {slide.videoId && (
              <Box sx={{ mt: 2 }}>
                <IconButton
                  onClick={() => setVideoOpenIndex(i)}
                  color="primary"
                  sx={{
                    border: '2px solid #00a99d',
                    borderRadius: '50%',
                    p: 2,
                    background: '#f3fefd',
                    mb: 1
                  }}
                  aria-label="Play Illustration Video"
                >
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="16" fill="#00a99d" />
                    <polygon points="13,11 23,16 13,21" fill="#fff" />
                  </svg>
                </IconButton>
                <Typography variant="caption" color="textSecondary">Watch how this works</Typography>
              </Box>
            )}
          </Box>
        ))}
      </Box>
      <IconButton onClick={() => setCurrentIndex(prev => (prev - 1 + steps.length) % steps.length)}
        sx={{ position: 'absolute', left: -20, zIndex: 10 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
      </IconButton>
      <IconButton onClick={() => setCurrentIndex(prev => (prev + 1) % steps.length)}
        sx={{ position: 'absolute', right: -20, zIndex: 10 }}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
      </IconButton>
      {/* Video Modal */}
      <Modal open={videoOpenIndex !== null} onClose={() => setVideoOpenIndex(null)} closeAfterTransition>
        <Box sx={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: { xs: '90vw', sm: 520 },
          bgcolor: 'background.paper',
          boxShadow: 24,
          p: 2,
          outline: 'none',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <IconButton
            onClick={() => setVideoOpenIndex(null)}
            sx={{ alignSelf: 'flex-end', mb: 1 }}
            aria-label="Close Video"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M6 18L18 6" stroke="#344767" strokeWidth="2.5" />
            </svg>
          </IconButton>
          {videoOpenIndex !== null && steps[videoOpenIndex].videoId && (
            <YouTube
              videoId={steps[videoOpenIndex].videoId!}
              opts={{
                width: '480',
                height: '270',
                playerVars: { autoplay: 1 }
              }}
            />
          )}
        </Box>
      </Modal>
    </Box>
  );
};

// --- For Who Section ---
const ForWhoSection: React.FC = () => (
  <Box id="for-who" component="section" sx={{ py: { xs: 10, md: 12 } }}>
    <Container>
      <Box sx={{ textAlign: 'center', mb: 8 }}>
        <Typography variant="h2" component="h2">An Ecosystem For Every Pharmacy Role</Typography>
        <Typography color="text.primary" sx={{ mt: 2, maxWidth: '45rem', mx: 'auto' }}>
          Owners, managers, pharmacists, assistants, techs, interns, and students—ChemistTasker has tailored experiences, compliance, and billing for all.
        </Typography>
      </Box>
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: '1fr 1fr 1fr 1fr' },
        gap: 3,
      }}>
        <FeatureCard>
          <Typography variant="h4" sx={{ fontSize: '1.25rem' }}>Pharmacy Owners</Typography>
          <Typography color="text.primary" sx={{ mt: 1.5 }}>End-to-end shift management, compliance, and instant billing in one dashboard.</Typography>
        </FeatureCard>
        <FeatureCard>
          <Typography variant="h4" sx={{ fontSize: '1.25rem' }}>Pharmacists</Typography>
          <Typography color="text.primary" sx={{ mt: 1.5 }}>Verified onboarding, easy Award-level matching, instant invoice, and flexible work everywhere.</Typography>
        </FeatureCard>
        <FeatureCard>
          <Typography variant="h4" sx={{ fontSize: '1.25rem' }}>Assistants & Techs</Typography>
          <Typography color="text.primary" sx={{ mt: 1.5 }}>Auto-verification of credentials, digital references, and seamless casual/part-time roster management.</Typography>
        </FeatureCard>
        <FeatureCard>
          <Typography variant="h4" sx={{ fontSize: '1.25rem' }}>Students & Interns</Typography>
          <Typography color="text.primary" sx={{ mt: 1.5 }}>Direct placements, verified experience, digital badge tracking, and onboarding in minutes.</Typography>
        </FeatureCard>
      </Box>
    </Container>
  </Box>
);

// --- Final CTA Section ---
const FinalCTASection: React.FC = () => (
  <Box component="section" sx={{ py: { xs: 10, md: 16 }, bgcolor: 'background.paper' }}>
    <Container sx={{ textAlign: 'center' }}>
      <Box sx={{ maxWidth: '48rem', mx: 'auto' }}>
        <Typography variant="h2" component="h2" sx={{ fontSize: { xs: '2.25rem', md: '3rem' }, mb: 3 }}>
          Join the Future of Pharmacy Work.
        </Typography>
        <Typography color="text.primary" sx={{ mb: 4, maxWidth: '40rem', mx: 'auto' }}>
          Be the first to access ChemistTasker—one login, every service, every shift, every invoice. Sign up and see how easy pharmacy life can be.
        </Typography>
        <CtaButton href={PAGE_ROUTES.register} sx={{ px: 5, py: 2, fontSize: '1.25rem' }}>
          Sign Up for Early Access
        </CtaButton>
      </Box>
    </Container>
  </Box>
);

export default LandingPage;