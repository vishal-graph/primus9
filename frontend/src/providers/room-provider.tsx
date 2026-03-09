'use client';

import { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { Room, RoomStatus } from '@/types/room';

interface RoomContextValue {
  rooms: Room[];
  selectedRoom: Room | null;
  setRooms: (rooms: Room[]) => void;
  selectRoom: (roomId: string | null) => void;
  updateRoomStatus: (roomId: string, status: RoomStatus) => void;
  getRoomById: (roomId: string) => Room | undefined;
}

const RoomContext = createContext<RoomContextValue | undefined>(undefined);

interface RoomProviderProps {
  children: React.ReactNode;
}

export function RoomProvider({ children }: RoomProviderProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const selectedRoom = useMemo(
    () => rooms.find((r) => r.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const selectRoom = useCallback((roomId: string | null) => {
    setSelectedRoomId(roomId);
  }, []);

  const updateRoomStatus = useCallback((roomId: string, status: RoomStatus) => {
    setRooms((prev) =>
      prev.map((room) =>
        room.id === roomId ? { ...room, status } : room
      )
    );
  }, []);

  const getRoomById = useCallback(
    (roomId: string) => rooms.find((r) => r.id === roomId),
    [rooms]
  );

  const value = useMemo(
    () => ({
      rooms,
      selectedRoom,
      setRooms,
      selectRoom,
      updateRoomStatus,
      getRoomById,
    }),
    [rooms, selectedRoom, selectRoom, updateRoomStatus, getRoomById]
  );

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const context = useContext(RoomContext);
  if (context === undefined) {
    throw new Error('useRoom must be used within a RoomProvider');
  }
  return context;
}

