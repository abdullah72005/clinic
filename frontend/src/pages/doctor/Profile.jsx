import { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import doctorService from '../../services/doctor.service';
import { resolveAvatar } from '../../utils/avatar';

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
        const data = await doctorService.getMyProfile(user.userId);
        setProfile(data);
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
            <div className="flex items-center gap-3">
              <input
                id="doctor-profile-image"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label
                htmlFor="doctor-profile-image"
                className="inline-flex items-center px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-bold cursor-pointer hover:bg-primary-700 transition-colors"
              >
                Choose Image
              </label>
              <span className="text-sm text-slate-500">
                {selectedImageFile ? selectedImageFile.name : 'No file chosen'}
              </span>
            </div>
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
    </div>
  );
};

export default DoctorProfile;
