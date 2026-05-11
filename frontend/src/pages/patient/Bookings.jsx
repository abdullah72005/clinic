import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import bookingService from '../../services/booking.service';
import { Calendar, Clock, FileText, Pill, Activity, Star, X, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

const statusClass = {
  booked: 'bg-primary-50 text-primary-600 border-primary-100',
  completed: 'bg-green-50 text-green-600 border-green-100',
  cancelled: 'bg-red-50 text-red-600 border-red-100',
};

const ReviewModal = ({ appointment, onClose, onSubmit }) => {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit({ appointmentId: appointment.id, rating, comment });
      onClose();
    } catch (error) {
      console.error('Failed to submit review:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary-600">
          <h3 className="text-xl font-black text-white">Rate Your Visit</h3>
          <button onClick={onClose} className="p-2 text-white/80 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">How was your experience with</p>
            <h4 className="text-xl font-black text-slate-900">{appointment.doctorName}?</h4>
          </div>

          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  className={`w-10 h-10 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                />
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Your Review</label>
            <textarea
              required
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Tell others about your visit..."
              className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

const AppointmentCard = ({ appointment, onViewDetails, reviews, onCancel }) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 hover:shadow-xl hover:shadow-slate-200 transition-all duration-300 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100">
            <img src={appointment.doctorImage} alt={appointment.doctorName} className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-black text-slate-900">{(appointment.doctorName || '').replace(/\s*Account\s*$/i, '')}</h3>
            <p className="text-xs font-bold text-primary-600">{appointment.doctorSpecialization}</p>
          </div>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
            statusClass[appointment.status] || 'bg-slate-50 text-slate-600 border-slate-100'
          }`}
        >
          {appointment.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="flex items-center text-slate-500 font-medium">
          <Calendar className="w-4 h-4 mr-2 text-primary-500" />
          {appointment.date}
        </div>
        <div className="flex items-center text-slate-500 font-medium">
          <Clock className="w-4 h-4 mr-2 text-primary-500" />
          {appointment.time}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        {appointment.status === 'booked' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancel(appointment.id);
            }}
            className="px-5 py-2.5 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-100 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Cancel
          </button>
        )}
        {appointment.status === 'completed' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const existingReview = reviews?.find(r => r.appointmentId === appointment.id);
              if (existingReview) {
                onViewDetails(appointment);
              } else {
                onViewDetails(appointment, true);
              }
            }}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-colors border flex items-center gap-2 ${
              reviews?.some(r => r.appointmentId === appointment.id)
                ? 'bg-yellow-400 text-yellow-900 border-yellow-500'
                : 'bg-yellow-50 text-yellow-600 border-yellow-100 hover:bg-yellow-100'
            }`}
          >
            <Star className={`w-4 h-4 ${reviews?.some(r => r.appointmentId === appointment.id) ? 'fill-yellow-900' : 'fill-yellow-600'}`} />
            {reviews?.some(r => r.appointmentId === appointment.id) ? 'View Rating' : 'Rate Visit'}
          </button>
        )}
        <button
          type="button"
          onClick={() => onViewDetails(appointment)}
          className="px-5 py-2.5 bg-slate-50 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors border border-slate-100"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

const Bookings = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [reviewing, setReviewing] = useState(null);

  const selectedAppointmentId = location.state?.selectedAppointmentId || null;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [apps, history, userReviews] = await Promise.all([
        bookingService.getAppointments(user.id, 'patient'),
        bookingService.getMyMedicalHistory(),
        bookingService.getMyReviews(),
      ]);
      setAppointments(apps);
      setMedicalHistory(history);
      setReviews(userReviews);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const handleReviewSubmit = async (reviewData) => {
    try {
      await bookingService.submitReview(reviewData);
      // Refresh to update UI if needed (though we don't show star icons on cards yet)
      fetchData();
    } catch (error) {
      console.error('Review submission failed:', error);
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      await bookingService.cancelAppointment(appointmentId);
      fetchData();
      if (selected?.id === appointmentId) {
        setSelected(null);
      }
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  };

  useEffect(() => {
    if (!selectedAppointmentId) return;
    const found = appointments.find((a) => a.id === selectedAppointmentId);
    if (found) {
      setSelected(found);
    }
  }, [selectedAppointmentId, appointments]);

  const details = useMemo(() => {
    if (!selected) return null;
    
    // Find matching medical record data
    const diagnosis = medicalHistory?.diagnoses?.find(d => d.appointmentId === selected.id);
    const prescription = medicalHistory?.prescriptions?.find(p => p.appointmentId === selected.id);
    const review = reviews?.find(r => r.appointmentId === selected.id);
    
    return {
      ...selected,
      diagnosis,
      prescription,
      review
    };
  }, [selected, medicalHistory, reviews]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">My Bookings</h1>
          <p className="text-slate-500 font-medium">{appointments.length} bookings found</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                // eslint-disable-next-line react/no-array-index-key
                key={idx}
                className="h-44 bg-white rounded-[2rem] border border-slate-100 animate-pulse"
              />
            ))
          ) : appointments.length === 0 ? (
            <div className="p-8 rounded-[2rem] bg-white border border-slate-200 text-slate-500">
              No bookings found.
            </div>
          ) : (
            appointments.map((app) => (
              <AppointmentCard 
                key={app.id} 
                appointment={app} 
                reviews={reviews}
                onCancel={handleCancelAppointment}
                onViewDetails={(a, isReview = false) => {
                  if (isReview) setReviewing(a);
                  else setSelected(a);
                }} 
              />
            ))
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-100 p-6 sticky top-24">
            <h2 className="text-xl font-black text-slate-900">Booking Details</h2>
            {!details ? (
              <p className="text-slate-500 mt-3">Select a booking to see details.</p>
            ) : (
              <div className="mt-6 space-y-6">
                <div className="space-y-4 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-slate-900">{details.doctorName}</span>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                        statusClass[details.status] || 'bg-slate-50 text-slate-600 border-slate-100'
                      }`}
                    >
                      {details.status}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <p className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Specialty:</span> {details.doctorSpecialization}
                    </p>
                    <p className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Date:</span> {details.date}
                    </p>
                    <p className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-500" />
                      <span className="font-bold text-slate-500">Time:</span> {details.time}
                    </p>
                  </div>
                </div>

                {details.status === 'booked' && (
                  <button
                    onClick={() => handleCancelAppointment(details.id)}
                    className="w-full py-3 bg-red-50 text-red-600 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-red-100 transition-all border border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Cancel Appointment
                  </button>
                )}

                {details.status === 'completed' && (
                  <div className="pt-6 border-t border-slate-100 space-y-6">
                    {details.review ? (
                      <div className="p-5 bg-yellow-50/50 rounded-2xl border border-yellow-100/50">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                className={`w-3 h-3 ${star <= details.review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                              />
                            ))}
                          </div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Your Rating</span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium italic leading-relaxed">
                          "{details.review.comment}"
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => setReviewing(details)}
                        className="w-full py-3 bg-yellow-400 text-yellow-900 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-yellow-500 transition-all shadow-lg shadow-yellow-100"
                      >
                        <Star className="w-4 h-4 fill-yellow-900" />
                        Rate this Visit
                      </button>
                    )}

                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                        <FileText className="w-4 h-4 text-primary-600" />
                        Medical Diagnosis
                      </h3>
                      {details.diagnosis ? (
                        <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                          <p className="text-sm text-primary-900 font-medium leading-relaxed">
                            {details.diagnosis.diagnosis}
                          </p>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No diagnosis recorded for this visit.</p>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-black text-slate-900 flex items-center gap-2 mb-3">
                        <Pill className="w-4 h-4 text-primary-600" />
                        Prescription
                      </h3>
                      {details.prescription ? (
                        <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                          <p className="text-sm text-green-900 font-bold mb-1">
                            {details.prescription.prescription}
                          </p>
                          <div className="flex gap-4 mt-2 text-[10px] font-black uppercase tracking-wider text-green-700">
                            <span>Dose: {details.prescription.dose}</span>
                            <span>Duration: {details.prescription.duration}</span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No prescription recorded for this visit.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {reviewing && (
        <ReviewModal 
          appointment={reviewing} 
          onClose={() => setReviewing(null)} 
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
};

export default Bookings;

