import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  Star, 
  MapPin, 
  Clock, 
  Award, 
  CheckCircle, 
  Calendar, 
  ChevronRight, 
  ShieldCheck, 
  ArrowLeft,
  MessageSquare,
  ThumbsUp,
  Share2,
  Heart,
  Check
} from 'lucide-react';
import doctorService from '../services/doctor.service';
import bookingService from '../services/booking.service';
import { useAuth } from '../store/AuthContext';

const formatReviewDate = (value) => {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString();
};

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isBooking, setIsBooking] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showToast, setShowToast] = useState({ show: false, message: '' });
  
  const reviewsRef = useRef(null);

  useEffect(() => {
    const fetchDoctor = async () => {
      try {
        const [doctorData, reviewsData] = await Promise.all([
          doctorService.getDoctorById(id),
          doctorService.getDoctorReviews(id),
        ]);
        const mappedReviews = reviewsData.map((review) => ({
          id: review.id,
          rating: review.rating || 0,
          comment: review.comment || 'No comment provided.',
          createdAt: review.createdAt,
          reviewerName: review.patientName || 'Unknown Patient',
        }));

        setReviews(mappedReviews);
        const data = {
          ...doctorData,
          reviewsCount: mappedReviews.length,
        };
        setDoctor(data);
        if (data.availability.length > 0) {
          setSelectedDay(data.availability[0]);
        }
      } catch (err) {
        navigate('/doctors');
      } finally {
        setLoading(false);
      }
    };
    fetchDoctor();
  }, [id, navigate]);

  const triggerToast = (message) => {
    setShowToast({ show: true, message });
    setTimeout(() => setShowToast({ show: false, message: '' }), 3000);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: doctor.name,
          text: `Check out ${doctor.name} on DocBook`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        triggerToast('Link copied to clipboard! 📋');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const toggleFavorite = () => {
    setIsFavorite(!isFavorite);
    triggerToast(!isFavorite ? 'Added to favorites! ❤️' : 'Removed from favorites');
  };

  const scrollToReviews = () => {
    reviewsRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
      return;
    }

    if (!selectedSlot) return;

    setIsBooking(true);
    try {
      await bookingService.createBooking({
        timeSlotId: selectedSlot.id,
        notes: `Booked with ${doctor.name} on ${selectedDay.day} at ${selectedSlot.label}`,
      });
      setBookingSuccess(true);
      setTimeout(() => {
        navigate('/patient/dashboard');
      }, 2000);
    } finally {
      setIsBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Doctor Info (Left) */}
        <div className="lg:col-span-2 space-y-12">
          {/* Main Info Card */}
          <div className="bg-white rounded-[3rem] border border-slate-100 p-8 shadow-sm shadow-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-full -mr-8 -mt-8 opacity-50"></div>
            
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
              <div className="w-48 h-48 rounded-3xl overflow-hidden bg-slate-100 shrink-0 border-4 border-white shadow-xl shadow-slate-200">
                <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                   <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-bold uppercase tracking-wider rounded-full flex items-center">
                     <ShieldCheck className="w-3 h-3 mr-1" />
                     Verified Doctor
                   </div>
                   <div className="flex items-center text-yellow-400 bg-yellow-50 px-2 py-1 rounded-full">
                     <Star className="w-3 h-3 fill-yellow-400 mr-1" />
                     <span className="text-xs font-bold text-yellow-700">{doctor.rating}</span>
                   </div>
                </div>

                <h1 className="text-4xl font-black text-slate-900">{doctor.name}</h1>
                <p className="text-xl font-bold text-primary-600">{doctor.specialty}</p>

                <div className="flex flex-wrap gap-4 pt-2 text-slate-500 font-medium text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span>{doctor.location || 'Location not available'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>{doctor.experience} Experience</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Award className="w-4 h-4 text-slate-400" />
                    <span>{doctor.education}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-4 pt-4">
                  <button 
                    onClick={handleShare}
                    className="p-3 rounded-2xl bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all border border-slate-100"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* About Section */}
          <div className="space-y-6">
            <h2 className="text-2xl font-black text-slate-900 flex items-center">
              <span className="w-8 h-8 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600 mr-3">
                <CheckCircle className="w-5 h-5" />
              </span>
              About Doctor
            </h2>
            <p className="text-slate-500 leading-relaxed text-lg">
              {doctor.about}
            </p>
          </div>

          {/* Reviews Section */}
          <div ref={reviewsRef} className="space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900">Patient Reviews</h2>
            </div>

            {reviews.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-6 text-slate-500">
                No reviews yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-white rounded-3xl border border-slate-100 p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-sm">
                          {review.reviewerName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{review.reviewerName}</p>
                          <p className="text-xs text-slate-400">{formatReviewDate(review.createdAt)}</p>
                        </div>
                      </div>
                      <div className="flex text-yellow-400">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-400' : ''}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-slate-500 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking Widget (Right) */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 rounded-[3rem] p-8 sticky top-24 text-white shadow-2xl shadow-slate-300">
            <div className="flex items-center justify-between mb-8">
              <div>
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px] mb-1">Clinic Appointment</p>
                <p className="text-2xl font-black">Book Now</p>
              </div>
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary-400" />
              </div>
            </div>

            <div className="space-y-8">
              {/* Day Selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Available Days</label>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                  {doctor.availability.map((day, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedDay(day); setSelectedSlot(null); }}
                      className={`px-5 py-3 rounded-2xl text-sm font-bold transition-all shrink-0 ${
                        selectedDay?.day === day.day 
                          ? 'bg-primary-600 text-white shadow-lg shadow-primary-900' 
                          : 'bg-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      {day.day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot Selection */}
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-4">Available Slots</label>
                <div className="grid grid-cols-2 gap-3">
                  {selectedDay?.slotObjects?.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedSlot(slot)}
                      className={`px-4 py-3 rounded-2xl text-xs font-bold transition-all border ${
                        selectedSlot?.id === slot.id 
                          ? 'bg-white text-slate-900 border-white shadow-lg' 
                          : 'bg-transparent border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Book Button */}
              <button
                disabled={!selectedSlot || isBooking || bookingSuccess}
                onClick={handleBooking}
                className={`w-full py-5 rounded-3xl font-black text-lg transition-all flex items-center justify-center space-x-3 shadow-xl ${
                  bookingSuccess 
                    ? 'bg-green-500 text-white' 
                    : !selectedSlot 
                      ? 'bg-white/5 text-white/20 cursor-not-allowed' 
                      : 'bg-primary-600 text-white hover:bg-primary-500 shadow-primary-900'
                }`}
              >
                {bookingSuccess ? (
                  <>
                    <CheckCircle className="w-6 h-6 animate-bounce" />
                    <span>Booked Successfully!</span>
                  </>
                ) : isBooking ? (
                  <Clock className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <span>Book Appointment</span>
                    <ChevronRight className="w-6 h-6" />
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-slate-500 font-medium">
                No extra fees will be charged during the booking process.
              </p>
            </div>
          </div>
        </div>
      </div>
      {/* Toast Notification */}
      {showToast.show && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 border border-slate-800">
            <div className="w-6 h-6 bg-primary-500 rounded-lg flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-bold tracking-wide">{showToast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorProfile;
