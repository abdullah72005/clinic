import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, MapPin, Star, Shield, Clock, Phone, ChevronRight, User } from 'lucide-react';
import doctorService from '../services/doctor.service';

const SpecialtyCard = ({ title, icon: Icon, color, doctorsCount, to }) => (
  <Link
    to={to}
    className="group cursor-pointer p-6 bg-white rounded-3xl border border-slate-100 hover:border-primary-200 hover:shadow-xl hover:shadow-primary-100 transition-all duration-300 flex flex-col items-center text-center"
  >
    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 ${color}`}>
      <Icon className="w-8 h-8" />
    </div>
    <h3 className="font-bold text-slate-800 mb-1">{title}</h3>
    <p className="text-xs text-slate-400">{doctorsCount} Doctors</p>
  </Link>
);

const DoctorCard = ({ doctor }) => (
  <div className="group bg-white rounded-3xl border border-slate-100 p-5 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300">
    <div className="relative mb-4">
      <div className="w-full h-48 rounded-2xl overflow-hidden bg-slate-100">
        <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
        <span className="text-xs font-bold text-slate-800">{doctor.rating}</span>
      </div>
    </div>
    <div className="space-y-1">
      <h3 className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{doctor.name}</h3>
      <p className="text-sm font-medium text-primary-600">{doctor.specialty}</p>
      <div className="flex items-center text-xs text-slate-500 space-x-2 pt-2">
        <MapPin className="w-3 h-3" />
        <span>New York, USA</span>
      </div>
    </div>
    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
      <div>
        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Starting from</p>
        <p className="text-lg font-bold text-slate-900">${doctor.price}</p>
      </div>
      <Link 
        to={`/doctors/${doctor.id}`}
        className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-primary-600 transition-colors"
      >
        Book Now
      </Link>
    </div>
  </div>
);

const Home = () => {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const specialtyIcons = [Phone, Search, User, Clock, Shield, Star];
  const specialtyColors = [
    'bg-red-50 text-red-600',
    'bg-blue-50 text-blue-600',
    'bg-green-50 text-green-600',
    'bg-purple-50 text-purple-600',
    'bg-orange-50 text-orange-600',
    'bg-cyan-50 text-cyan-600',
  ];

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const [doctorsData, specialtiesData] = await Promise.all([
          doctorService.getDoctors(),
          doctorService.getSpecialties(),
        ]);
        setDoctors(doctorsData.slice(0, 4));
        setSpecialties(specialtiesData.slice(0, 6));
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  return (
    <div className="space-y-24 pb-24">
      {/* Hero Section */}
      <section className="relative pt-12 lg:pt-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-50 rounded-full border border-primary-100">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-500"></span>
              </span>
              <span className="text-sm font-bold text-primary-700">Available 24/7 for you</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black text-slate-900 leading-tight">
              Find & Book the <span className="text-primary-600">Best Doctors</span> in town.
            </h1>
            
            <p className="text-xl text-slate-500 leading-relaxed max-w-xl">
              Access the best medical care with ease. Book appointments with top-rated doctors across various specialties instantly.
            </p>

            <div className="bg-white p-2 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-100 flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
              <div className="flex-grow flex items-center px-4">
                <Search className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Doctor, specialty..." 
                  className="w-full py-4 bg-transparent border-none focus:ring-0 text-slate-900 font-medium placeholder:text-slate-400"
                />
              </div>
              <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
              <div className="flex-grow flex items-center px-4">
                <MapPin className="w-5 h-5 text-slate-400 mr-3" />
                <input 
                  type="text" 
                  placeholder="Location" 
                  className="w-full py-4 bg-transparent border-none focus:ring-0 text-slate-900 font-medium placeholder:text-slate-400"
                />
              </div>
              <Link 
                to="/doctors"
                className="bg-primary-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 text-center"
              >
                Search
              </Link>
            </div>

            <div className="flex items-center space-x-8 pt-4">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden shadow-lg shadow-slate-200">
                    <img src={`https://i.pravatar.cc/100?img=${i+20}`} alt="avatar" />
                  </div>
                ))}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">50k+</p>
                <p className="text-sm text-slate-400 font-medium">Happy Patients</p>
              </div>
            </div>
          </div>

          <div className="relative hidden lg:block">
             <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
                <img 
                  src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=800&h=1000" 
                  alt="Doctor" 
                  className="w-full h-auto"
                />
             </div>
             {/* Stats badges */}
             <div className="absolute -top-6 -right-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-50 z-20">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-green-100 rounded-2xl flex items-center justify-center text-green-600">
                    <Shield className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">100% Secure</p>
                    <p className="text-xs text-slate-400 font-medium">Verified Doctors</p>
                  </div>
                </div>
             </div>
             <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-3xl shadow-xl border border-slate-50 z-20">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                    <Clock className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Instant Booking</p>
                    <p className="text-xs text-slate-400 font-medium">Save your time</p>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0">
            <div>
              <p className="text-primary-600 font-bold uppercase tracking-widest text-sm mb-2">Our Specialties</p>
              <h2 className="text-4xl font-black text-slate-900">Explore by Specialty</h2>
            </div>
            <Link to="/doctors" className="flex items-center text-slate-500 font-bold hover:text-primary-600 transition-colors group">
              View All <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {specialties.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-500">
              No specialties available right now.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
              {specialties.map((specialty, index) => (
                <SpecialtyCard
                  key={specialty.name}
                  title={specialty.name}
                  doctorsCount={specialty.doctorsCount}
                  icon={specialtyIcons[index % specialtyIcons.length]}
                  color={specialtyColors[index % specialtyColors.length]}
                  to={`/doctors?specialization=${encodeURIComponent(specialty.name)}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Doctors Section */}
      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 space-y-4 md:space-y-0">
            <div>
              <p className="text-primary-600 font-bold uppercase tracking-widest text-sm mb-2">Top Rated</p>
              <h2 className="text-4xl font-black text-slate-900">Meet Our Doctors</h2>
            </div>
            <Link to="/doctors" className="flex items-center text-slate-500 font-bold hover:text-primary-600 transition-colors group">
              See All Doctors <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-3xl border border-slate-100 p-5 space-y-4">
                  <div className="w-full h-48 bg-slate-100 rounded-2xl"></div>
                  <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                </div>
              ))
            ) : (
              doctors.map(doctor => (
                <DoctorCard key={doctor.id} doctor={doctor} />
              ))
            )}
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;
