import { Routes, Route, Navigate } from 'react-router-dom';
import PatientLayout from '../layouts/PatientLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AuthLayout from '../layouts/AuthLayout';
import ProtectedRoute from './ProtectedRoute';

// Pages (will be created)
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import ForgotPassword from '../pages/ForgotPassword';
import ResetPassword from '../pages/ResetPassword';
import Doctors from '../pages/Doctors';
import DoctorProfile from '../pages/DoctorProfile';
import PatientDashboard from '../pages/patient/Dashboard';
import PatientBookings from '../pages/patient/Bookings';
import PatientProfile from '../pages/patient/Profile';
import DoctorAvailability from '../pages/doctor/Availability';
import DoctorPatients from '../pages/doctor/Patients';
import DoctorAppointments from '../pages/doctor/Appointments';
import DoctorOwnProfile from '../pages/doctor/Profile';
import AdminDashboard from '../pages/admin/Dashboard';
import ManageUsers from '../pages/admin/ManageUsers';
import ManageDoctors from '../pages/admin/ManageDoctors';
import AllBookings from '../pages/admin/AllBookings';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Routes with PatientLayout */}
      <Route element={<PatientLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:id" element={<DoctorProfile />} />
      </Route>

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      </Route>

      {/* Patient Protected Routes (Using PatientLayout with Top Nav) */}
      <Route path="/patient" element={
        <ProtectedRoute allowedRoles={['patient']}>
          <PatientLayout />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <PatientDashboard />
          </div>
        } />
        <Route path="bookings" element={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <PatientBookings />
          </div>
        } />
        <Route path="profile" element={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <PatientProfile />
          </div>
        } />
        <Route path="history" element={
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div>Medical History Page</div>
          </div>
        } />
      </Route>

      {/* Doctor Protected Routes */}
      <Route path="/doctor" element={
        <ProtectedRoute allowedRoles={['doctor']}>
          <DashboardLayout role="doctor" />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="availability" replace />} />
        <Route path="dashboard" element={<Navigate to="../availability" replace />} />
        <Route path="availability" element={<DoctorAvailability />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="profile" element={<DoctorOwnProfile />} />
      </Route>

      {/* Admin Protected Routes */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <DashboardLayout role="admin" />
        </ProtectedRoute>
      }>
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="users" element={<ManageUsers />} />
        <Route path="doctors" element={<ManageDoctors />} />
        <Route path="bookings" element={<AllBookings />} />
      </Route>

      {/* 404 Redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
