/**
 * TatvaOps Vision - Room Selection Modal
 * 
 * For "Room-wise Themes" flow.
 * User selects which rooms they want to create moodboards for.
 * Rooms not selected are skipped in the current flow.
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Chip,
  Alert,
  alpha,
} from '@mui/material';
import {
  MeetingRoom,
  ArrowForward,
  Info,
} from '@mui/icons-material';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  selectRoomGenerationStates,
  setSelectedRooms,
} from '@/store/slices/intentSlice';

interface Room {
  id: string;
  name: string;
  type: string;
}

interface RoomSelectionModalProps {
  open: boolean;
  onClose: () => void;
  rooms: Room[];
  onProceed: (selectedRoomIds: string[]) => void;
}

// Room type to display label mapping
const ROOM_TYPE_LABELS: Record<string, string> = {
  LIVING_ROOM: 'Living Room',
  BEDROOM: 'Bedroom',
  KITCHEN: 'Kitchen',
  BATHROOM: 'Bathroom',
  TOILET: 'Toilet',
  DINING: 'Dining',
  BALCONY: 'Balcony',
  UTILITY: 'Utility',
  STORE: 'Storage',
  STUDY: 'Study/Office',
  PUJA: 'Puja Room',
  PASSAGE: 'Passage',
  STAIRCASE: 'Staircase',
  LOBBY: 'Lobby',
  FOYER: 'Foyer',
  GARAGE: 'Garage',
  UNCLASSIFIED: 'Other',
};

export function RoomSelectionModal({
  open,
  onClose,
  rooms,
  onProceed,
}: RoomSelectionModalProps) {
  const dispatch = useAppDispatch();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pre-select all rooms by default
  useEffect(() => {
    if (open && rooms.length > 0 && selectedIds.length === 0) {
      setSelectedIds(rooms.map(r => r.id));
    }
  }, [open, rooms]);

  const handleToggle = (roomId: string) => {
    setSelectedIds(prev => {
      if (prev.includes(roomId)) {
        return prev.filter(id => id !== roomId);
      }
      return [...prev, roomId];
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === rooms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rooms.map(r => r.id));
    }
  };

  const handleProceed = () => {
    if (selectedIds.length > 0) {
      dispatch(setSelectedRooms(selectedIds));
      onProceed(selectedIds);
    }
  };

  const getRoomTypeLabel = (type: string) => {
    return ROOM_TYPE_LABELS[type] || type.replace(/_/g, ' ');
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight={600}>
          Select Rooms for Design
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Choose which rooms you want to create moodboards for
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        {/* Info Alert */}
        <Alert 
          severity="info" 
          icon={<Info />}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2">
            You'll define design preferences for each selected room individually.
            Unselected rooms can be designed later.
          </Typography>
        </Alert>

        {/* Select All */}
        <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle2" color="text.secondary">
            {selectedIds.length} of {rooms.length} rooms selected
          </Typography>
          <Button
            size="small"
            onClick={handleSelectAll}
            sx={{ textTransform: 'none' }}
          >
            {selectedIds.length === rooms.length ? 'Deselect All' : 'Select All'}
          </Button>
        </Box>

        {/* Room List */}
        <List sx={{ py: 0 }}>
          {rooms.map((room) => {
            const isSelected = selectedIds.includes(room.id);
            
            return (
              <ListItem
                key={room.id}
                disablePadding
                sx={{ mb: 1 }}
              >
                <ListItemButton
                  onClick={() => handleToggle(room.id)}
                  selected={isSelected}
                  sx={{
                    borderRadius: 2,
                    border: 1,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    backgroundColor: isSelected ? alpha('#5C6BC0', 0.04) : 'transparent',
                    '&:hover': {
                      backgroundColor: isSelected ? alpha('#5C6BC0', 0.08) : alpha('#37474F', 0.04),
                    },
                    '&.Mui-selected': {
                      backgroundColor: alpha('#5C6BC0', 0.04),
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <Checkbox
                      edge="start"
                      checked={isSelected}
                      tabIndex={-1}
                      disableRipple
                    />
                  </ListItemIcon>
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    <MeetingRoom sx={{ color: isSelected ? 'primary.main' : 'text.secondary' }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body1" fontWeight={500}>
                        {room.name}
                      </Typography>
                    }
                    secondary={getRoomTypeLabel(room.type)}
                  />
                  <Chip
                    label={getRoomTypeLabel(room.type)}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1 }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        {rooms.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No rooms available. Please complete floor plan analysis first.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleProceed}
          disabled={selectedIds.length === 0}
          endIcon={<ArrowForward />}
          sx={{ textTransform: 'none', px: 3 }}
        >
          Proceed ({selectedIds.length} room{selectedIds.length !== 1 ? 's' : ''})
        </Button>
      </DialogActions>
    </Dialog>
  );
}

