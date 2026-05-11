import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, MapPin, Star, Filter, ChevronRight, X, Clock } from 'lucide-react';
import doctorService from '../services/doctor.service';

const DoctorCardLarge = ({ doctor }) => (
  <Link
    to={`/doctors/${doctor.id}`}
    className="group bg-white rounded-[2rem] border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-200 transition-all duration-300 flex flex-col md:flex-row gap-6"
  >
    <div className="md:w-48 lg:w-56 h-48 md:h-auto rounded-2xl overflow-hidden bg-slate-100 relative shrink-0">
      <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
        <span className="text-xs font-bold text-slate-800">{doctor.rating}</span>
      </div>
    </div>

    <div className="flex-grow space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex flex-col items-start space-y-2 mb-1">
             {doctor.availableToday && (
               <span className="px-2 py-0.5 bg-primary-50 text-primary-600 text-[10px] font-bold uppercase tracking-wider rounded-md">Available Today</span>
             )}
             <h3 className="text-xl font-bold text-slate-900">{doctor.name}</h3>
          </div>
          <p className="text-primary-600 font-bold">{doctor.specialty}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-slate-500">
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span>{doctor.location || 'Location not available'}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span>{doctor.experience} Exp</span>
        </div>
      </div>

      <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed">
        {doctor.about}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex -space-x-2">
           {(doctor.availability[0]?.slots || []).slice(0, 3).map((slot, i) => (
             <div key={i} className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-600">
               {slot}
             </div>
           ))}
           {(doctor.availability[0]?.slots?.length || 0) > 3 && (
             <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-xs font-bold text-slate-400">
               +{doctor.availability[0].slots.length - 3} more
             </div>
           )}
        </div>
        <span className="bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold group-hover:bg-primary-700 transition-all shadow-lg shadow-primary-100 flex items-center space-x-2">
          <span>View Profile</span>
          <ChevronRight className="w-4 h-4" />
        </span>
      </div>
    </div>
  </Link>
);

const Doctors = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const specializationFromUrl = searchParams.get('specialization') || '';
  const searchFromUrl = searchParams.get('search') || '';
  const locationFromUrl = searchParams.get('location') || '';

  const [doctors, setDoctors] = useState([]);
  const [specialtyOptions, setSpecialtyOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(searchFromUrl);
  const [locationTerm] = useState(locationFromUrl);
  const [selectedSpecialty, setSelectedSpecialty] = useState(specializationFromUrl);

  useEffect(() => {
    setSelectedSpecialty(specializationFromUrl);
  }, [specializationFromUrl]);

  useEffect(() => {
    const loadSpecialties = async () => {
      try {
        const list = await doctorService.getSpecialties();
        setSpecialtyOptions(list.map((item) => item.name).filter(Boolean));
      } catch {
        setSpecialtyOptions([]);
      }
    };
    loadSpecialties();
  }, []);

  useEffect(() => {
    let isCurrent = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const data = await doctorService.getDoctors({
          search: searchTerm.trim(),
          specialty: selectedSpecialty,
          location: locationTerm.trim(),
        });

        if (isCurrent) {
          setDoctors(data);
        }
      } finally {
        if (isCurrent) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      isCurrent = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm, selectedSpecialty, locationTerm]);

  const setSpecialtyFilter = (spec) => {
    const next = spec === selectedSpecialty ? '' : spec;
    setSelectedSpecialty(next);
    if (next) {
      setSearchParams({ specialization: next }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col lg:flex-row gap-12">
        {/* Sidebar Filters */}
        <aside className="w-full lg:w-80 space-y-8">
          <div className="bg-white rounded-3xl border border-slate-100 p-8 space-y-8 sticky top-24 shadow-sm shadow-slate-100">
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filters
                </h2>
                <button 
                  onClick={() => {
                    setSelectedSpecialty('');
                    setSearchTerm('');
                    setSearchParams({}, { replace: true });
                  }}
                  className="text-xs font-bold text-primary-600 hover:underline"
                >
                  Reset
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-3 uppercase tracking-wider">Search</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Doctor name..." 
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-3 uppercase tracking-wider">Specialty</label>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {specialtyOptions.length === 0 ? (
                      <p className="text-xs text-slate-400">No specialties in database yet.</p>
                    ) : (
                      specialtyOptions.map((spec) => (
                        <button
                          key={spec}
                          type="button"
                          onClick={() => setSpecialtyFilter(spec)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all capitalize ${
                            selectedSpecialty === spec
                              ? 'bg-primary-600 text-white shadow-lg shadow-primary-100'
                              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-transparent'
                          }`}
                        >
                          {spec}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Doctor List */}
        <main className="flex-grow space-y-8">
          <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-100">
            <h1 className="text-2xl font-black text-slate-900">
              {loading ? 'Finding Doctors...' : `${doctors.length} Doctors found`}
            </h1>
          </div>

          <div className="space-y-6">
            {loading ? (
              Array(3).fill(0).map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-[2rem] border border-slate-100 p-6 h-64"></div>
              ))
            ) : doctors.length > 0 ? (
              doctors.map(doctor => (
                <DoctorCardLarge key={doctor.id} doctor={doctor} />
              ))
            ) : (
              <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Search className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No doctors found</h3>
                <p className="text-slate-500">Try adjusting your filters to find what you're looking for.</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Doctors;
