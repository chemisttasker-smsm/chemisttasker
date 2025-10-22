import { Outlet } from "react-router-dom";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { PageContainer } from "@toolpad/core/PageContainer";

import CustomAppTitle from "./CustomAppTitle";
import { useAuth } from "../contexts/AuthContext";
import TopBarActions from "./TopBarActions";
import { ColorModeProvider } from "../theme/sleekTheme";
import DashboardShell from "./DashboardShell";
import DashboardSidebarFooter from "./DashboardSidebarFooter";

export default function PharmacistDashboardWrapper() {
  const { user } = useAuth();

  return (
    <ColorModeProvider>
      <DashboardShell>
        <DashboardLayout
          sidebarExpandedWidth={288}
          slots={{
            appTitle: () => <CustomAppTitle userRole={user?.role || "PHARMACIST"} />,
            toolbarActions: TopBarActions,
            sidebarFooter: DashboardSidebarFooter,
          }}
        >
          <PageContainer
            slots={{ header: () => null }}
            sx={{
              minHeight: "100%",
              display: "flex",
              flexDirection: "column",
              px: { xs: 2, md: 4 },
              py: { xs: 2, md: 4 },
              gap: { xs: 2, md: 3 },
            }}
          >
            <Outlet />
          </PageContainer>
        </DashboardLayout>
      </DashboardShell>
    </ColorModeProvider>
  );
}

// New version that usese sleekthem
// src/layouts/pharmacistDashboard.tsx
// import { Outlet } from 'react-router-dom';
// import { DashboardLayout, SidebarFooterProps } from '@toolpad/core/DashboardLayout';
// import { PageContainer } from '@toolpad/core/PageContainer';
// import Typography from '@mui/material/Typography';
// import Stack from '@mui/material/Stack';
// import Tooltip from '@mui/material/Tooltip';
// import IconButton from '@mui/material/IconButton';
// import Brightness4Icon from '@mui/icons-material/Brightness4';
// import Brightness7Icon from '@mui/icons-material/Brightness7';

// import CustomAppTitle from './CustomAppTitle';
// import { useAuth } from '../contexts/AuthContext';
// import { ColorModeProvider, useColorMode } from '../theme/sleekTheme';

// function SidebarFooter({ mini }: SidebarFooterProps) {
//   return (
//     <Typography variant="caption" sx={{ m: 1, whiteSpace: 'nowrap', overflow: 'hidden' }}>
//       {mini ? '© CT' : `© ${new Date().getFullYear()} ChemistTasker`}
//     </Typography>
//   );
// }

// // Appears in the AppBar’s right side
// function TopRightActions() {
//   const { mode, toggleColorMode } = useColorMode();
//   return (
//     <Stack direction="row" spacing={1} alignItems="center" sx={{ pr: 1 }}>
//       <Tooltip
//         title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
//       >
//         <IconButton onClick={toggleColorMode} color="inherit" size="small" aria-label="toggle color mode">
//           {mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
//         </IconButton>
//       </Tooltip>
//     </Stack>
//   );
// }

// export default function PharmacistDashboardWrapper() {
//   const { user } = useAuth();

//   return (
//     <ColorModeProvider>
//       <DashboardLayout
//         slots={{
//           appTitle: () => <CustomAppTitle userRole={user?.role || 'PHARMACIST'} />,
//           toolbarActions: TopRightActions,
//           sidebarFooter: SidebarFooter,
//         }}
//       >
//         <PageContainer slots={{ header: () => null }}>
//           <Outlet />
//         </PageContainer>
//       </DashboardLayout>
//     </ColorModeProvider>
//   );
// }
