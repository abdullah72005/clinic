import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import doctorService from '../../services/doctor.service';
import { resolveAvatar } from '../../utils/avatar';
import { Star } from 'lucide-react';

const withCacheBust = (image) => {
  if (!image || image.startsWith('data:') || image.startsWith('blob:')) {
    return image;
  }
  const separator = image.includes('?') ? '&' : '?';
  return `${image}${separator}v=${Date.now()}`;
};

const DoctorProfile = () => {
  const { user, updateUserProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({
    first_Name: '',
    email: '',
    specialization: '',
    yearsOfExperience: 0,
    location: '',
    bio: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(resolveAvatar(user?.image));
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError('');
      try {
        if (!user?.userId) throw new Error('Doctor identity not found.');
        const [data, reviewsData] = await Promise.all([
          doctorService.getMyProfile(user.userId),
          doctorService.getMyReviews()
        ]);
        
        setProfile(data);
        setReviews(reviewsData);

        const nameParts = (data.name || '').replace(/^Dr\.\s*/, '').trim().split(' ');
        setForm({
          first_Name: nameParts[0] || '',
          email: data.email || '',
          specialization: data.specialty || '',
          yearsOfExperience: Number(String(data.experience || '0').split(' ')[0]) || 0,
          location: data.location || '',
          bio: data.about === 'No bio available yet.' ? '' : data.about || '',
        });
        const avatar = resolveAvatar(data.image || user?.image);
        setImagePreview(avatar);
        setSelectedImageFile(null);
      } catch (err) {
        setError(err?.message || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user?.userId]);

  if (loading) {
    return <div className="h-48 rounded-2xl bg-white border border-slate-200 animate-pulse" />;
  }

  if (error) {
    return <p className="text-red-600 text-sm">{error}</p>;
  }

  if (!profile) {
    return <p className="text-slate-500">No profile data available.</p>;
  }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = new FormData();
      payload.append('first_Name', form.first_Name);
      payload.append('email', form.email);
      payload.append('specialization', form.specialization);
      payload.append('yearsOfExperience', String(Number(form.yearsOfExperience || 0)));
      payload.append('location', form.location);
      payload.append('bio', form.bio);
      if (selectedImageFile) {
        payload.append('pfp', selectedImageFile);
      }

      const updated = await doctorService.updateMyProfile(payload);
      setProfile(updated);
      updateUserProfile({
        name: updated.name,
        fullName: updated.name,
        email: form.email,
        image: resolveAvatar(withCacheBust(updated.image)),
      });
      setImagePreview(resolveAvatar(withCacheBust(updated.image)));
      setSelectedImageFile(null);
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please choose a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) return;
      setImagePreview(result);
      setSelectedImageFile(file);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black text-slate-900">Doctor Profile</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-sm font-bold text-slate-700">Profile Image</label>
          <div className="mt-2 flex items-center gap-4">
            <img
              src={resolveAvatar(imagePreview)}
              alt="Profile preview"
              className="w-16 h-16 rounded-full object-cover border border-slate-200"
              onError={(e) => {
                e.currentTarget.src = resolveAvatar(null);
              }}
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">First Name</label>
          <input
            name="first_Name"
            value={form.first_Name}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
            required
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-bold text-slate-700">Specialization</label>
            <input
              name="specialization"
              value={form.specialization}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="text-sm font-bold text-slate-700">Years of Experience</label>
            <input
              name="yearsOfExperience"
              type="number"
              min="0"
              value={form.yearsOfExperience}
              onChange={handleChange}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Location</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
            required
          />
        </div>

        <div>
          <label className="text-sm font-bold text-slate-700">Bio</label>
          <textarea
            name="bio"
            value={form.bio}
            onChange={handleChange}
            rows={4}
            className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-lg"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>

      {/* Reviews Section */}
      <div className="space-y-6 pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900">Patient Reviews & Ratings</h2>
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-xl border border-yellow-100">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            <span className="text-lg font-black text-yellow-700">{profile.rating || '0.0'}</span>
            <span className="text-sm text-yellow-600 font-bold">({reviews.length} reviews)</span>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                      {review.patientName?.charAt(0) || 'P'}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{review.patientName}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{new Date(review.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        className={`w-3 h-3 ${star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'}`} 
                      />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed italic">"{review.comment}"</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
            <p className="text-slate-400 font-medium">No reviews yet. Completed appointments will appear here once rated by patients.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorProfile;
