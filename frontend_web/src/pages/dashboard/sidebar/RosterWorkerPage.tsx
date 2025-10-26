import { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Skeleton,
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  CircularProgress,
  SelectChangeEvent,
  ListItemText,
  List,
  ListItem,
  Tabs,
  Tab,
  Checkbox,
  OutlinedInput,
  Snackbar,
  Alert
} from '@mui/material';
// Calendar Imports
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { calendarViews, calendarMessages, getDateRangeForView, CalendarViewKey } from './calendarViews';
import apiClient from '../../../utils/apiClient';
import { API_ENDPOINTS } from '../../../constants/api';
import { useAuth } from '../../../contexts/AuthContext'; // Using the corrected path
import { ROSTER_COLORS } from '../../../constants/rosterColors';
const localizer = momentLocalizer(moment);
// --- Interfaces ---
interface Pharmacy {
  id: number;
  name: string;
}
interface UserDetail { id: number; first_name: string; last_name: string; email: string; }
interface SlotDetail { id: number; date: string; start_time: string; end_time: string; }
interface ShiftDetail { id: number; pharmacy_name: string; role_needed: string; visibility: string; }
interface LeaveRequest {
  id: number;
  leave_type: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  note: string;
}
interface WorkerSwapRequest {
  id: number;
  pharmacy: number;
  role: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  note: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_PUBLISHED';
}
interface Assignment {
  id: number | string;
  slot_date: string;
  user: number | null;
  slot?: number;
  shift?: number;
  user_detail: UserDetail;
  slot_detail: SlotDetail;
  shift_detail: ShiftDetail;
  leave_request: LeaveRequest | null;
  isSwapRequest?: boolean;  // added for frontend-only marking
  status?: "PENDING" | "APPROVED" | "REJECTED" | "AUTO_PUBLISHED"; // added for cover/swaps
  isOpenShift?: boolean; // NEW: added for owner-created open shifts
  originalShiftId?: number; // NEW: To store the original ID of an open shift
  swap_request?: WorkerSwapRequest;
}
// NEW: Interface for an open shift (unassigned, community-visible)
interface OpenShift {
  id: number;
  role_needed: string;
  slots: SlotDetail[];
  description: string;
}
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}
// --- Constants ---
const ROLES = ['PHARMACIST', 'ASSISTANT', 'INTERN', 'TECHNICIAN'];
const ALL_STAFF = 'ALL';
const LEAVE_TYPES = [
    { value: 'SICK', label: 'Sick Leave' },
    { value: 'ANNUAL', label: 'Annual Leave' },
    { value: 'COMPASSIONATE', label: 'Compassionate Leave' },
    { value: 'STUDY', label: 'Study Leave' },
    { value: 'CARER', label: 'Carer\'s Leave' },
    { value: 'UNPAID', label: 'Unpaid Leave' },
    { value: 'OTHER', label: 'Other' },
];
// --- Skeleton Component for Unified Loading ---
const RosterPageSkeleton = () => (
    <Container sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom><Skeleton width="30%" /></Typography>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 3 }} />
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
            <Typography variant="h5"><Skeleton width="200px" /></Typography>
            <Skeleton variant="rectangular" width={300} height={56} />
        </Box>
        <Typography variant="body2"><Skeleton width="80%" /></Typography>
        <Skeleton variant="rectangular" height={600} sx={{ mt: 2 }} />
    </Container>
);
// --- Main Component ---
export default function RosterWorkerPage() {
  const { user } = useAuth();
  const currentUserId = user?.id;
  // --- Component State ---
  const [allAssignments, setAllAssignments] = useState<Assignment[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacyId, setSelectedPharmacyId] = useState<number | null>(null);
  
  // --- Loading States ---
  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isAssignmentsLoading, setIsAssignmentsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // --- Calendar State ---
  const [calendarView, setCalendarView] = useState<CalendarViewKey>('week'); // Align with shared calendar configuration
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  
  // --- Dialogs and Forms State ---
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [leaveType, setLeaveType] = useState('');
  const [leaveNote, setLeaveNote] = useState('');
  
  // Action & Swap/Cover dialog state
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isSwapDialogOpen, setIsSwapDialogOpen] = useState(false);
  const [isClaimShiftDialogOpen, setIsClaimShiftDialogOpen] = useState(false); // NEW: Dialog for claiming open shifts
  const [isEditingLeaveRequest, setIsEditingLeaveRequest] = useState(false);
  const [isEditingSwapRequest, setIsEditingSwapRequest] = useState(false);
  // Empty-slot (or generic) selection payload
  const [selectedSlotDate, setSelectedSlotDate] = useState<Date | null>(null);
  const [selectedStart, setSelectedStart] = useState<Date | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<Date | null>(null);
  // Swap/Cover form fields
  const [swapNote, setSwapNote] = useState('');
  // --- Filter State ---
  const [roleFilters, setRoleFilters] = useState<string[]>([ALL_STAFF]);
  // Snackbar Notifications
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  // --- DATA LOADING ---
  useEffect(() => {
    const loadInitialData = async () => {
      if (!currentUserId) return;
      setIsPageLoading(true);
      try {
    setIsPageLoading(true);
  const pharmacyRes = await apiClient.get<Pharmacy[]>(`${API_ENDPOINTS.getRosterWorker}pharmacies/`);
  const loadedPharmacies = pharmacyRes.data || [];
  setPharmacies(loadedPharmacies);
  
  if (loadedPharmacies.length > 0) {
    setSelectedPharmacyId(loadedPharmacies[0].id);
  }
      } catch (err: any) { 
        console.error("Failed to load initial page data", err); 
      } finally {
        setIsPageLoading(false);
      }
    };
    
    loadInitialData();
  }, [currentUserId, calendarDate, calendarView]);
  useEffect(() => {
    if (!isPageLoading && selectedPharmacyId) {
      reloadAssignments();
    }
  }, [selectedPharmacyId, calendarDate, calendarView]);
const reloadAssignments = async () => {
  if (!selectedPharmacyId) return;
  const shouldShowSkeleton = isPageLoading;
  if (!shouldShowSkeleton) {
    setIsAssignmentsLoading(true);
  }
  const { start, end } = getDateRangeForView(calendarDate, calendarView);
  const startDate = start.format("YYYY-MM-DD");
  const endDate = end.format("YYYY-MM-DD");
  try {
    // -------------------------------
    // 1️⃣ Load regular roster assignments (existing)
    // -------------------------------
    const res = await apiClient.get<PaginatedResponse<Assignment>>(
      `${API_ENDPOINTS.getRosterWorker}?pharmacy=${selectedPharmacyId}&start_date=${startDate}&end_date=${endDate}`
    );
    const assignments = res.data.results || [];
    // NEW: Fetch owner-created open shifts
    const openShiftsRes = await apiClient.get<PaginatedResponse<OpenShift>>(`${API_ENDPOINTS.getCommunityShifts}?pharmacy=${selectedPharmacyId}&start_date=${startDate}&end_date=${endDate}&unassigned=true`);
    const openShifts = Array.isArray(openShiftsRes.data) ? openShiftsRes.data : openShiftsRes.data?.results ?? [];
    // -------------------------------
    // 2️⃣ Load swap/cover requests (new)
    // -------------------------------
    const swapRes = await apiClient.get<PaginatedResponse<WorkerSwapRequest>>(
      `${API_ENDPOINTS.workerShiftRequests}?pharmacy=${selectedPharmacyId}&start_date=${startDate}&end_date=${endDate}`
    );
    const swapRequests = swapRes.data.results || [];
    // -------------------------------
    // 3️⃣ Map owner-created open shifts into calendar events
    // -------------------------------
    const mappedOpenShifts = openShifts.flatMap((shift: OpenShift) => 
      shift.slots.map(slot => ({
        id: `open-${shift.id}-${slot.id}`,
        slot_date: slot.date,
        user: null, // No assigned user
        slot: slot.id,
        shift: shift.id,
        user_detail: { id: 0, first_name: 'Open', last_name: 'Shift', email: '' },
        slot_detail: {
          id: slot.id,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
        },
        shift_detail: {
          id: shift.id,
          pharmacy_name: pharmacies.find((p) => p.id === selectedPharmacyId)?.name || 'Unknown Pharmacy',
          role_needed: shift.role_needed,
          visibility: 'LOCUM_CASUAL',
        },
        leave_request: null,
        isSwapRequest: false,
        isOpenShift: true, // Custom marker
        originalShiftId: shift.id, // Store original ID for claiming
        swap_request: undefined,
        status: undefined,
      }))
    );
    // -------------------------------
    // 3️⃣ Merge both into one list
    // -------------------------------
    const mappedSwapRequests: Assignment[] = swapRequests.map(req => {
      const requesterName = (req as any)?.requester_name || `${(user as any)?.first_name || ''} ${(user as any)?.last_name || ''}`.trim();
      const [firstName, ...restName] = requesterName.split(' ');
      const derivedFirstName = firstName || (user as any)?.first_name || '';
      const derivedLastName = restName.join(' ') || (user as any)?.last_name || '';
      const pharmacyName =
        pharmacies.find((p) => p.id === req.pharmacy)?.name ||
        pharmacies.find((p) => p.id === selectedPharmacyId)?.name ||
        'Unknown Pharmacy';
      return {
        id: `swap-${req.id}`,
        slot_date: req.slot_date,
        user: currentUserId ?? null,
        slot: undefined,
        shift: undefined,
        user_detail: {
          id: currentUserId ?? 0,
          first_name: derivedFirstName,
          last_name: derivedLastName,
          email: user?.email || '',
        },
        slot_detail: {
          id: req.id,
          date: req.slot_date,
          start_time: req.start_time,
          end_time: req.end_time,
        },
        shift_detail: {
          id: req.id,
          pharmacy_name: pharmacyName,
          role_needed: req.role,
          visibility: 'PRIVATE',
        },
        leave_request: null,
        status: req.status,
        isSwapRequest: true, // custom marker for style
        isOpenShift: false,
        originalShiftId: undefined,
        swap_request: req,
      };
    });
    const normalizedAssignments: Assignment[] = assignments.map(a => ({
      ...a,
      isSwapRequest: false,
      isOpenShift: false,
      swap_request: undefined,
    }));
    // -------------------------------
    // 4️⃣ Update state
    // -------------------------------
    setAllAssignments([
      ...normalizedAssignments,
      ...mappedSwapRequests,
      ...mappedOpenShifts,
    ]);
  } catch (err: any) {
    console.error("Failed to load roster assignments or cover requests", err);
  } finally {
    if (!shouldShowSkeleton) {
      setIsAssignmentsLoading(false);
    }
    if (shouldShowSkeleton) {
      setIsPageLoading(false);
    }
  }
};
  // NEW: Handle claiming an open shift
  const handleClaimShift = async () => {
    if (!selectedAssignment || !selectedAssignment.isOpenShift || !selectedAssignment.originalShiftId) return;
    setIsSubmitting(true);
    try {
    setIsPageLoading(true);
      await apiClient.post(API_ENDPOINTS.claimShift(selectedAssignment.originalShiftId), {
        slot_id: selectedAssignment.slot_detail.id,
      });
      setSnackbar({ open: true, message: "Shift claimed successfully!", severity: "success" });
      setIsClaimShiftDialogOpen(false);
      reloadAssignments();
    } catch (err: any) {
      setSnackbar({ open: true, message: `Failed to claim shift: ${err.response?.data?.detail || err.message}`, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  // --- UI HANDLERS ---
  const handleSelectEvent = (event: { resource: Assignment }) => {
    const assignment = event.resource;
    const isMyShift = assignment.user === currentUserId;
    // Store the clicked assignment
    setSelectedAssignment(assignment);
    // Capture date/time for either Leave or Swap/Cover flows
    const start = moment(`${assignment.slot_date} ${assignment.slot_detail.start_time}`).toDate();
    const end   = moment(`${assignment.slot_date} ${assignment.slot_detail.end_time}`).toDate();
    setSelectedSlotDate(moment(assignment.slot_date).toDate());
    setSelectedStart(start);
    setSelectedEnd(end);
    if (assignment.isOpenShift) {
      setIsClaimShiftDialogOpen(true); // Open dialog to claim open shift
      setIsEditingLeaveRequest(false);
      setIsEditingSwapRequest(false);
      return;
    }
    setIsActionDialogOpen(false);
    if (assignment.isSwapRequest && assignment.swap_request) {
      setIsEditingSwapRequest(true);
      setSwapNote(assignment.swap_request.note || '');
      setIsSwapDialogOpen(true);
      return;
    }
    if (assignment.leave_request) {
      setIsEditingLeaveRequest(true);
      setLeaveType(assignment.leave_request.leave_type || '');
      setLeaveNote(assignment.leave_request.note || '');
      setIsLeaveDialogOpen(true);
      return;
    }
    if (!isMyShift) {
      setSnackbar({ open: true, message: 'You can only manage your own assigned shifts.', severity: 'info' });
      return;
    }
    setIsEditingLeaveRequest(false);
    setIsEditingSwapRequest(false);
    setLeaveType('');
    setLeaveNote('');
    setSwapNote('');
    setIsActionDialogOpen(true);
  };
const handleSubmitLeaveRequest = async () => {
  if (!selectedAssignment) {
    setSnackbar({ open: true, message: "Please select a shift.", severity: "warning" });
    return;
  }
  if (!leaveType) {
    setSnackbar({ open: true, message: "Please select a leave type.", severity: "warning" });
    return;
  }
  if (selectedAssignment.user !== currentUserId) {
    setSnackbar({ open: true, message: "You can only manage leave for your own assigned shifts.", severity: "warning" });
    return;
  }
  const existingLeave = selectedAssignment.leave_request;
  const isUpdate = isEditingLeaveRequest && !!existingLeave;
  if (isUpdate && existingLeave?.status !== 'PENDING') {
    setSnackbar({ open: true, message: "Only pending leave requests can be updated.", severity: "warning" });
    return;
  }
  setIsSubmitting(true);
  try {
    setIsPageLoading(true);
    if (isUpdate && existingLeave?.id) {
      await apiClient.patch(`${API_ENDPOINTS.leaveRequests}${existingLeave.id}/`, {
        leave_type: leaveType,
        note: leaveNote,
      });
      setSnackbar({ open: true, message: "Leave request updated successfully.", severity: "success" });
    } else {
      await apiClient.post(API_ENDPOINTS.createLeaveRequest, {
        slot_assignment: selectedAssignment.id,
        leave_type: leaveType,
        note: leaveNote,
      });
      setSnackbar({ open: true, message: "Leave request submitted successfully.", severity: "success" });
    }
    setIsLeaveDialogOpen(false);
    setIsEditingLeaveRequest(false);
    setSelectedAssignment(null);
    reloadAssignments();
  } catch (err: any) {
    const message = (err as any)?.response?.data?.detail || (err as Error).message;
    setSnackbar({ open: true, message: `Failed to save leave request: ${message}`, severity: "error" });
  } finally {
    setIsSubmitting(false);
  }
};
  const handleCancelLeaveRequest = async () => {
    const existingLeave = selectedAssignment?.leave_request;
    if (!existingLeave?.id) {
      return;
    }
    if (existingLeave.status !== 'PENDING') {
      setSnackbar({ open: true, message: "Only pending leave requests can be cancelled.", severity: "warning" });
      return;
    }
    setIsSubmitting(true);
    try {
    setIsPageLoading(true);
      await apiClient.delete(`${API_ENDPOINTS.leaveRequests}${existingLeave.id}/`);
      setSnackbar({ open: true, message: "Leave request cancelled.", severity: "success" });
      setIsLeaveDialogOpen(false);
      setIsEditingLeaveRequest(false);
      setSelectedAssignment(null);
      reloadAssignments();
    } catch (err: any) {
      const message = (err as any)?.response?.data?.detail || (err as Error).message;
      setSnackbar({ open: true, message: `Failed to cancel leave request: ${message}`, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleSubmitSwapRequest = async () => {
    if (!selectedPharmacyId || !selectedSlotDate || !selectedStart || !selectedEnd) {
      setSnackbar({ open: true, message: "Missing date or time information for this request.", severity: "warning" });
      return;
    }
    if (
      selectedAssignment?.user &&
      selectedAssignment.user !== currentUserId &&
      !selectedAssignment.isSwapRequest
    ) {
      setSnackbar({ open: true, message: "You can only request cover for your own assigned shifts.", severity: "warning" });
      return;
    }
    const existingSwap = selectedAssignment?.swap_request;
    const isUpdate = isEditingSwapRequest && !!existingSwap;
    if (isUpdate && existingSwap?.status !== 'PENDING') {
      setSnackbar({ open: true, message: "Only pending cover requests can be updated.", severity: "warning" });
      return;
    }
    const slotDate = moment(selectedSlotDate).format('YYYY-MM-DD');
    const startTime = moment(selectedStart).format('HH:mm:ss');
    const endTime = moment(selectedEnd).format('HH:mm:ss');
    const roleNeeded =
      selectedAssignment?.shift_detail?.role_needed ||
      existingSwap?.role ||
      (user as any)?.role ||
      'PHARMACIST';
    if (!roleNeeded) {
      setSnackbar({ open: true, message: "Unable to determine role for this cover request.", severity: "warning" });
      return;
    }
    const targetPharmacy = existingSwap?.pharmacy || selectedPharmacyId;
    setIsSubmitting(true);
    try {
    setIsPageLoading(true);
      const payload = {
        pharmacy: targetPharmacy,
        role: roleNeeded,
        slot_date: slotDate,
        start_time: startTime,
        end_time: endTime,
        note: swapNote,
      };
      if (isUpdate && existingSwap?.id) {
        await apiClient.patch(`${API_ENDPOINTS.workerShiftRequests}${existingSwap.id}/`, payload);
        setSnackbar({ open: true, message: "Cover request updated successfully.", severity: "success" });
      } else {
        await apiClient.post(API_ENDPOINTS.workerShiftRequests, payload);
        setSnackbar({ open: true, message: "Cover request submitted successfully.", severity: "success" });
      }
      setIsSwapDialogOpen(false);
      setIsEditingSwapRequest(false);
      setSwapNote('');
      setSelectedAssignment(null);
      reloadAssignments();
    } catch (err: any) {
      const message = (err as any)?.response?.data?.detail || (err as Error).message;
      setSnackbar({ open: true, message: `Failed to save cover request: ${message}`, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleCancelSwapRequest = async () => {
    const existingSwap = selectedAssignment?.swap_request;
    if (!existingSwap?.id) {
      return;
    }
    if (existingSwap.status !== 'PENDING') {
      setSnackbar({ open: true, message: "Only pending cover requests can be cancelled.", severity: "warning" });
      return;
    }
    setIsSubmitting(true);
    try {
    setIsPageLoading(true);
      await apiClient.delete(`${API_ENDPOINTS.workerShiftRequests}${existingSwap.id}/`);
      setSnackbar({ open: true, message: "Cover request cancelled.", severity: "success" });
      setIsSwapDialogOpen(false);
      setIsEditingSwapRequest(false);
      setSwapNote('');
      setSelectedAssignment(null);
      reloadAssignments();
    } catch (err: any) {
      const message = (err as any)?.response?.data?.detail || (err as Error).message;
      setSnackbar({ open: true, message: `Failed to cancel cover request: ${message}`, severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleRoleFilterChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value as string[];
    // FIX: Logic now exactly matches RosterOwnerPage
    if (value[value.length - 1] === ALL_STAFF || value.length === 0) {
        setRoleFilters([ALL_STAFF]);
    } else {
        setRoleFilters(value.filter(v => v !== ALL_STAFF));
    }
  };
  
  // --- MEMOIZED CALENDAR EVENTS ---
  const calendarEvents = useMemo(() => {
    // This now filters based on the `allAssignments` fetched for the selected pharmacy
    return allAssignments
      .filter(a => {
        // FIX: Filtering logic now exactly matches RosterOwnerPage
        if (roleFilters.includes(ALL_STAFF)) {
            return true;
        }
        return roleFilters.includes(a.shift_detail.role_needed);
      })
      .map(a => {
        let title: string;
        if (a.isOpenShift) {
          title = `Open Shift: ${a.shift_detail.role_needed}`;
        } else if (a.isSwapRequest) {
          const statusLabel = a.status ? ` (${a.status})` : '';
          title = `Cover Request${statusLabel}`;
        } else {
          title = `${a.user_detail.first_name} ${a.user_detail.last_name}`;
          if (a.leave_request) {
            title = `${title} (Leave: ${a.leave_request.status})`;
          }
        }
        return {
            id: a.id,
            title,
            start: moment(`${a.slot_date} ${a.slot_detail.start_time}`).toDate(),
            end: moment(`${a.slot_date} ${a.slot_detail.end_time}`).toDate(),
            allDay: false,
            resource: a
        };
    });
  }, [allAssignments, roleFilters]);
  // --- DYNAMIC EVENT STYLING ---
  const eventStyleGetter = (event: { resource: Assignment }) => {
    const assignment = event.resource;
    const isMyShift = assignment.user === currentUserId;
    let backgroundColor = ROSTER_COLORS[assignment.shift_detail.role_needed as keyof typeof ROSTER_COLORS] || ROSTER_COLORS.DEFAULT;
    let borderStyle = '0px';
    if (assignment.isOpenShift) {
      backgroundColor = ROSTER_COLORS.OPEN_SHIFT;
      borderStyle = '1px dashed #fff';
    } else if (assignment.isSwapRequest) {
      if (assignment.status === 'PENDING') {
        backgroundColor = ROSTER_COLORS.SWAP_PENDING;
      } else if (assignment.status === 'APPROVED' || assignment.status === 'AUTO_PUBLISHED') {
        backgroundColor = ROSTER_COLORS.SWAP_APPROVED;
        borderStyle = '1px dashed #fff';
      }
    }
    if (assignment.leave_request) {
        if(assignment.leave_request.status === 'PENDING') {
            backgroundColor = ROSTER_COLORS.LEAVE_PENDING;
        } else if (assignment.leave_request.status === 'APPROVED') {
            backgroundColor = ROSTER_COLORS.LEAVE_APPROVED;
        }
    }
    
    const style = {
        backgroundColor,
        borderRadius: '5px',
        opacity: assignment.isOpenShift ? 0.9 : (isMyShift ? 0.8 : 0.5),
        color: 'white', // Ensure text is white for better contrast on colored backgrounds
        border: borderStyle,
        display: 'block',
        cursor: (isMyShift || assignment.isOpenShift) ? 'pointer' : 'not-allowed', // Allow clicking open shifts
    };
    return { style };
  };
  const leaveRequestStatus = selectedAssignment?.leave_request?.status;
  const canModifyLeaveRequest = leaveRequestStatus === 'PENDING';
  const swapRequestStatus = selectedAssignment?.swap_request?.status;
  const canModifySwapRequest = swapRequestStatus === 'PENDING';
  // --- RENDER LOGIC ---
  if (isPageLoading) {
    return <RosterPageSkeleton />;
  }
  return (
    <Container sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>My Roster</Typography>
      <Tabs value={selectedPharmacyId} onChange={(_, val) => setSelectedPharmacyId(val as number)} sx={{ mb: 3 }} textColor="primary" indicatorColor="primary">
        {pharmacies.map(p => <Tab key={p.id} label={p.name} value={p.id} />)}
      </Tabs>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2}}>
          <Typography variant="h5">Roster Calendar</Typography>
          <FormControl sx={{ m: 1, width: 300 }}>
              <InputLabel>Filter by Role</InputLabel>
              <Select
                  multiple
                  value={roleFilters}
                  onChange={handleRoleFilterChange}
                  input={<OutlinedInput label="Filter by Role" />}
                  renderValue={(selected) => (selected.includes(ALL_STAFF) ? 'All Staff' : selected.map(s => s.charAt(0) + s.slice(1).toLowerCase()).join(', '))}
              >
                  <MenuItem value={ALL_STAFF}>
                      <Checkbox checked={roleFilters.includes(ALL_STAFF)} />
                      <ListItemText primary="All Staff" />
                  </MenuItem>
                  {ROLES.map((role) => (
                      <MenuItem key={role} value={role}>
                          <Checkbox checked={roleFilters.includes(role)} />
                          <ListItemText primary={role.charAt(0) + role.slice(1).toLowerCase()} />
                      </MenuItem>
                  ))}
              </Select>
          </FormControl>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>This calendar shows all shifts at the selected pharmacy. You can interact with your own shifts to request leave or cover, and claim open shifts.</Typography>
      <Box sx={{ position: 'relative', '.rbc-calendar': { height: 'auto', minHeight: '800px' } }}>
        {isAssignmentsLoading && (
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255, 255, 255, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10 }}>
                <CircularProgress />
            </Box>
        )}
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          defaultView={calendarView as any}
          view={calendarView as any}
          date={calendarDate}
          onNavigate={setCalendarDate}
          onView={(nextView: string) => setCalendarView(nextView as CalendarViewKey)}
          selectable
          onSelectEvent={handleSelectEvent}
          onSelectSlot={({ start, end }: { start: Date; end: Date }) => {
            setSelectedAssignment(null);
            setSelectedSlotDate(start);
            setSelectedStart(start);
            setSelectedEnd(end);
            setIsEditingLeaveRequest(false);
            setIsEditingSwapRequest(false);
            setLeaveType('');
            setLeaveNote('');
            setSwapNote('');
            setIsActionDialogOpen(true);
          }}
          eventPropGetter={eventStyleGetter}
          views={calendarViews}
          messages={calendarMessages}
          components={{
            event: ({ event }: any) => {
              const assignment = event.resource as Assignment;
              let statusLabel = "";
              if (assignment.isOpenShift) statusLabel = "Click to Claim";
              else if (assignment.isSwapRequest && assignment.status === "PENDING") statusLabel = "Pending Cover Request";
              else if (assignment.isSwapRequest && (assignment.status === "APPROVED" || assignment.status === "AUTO_PUBLISHED")) statusLabel = "Cover Approved";
              else if (assignment.isSwapRequest && assignment.status === "REJECTED") statusLabel = "Cover Rejected";
              return (
                <Box sx={{ px: 0.5, py: 0.3 }}>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 600, color: "white", lineHeight: 1 }}
                  >
                    {event.title}
                  </Typography>
                  {statusLabel && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        color: "#fff",
                        fontWeight: 500,
                        fontSize: "0.7rem",
                        mt: 0.3,
                      }}
                    >
                      {statusLabel}
                    </Typography>
                  )}
                </Box>
              );
            },
          }}
        />
      </Box>
      {/* NEW: Action Choice Dialog */}
      <Dialog open={isActionDialogOpen} onClose={() => setIsActionDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Select Action</DialogTitle>
        <DialogContent dividers>
          <List dense>
            <ListItem><ListItemText primary="Pharmacy" secondary={pharmacies.find(p => p.id === selectedPharmacyId)?.name || '—'} /></ListItem>
            {selectedSlotDate && (
              <ListItem><ListItemText primary="Date" secondary={moment(selectedSlotDate).format('dddd, MMMM Do YYYY')} /></ListItem>
            )}
            {selectedStart && selectedEnd && (
              <ListItem><ListItemText primary="Time" secondary={`${moment(selectedStart).format("h:mm A")} - ${moment(selectedEnd).format("h:mm A")}`} /></ListItem>
            )}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              if (!selectedAssignment || selectedAssignment.user !== currentUserId) {
                setSnackbar({ open: true, message: "You can only request leave for your own assigned slots.", severity: "warning" });
                return;
              }
              setIsActionDialogOpen(false);
              setIsEditingLeaveRequest(false);
              setLeaveType('');
              setLeaveNote('');
              setIsLeaveDialogOpen(true);
            }}
            variant="outlined"
          >
            Request Leave
          </Button>
          <Button
            onClick={() => {
              setIsActionDialogOpen(false);
              setIsEditingSwapRequest(false);
              setSwapNote('');
              setIsSwapDialogOpen(true);
            }}
            variant="contained"
          >
            Request Swap / Cover
          </Button>
        </DialogActions>
      </Dialog>
      {/* NEW: Claim Shift Dialog */}
      <Dialog open={isClaimShiftDialogOpen} onClose={() => setIsClaimShiftDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Claim Open Shift</DialogTitle>
        <DialogContent dividers>
          <List dense>
            <ListItem><ListItemText primary="Pharmacy" secondary={pharmacies.find(p => p.id === selectedPharmacyId)?.name || '—'} /></ListItem>
            {selectedSlotDate && (
              <ListItem><ListItemText primary="Date" secondary={moment(selectedSlotDate).format('dddd, MMMM Do YYYY')} /></ListItem>
            )}
            {selectedStart && selectedEnd && (
              <ListItem><ListItemText primary="Time" secondary={`${moment(selectedStart).format("h:mm A")} - ${moment(selectedEnd).format("h:mm A")}`} /></ListItem>
            )}
            <ListItem><ListItemText primary="Role" secondary={selectedAssignment?.shift_detail.role_needed || '—'} /></ListItem>
          </List>
          <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>By claiming this shift, you will be assigned to it directly.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsClaimShiftDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleClaimShift} variant="contained" color="primary" disabled={isSubmitting}>
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Claim Shift'}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Leave Request Dialog */}
      <Dialog
        open={isLeaveDialogOpen}
        onClose={() => {
          if (isSubmitting) return;
          setIsLeaveDialogOpen(false);
          setIsEditingLeaveRequest(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{isEditingLeaveRequest ? "Manage Leave Request" : "Request Leave"}</DialogTitle>
        <DialogContent dividers>
          {selectedAssignment ? (
            <>
                <List dense>
                    <ListItem><ListItemText primary="Pharmacy" secondary={selectedAssignment.shift_detail.pharmacy_name} /></ListItem>
                    <ListItem><ListItemText primary="Date" secondary={moment(selectedAssignment.slot_date).format('dddd, MMMM Do YYYY')} /></ListItem>
                    <ListItem><ListItemText primary="Time" secondary={`${moment(selectedAssignment.slot_detail.start_time, "HH:mm:ss").format("h:mm A")} - ${moment(selectedAssignment.slot_detail.end_time, "HH:mm:ss").format("h:mm A")}`} /></ListItem>
                </List>
                {selectedAssignment.leave_request && (
                    <Typography variant="h6" color="primary" sx={{ my: 2, p: 1, borderRadius: 1, bgcolor: 'primary.lighter' }}>
                        Existing Request Status: {selectedAssignment.leave_request.status}
                    </Typography>
                )}
                <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
                    <FormControl fullWidth required disabled={isEditingLeaveRequest && !canModifyLeaveRequest}>
                        <InputLabel>Leave Type</InputLabel>
                        <Select value={leaveType} onChange={(e: SelectChangeEvent) => setLeaveType(e.target.value)} label="Leave Type">
                            {LEAVE_TYPES.map(lt => (
                                <MenuItem key={lt.value} value={lt.value}>{lt.label}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Note (Optional)"
                        multiline
                        rows={3}
                        value={leaveNote}
                        onChange={(e) => setLeaveNote(e.target.value)}
                        fullWidth
                        disabled={isEditingLeaveRequest && !canModifyLeaveRequest}
                    />
                </Box>
            </>
          ) : <Skeleton variant="rectangular" height={200}/>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setIsLeaveDialogOpen(false); setIsEditingLeaveRequest(false); }} disabled={isSubmitting}>Close</Button>
          {isEditingLeaveRequest && (
            <Button color="error" onClick={handleCancelLeaveRequest} disabled={isSubmitting || !canModifyLeaveRequest}>
              Cancel Request
            </Button>
          )}
          <Button
            onClick={handleSubmitLeaveRequest}
            variant="contained"
            color="primary"
            disabled={isSubmitting || (isEditingLeaveRequest && !canModifyLeaveRequest)}
          >
            {isSubmitting ? <CircularProgress size={24} color="inherit" /> : (isEditingLeaveRequest ? 'Save Changes' : 'Submit Request')}
          </Button>
        </DialogActions>
      </Dialog>
{/* NEW: Swap / Cover Request Dialog */}
<Dialog
  open={isSwapDialogOpen}
  onClose={() => {
    if (isSubmitting) return;
    setIsSwapDialogOpen(false);
    setIsEditingSwapRequest(false);
  }}
  fullWidth
  maxWidth="sm"
>
  <DialogTitle>{isEditingSwapRequest ? "Manage Swap / Cover Request" : "Request Swap / Cover"}</DialogTitle>
  <DialogContent dividers>
    <List dense>
      <ListItem><ListItemText primary="Pharmacy" secondary={pharmacies.find(p => p.id === selectedPharmacyId)?.name || 'Unknown'} /></ListItem>
      {selectedSlotDate && (
        <ListItem><ListItemText primary="Date" secondary={moment(selectedSlotDate).format('dddd, MMMM Do YYYY')} /></ListItem>
      )}
      {selectedStart && selectedEnd && (
        <ListItem><ListItemText primary="Time" secondary={`${moment(selectedStart).format("h:mm A")} - ${moment(selectedEnd).format("h:mm A")}`} /></ListItem>
      )}
    </List>
    {isEditingSwapRequest && selectedAssignment?.swap_request && (
      <Typography variant="h6" color="primary" sx={{ my: 2, p: 1, borderRadius: 1, bgcolor: 'primary.lighter' }}>
        Existing Request Status: {selectedAssignment.swap_request.status}
      </Typography>
    )}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
      <TextField
        label="Note (optional)"
        multiline
        rows={3}
        value={swapNote}
        onChange={(e) => setSwapNote(e.target.value)}
        fullWidth
        disabled={isEditingSwapRequest && !canModifySwapRequest}
      />
    </Box>
  </DialogContent>
  <DialogActions>
    <Button onClick={() => { setIsSwapDialogOpen(false); setIsEditingSwapRequest(false); }} disabled={isSubmitting}>Close</Button>
    {isEditingSwapRequest && (
      <Button
        color="error"
        onClick={handleCancelSwapRequest}
        disabled={isSubmitting || !canModifySwapRequest}
      >
        Cancel Request
      </Button>
    )}
    <Button
      variant="contained"
      onClick={handleSubmitSwapRequest}
      disabled={isSubmitting || (isEditingSwapRequest && !canModifySwapRequest)}
    >
      {isSubmitting ? <CircularProgress size={24} /> : (isEditingSwapRequest ? 'Save Changes' : 'Submit Request')}
    </Button>
  </DialogActions>
</Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity as "success" | "error" | "info" | "warning"}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
