import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bed,
  Building2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Ban,
  PlusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { BookingForm } from '../../components/rooms/BookingForm';
import api from '../../lib/api';
import { useAuthStore } from '../../stores/authStore';

interface Booking {
  id: string;
  studentProfileId: string;
  roomId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  notes?: string;
  reviewedBy?: string;
  createdAt: string;
  room: {
    id: string;
    roomNumber: string;
    floor: number;
    type: string;
    block: {
      id: string;
      name: string;
    };
  };
}

export default function BookingStatusPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const studentProfileId = user?.profile?.id;

  // Fetch student's booking requests
  const { data: bookingsData, isLoading } = useQuery({
    queryKey: ['myBookings', studentProfileId],
    queryFn: async () => {
      if (!studentProfileId) return [];
      const res = await api.get(`/bookings?studentProfileId=${studentProfileId}`);
      return (res.data.data || []) as Booking[];
    },
    enabled: !!studentProfileId,
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await api.patch(`/bookings/${bookingId}/cancel`, {
        studentProfileId,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Booking request cancelled');
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to cancel booking');
    },
  });

  const pendingBooking = bookingsData?.find((b) => b.status === 'PENDING');
  const hasAllocatedRoom = !!user?.profile?.roomNumber;

  const getStatusBadge = (status: Booking['status']) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> Pending Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            <Ban className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Bed className="w-7 h-7 text-indigo-600" />
            Room Booking & Allocation Status
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your hostel room requests, track booking approvals, and view allocation status.
          </p>
        </div>

        {/* Current Allocation Banner (If allocated) */}
        {hasAllocatedRoom && (
          <div className="bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md text-xs font-bold uppercase tracking-wider rounded-lg mb-2">
                  Active Room Allocation
                </span>
                <h2 className="text-2xl font-black">
                  Room {user?.profile?.roomNumber}
                </h2>
                <p className="text-sm opacity-90 mt-1 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4" /> Allocated Hostel Block ID: {user?.profile?.blockId || 'Main Hostel'}
                </p>
              </div>
              <div className="hidden sm:block p-4 bg-white/10 backdrop-blur-md rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-white" />
              </div>
            </div>
          </div>
        )}

        {/* Pending Booking Notice */}
        {pendingBooking && !hasAllocatedRoom && (
          <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-5 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl mt-0.5">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-base">Booking Request Submitted</h3>
                <p className="text-sm text-amber-700 mt-0.5">
                  Your request for <span className="font-semibold">{pendingBooking.room.block.name} — Room {pendingBooking.room.roomNumber}</span> is currently under warden review.
                </p>
              </div>
            </div>
            <button
              onClick={() => cancelMutation.mutate(pendingBooking.id)}
              disabled={cancelMutation.isPending}
              className="px-4 py-2 bg-white hover:bg-amber-100 text-amber-800 border border-amber-300 font-medium text-xs rounded-xl shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
            >
              {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        )}

        {/* Section: Booking Form (If no active allocation and no pending booking) */}
        {!hasAllocatedRoom && !pendingBooking && studentProfileId && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-indigo-600" /> Submit New Room Booking
            </h2>
            <BookingForm
              studentProfileId={studentProfileId}
              onBookingSubmitted={() => {
                queryClient.invalidateQueries({ queryKey: ['myBookings'] });
              }}
            />
          </div>
        )}

        {/* Section: Booking Request History */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-base">Booking History</h3>
            <span className="text-xs text-gray-500">
              Total: {bookingsData?.length || 0} requests
            </span>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Loading your booking history...
            </div>
          ) : !bookingsData || bookingsData.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No booking requests submitted yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {bookingsData.map((booking) => (
                <div
                  key={booking.id}
                  className="p-5 hover:bg-gray-50/60 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-bold text-gray-900 text-base">
                        {booking.room.block.name} — Room {booking.room.roomNumber}
                      </h4>
                      {getStatusBadge(booking.status)}
                    </div>
                    <p className="text-xs text-gray-500 capitalize">
                      {booking.room.type.toLowerCase()} Room • Floor {booking.room.floor}
                    </p>
                    {booking.notes && (
                      <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100 mt-2">
                        <span className="font-semibold text-gray-700">Remarks:</span> {booking.notes}
                      </p>
                    )}
                    <p className="text-[11px] text-gray-400 pt-1">
                      Submitted on {new Date(booking.createdAt).toLocaleString()}
                    </p>
                  </div>

                  {booking.status === 'PENDING' && (
                    <button
                      onClick={() => cancelMutation.mutate(booking.id)}
                      disabled={cancelMutation.isPending}
                      className="self-start sm:self-center px-3.5 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 border border-gray-200 text-xs font-medium rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
