import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bed, Users, Send, CheckCircle2, AlertCircle, FileText, Building2 } from 'lucide-react';
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
}

interface BookingFormProps {
  studentProfileId: string;
  onBookingSubmitted?: () => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  studentProfileId,
  onBookingSubmitted,
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [notes, setNotes] = useState<string>('');

  // Fetch available rooms
  const { data: rooms, isLoading, error } = useQuery({
    queryKey: ['availableRoomsForBooking'],
    queryFn: async () => {
      const response = await api.get('/rooms?availableOnly=true');
      return response.data.data as Room[];
    },
  });

  // Submit booking request mutation
  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoomId) throw new Error('Please select a room first');
      const response = await api.post('/bookings', {
        studentProfileId,
        roomId: selectedRoomId,
        notes: notes.trim() || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Room booking request submitted successfully!');
      setSelectedRoomId(null);
      setNotes('');
      if (onBookingSubmitted) onBookingSubmitted();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to submit booking request';
      toast.error(msg);
    },
  });

  const selectedRoom = rooms?.find((r) => r.id === selectedRoomId);

  if (isLoading) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-gray-100 shadow-xs">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent mb-3"></div>
        <p className="text-sm font-medium text-gray-600">Loading available rooms...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50/50 border border-red-200 rounded-2xl text-center text-red-600 flex items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load rooms. Please try again later.</span>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <div className="p-8 bg-amber-50/50 border border-amber-200 rounded-2xl text-center text-amber-700">
        <Building2 className="w-10 h-10 mx-auto mb-2 text-amber-500" />
        <h4 className="font-semibold text-lg">No Rooms Currently Available</h4>
        <p className="text-sm mt-1 text-amber-600">
          All rooms are currently at full capacity. Please check back later or contact the warden.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-gray-200/80 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 bg-linear-to-r from-gray-50 to-indigo-50/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
            <Bed className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Request Room Booking</h3>
            <p className="text-xs text-gray-500">
              Select a room and submit your booking request for warden review
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Step 1: Select Room */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            1. Select an Available Room
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const availableBeds = room.capacity - room.currentOccupancy;

              return (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`relative cursor-pointer transition-all duration-200 border rounded-2xl p-4 flex flex-col justify-between ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50/60'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3.5 right-3.5 text-indigo-600">
                      <CheckCircle2 className="w-5 h-5 fill-indigo-600 text-white" />
                    </div>
                  )}

                  <div>
                    <div className="flex justify-between items-start pr-6">
                      <div>
                        <h4 className="font-bold text-gray-900 text-base">
                          {room.block.name} — Room {room.roomNumber}
                        </h4>
                        <p className="text-xs text-gray-500 capitalize mt-0.5">
                          {room.type.toLowerCase()} Room • Floor {room.floor}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 mt-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                        <Users className="w-3.5 h-3.5 text-gray-400" />
                        {room.currentOccupancy} / {room.capacity} Occupied
                      </span>
                      <span className="inline-flex items-center text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-lg">
                        {availableBeds} {availableBeds === 1 ? 'bed' : 'beds'} left
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {room.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-600"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Special Requests / Notes */}
        {selectedRoom && (
          <div className="pt-4 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-500" />
              2. Additional Requests / Remarks (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Preferred bed location, health conditions, or roommate request..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none text-gray-800 placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {/* Footer Submit Button */}
      {selectedRoom && (
        <div className="p-4 px-6 border-t border-gray-100 bg-gray-50/80 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Selected: <span className="font-semibold text-gray-800">{selectedRoom.block.name} — Room {selectedRoom.roomNumber}</span>
          </div>
          <button
            onClick={() => bookingMutation.mutate()}
            disabled={bookingMutation.isPending}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            {bookingMutation.isPending ? 'Submitting Request...' : 'Submit Booking Request'}
          </button>
        </div>
      )}
    </div>
  );
};
