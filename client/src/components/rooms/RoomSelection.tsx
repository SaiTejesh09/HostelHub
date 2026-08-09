import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bed, Users, Filter, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../lib/api';

interface Room {
  id: string;
  blockId: string;
  roomNumber: string;
  floor: number;
  capacity: number;
  currentOccupancy: number;
  type: string;
  isAvailable: boolean;
  amenities: string[];
  block: { id: string; name: string };
  beds: { id: string; bedNumber: string; isOccupied: boolean }[];
}

interface RoomSelectionProps {
  studentProfileId: string;
  onRoomAllocated?: () => void;
}

export const RoomSelection: React.FC<RoomSelectionProps> = ({ studentProfileId, onRoomAllocated }) => {
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['availableRooms'],
    queryFn: async () => {
      const response = await api.get('/rooms?availableOnly=true');
      return response.data.data as Room[];
    },
  });

  const allocateMutation = useMutation({
    mutationFn: async (roomId: string) => {
      return api.post('/rooms/allocate', { roomId, studentProfileId });
    },
    onSuccess: () => {
      toast.success('Room allocated successfully!');
      if (onRoomAllocated) onRoomAllocated();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to allocate room');
    },
  });

  if (isLoading) return <div className="p-4 text-center text-gray-500">Loading available rooms...</div>;
  if (error) return <div className="p-4 text-center text-red-500">Error loading rooms</div>;
  if (!rooms || rooms.length === 0) return <div className="p-4 text-center text-gray-500">No rooms available at the moment.</div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Bed className="w-5 h-5 text-indigo-500" />
          Select Your Room
        </h3>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter className="w-4 h-4" />
          Filter
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const isSelected = selectedRoom === room.id;
          const availableBeds = room.capacity - room.currentOccupancy;
          
          return (
            <div 
              key={room.id}
              onClick={() => setSelectedRoom(room.id)}
              className={`relative cursor-pointer transition-all duration-200 border rounded-xl p-4 flex flex-col gap-3 ${
                isSelected ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-200 ring-offset-1' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
              }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 text-indigo-500">
                  <CheckCircle className="w-5 h-5" />
                </div>
              )}
              
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-lg text-gray-800">{room.block.name} - {room.roomNumber}</h4>
                  <p className="text-xs font-medium text-gray-500 capitalize">{room.type.toLowerCase()} Room • Floor {room.floor}</p>
                </div>
                <div className="flex items-center justify-center bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-md text-xs font-bold">
                  {availableBeds} left
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{room.currentOccupancy} / {room.capacity}</span>
                </div>
              </div>
              
              <div className="mt-1 flex flex-wrap gap-1.5">
                {room.amenities.map(amenity => (
                  <span key={amenity} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedRoom && (
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button
            onClick={() => allocateMutation.mutate(selectedRoom)}
            disabled={allocateMutation.isPending}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg shadow-sm transition-colors"
          >
            {allocateMutation.isPending ? 'Allocating...' : 'Confirm Selection'}
          </button>
        </div>
      )}
    </div>
  );
};
