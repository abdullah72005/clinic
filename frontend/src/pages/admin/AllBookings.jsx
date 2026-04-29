import { useEffect, useState } from 'react';
import { Calendar, Clock, FileText, Stethoscope } from 'lucide-react';
import adminService from '../../services/admin.service';
import { resolveAvatar } from '../../utils/avatar';

const statusStyles = {
  booked: 'bg-blue-50 text-blue-600 border-blue-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
};

const BookingRow = ({ booking }) => (
  <tr className="hover:bg-slate-50/50 transition-colors group">
    <td className="py-4 px-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
          <img
            src={booking.patientImage}
            alt={booking.patientName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = resolveAvatar(null);
            }}
          />
        </div>
        <div>
          <p className="font-bold text-slate-900">{booking.patientName}</p>
          <p className="text-xs text-slate-400">{booking.patientId}</p>
        </div>
      </div>
    </td>
    <td className="py-4 px-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shadow-sm">
          <img
            src={booking.doctorImage}
            alt={booking.doctorName}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = resolveAvatar(null);
            }}
          />
        </div>
        <div>
          <p className="font-bold text-slate-900">{booking.doctorName}</p>
          <p className="text-xs text-slate-400">{booking.doctorSpecialization || 'Not specified'}</p>
        </div>
      </div>
    </td>
    <td className="py-4 px-6">
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-700 flex items-center">
          <Calendar className="w-4 h-4 mr-2 text-slate-400" />
          {booking.date}
        </p>
        <p className="text-xs font-medium text-slate-500 flex items-center">
          <Clock className="w-3 h-3 mr-2 text-slate-400" />
          {booking.time}
        </p>
      </div>
    </td>
    <td className="py-4 px-6">
      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${statusStyles[booking.status] || 'bg-slate-50 text-slate-600 border-slate-100'}`}>
        {booking.status || 'Unknown'}
      </span>
    </td>
    <td className="py-4 px-6">
      <p className="max-w-xs truncate text-sm text-slate-500">{booking.notes || 'No notes'}</p>
    </td>
  </tr>
);

const AllBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const data = await adminService.getAllBookings();
        setBookings(data);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black text-slate-900 leading-tight">All Bookings</h1>
        <p className="text-slate-500 font-medium">Review appointments using data from the booking API.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total</p>
          <p className="text-3xl font-black text-slate-900 mt-2">{bookings.length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Booked</p>
          <p className="text-3xl font-black text-blue-600 mt-2">{bookings.filter((item) => item.status === 'booked').length}</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Completed</p>
          <p className="text-3xl font-black text-green-600 mt-2">{bookings.filter((item) => item.status === 'completed').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Stethoscope className="w-5 h-5 mr-2 text-primary-600" />
            Booking Records
          </h2>
          <FileText className="w-5 h-5 text-slate-300" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Patient</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Doctor</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Date & Time</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="py-4 px-6 text-xs font-black text-slate-400 uppercase tracking-widest">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                Array(5).fill(0).map((_, index) => (
                  <tr key={index} className="animate-pulse h-16 bg-white" />
                ))
              ) : bookings.length > 0 ? (
                bookings.map((booking) => <BookingRow key={booking.id} booking={booking} />)
              ) : (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-500 font-medium">No bookings found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AllBookings;
