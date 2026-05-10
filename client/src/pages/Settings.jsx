import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/authSlice';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';

const Settings = () => {
    const dispatch = useDispatch();
    const user = useSelector((state) => state.auth.user);
    const token = useSelector((state) => state.auth.token);

    const [name, setName] = useState(user?.name || '');
    const [avatar, setAvatar] = useState(user?.avatar || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [loading, setLoading] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    const handleSave = async (e) => {
        e.preventDefault();
        setSuccessMsg('');
        setErrorMsg('');

        if (newPassword && newPassword !== confirmPassword) {
            setErrorMsg("New passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const payload = { name, avatar };
            if (newPassword) {
                payload.currentPassword = currentPassword;
                payload.newPassword = newPassword;
            }

            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/settings`, payload, { headers });

            // Update Redux so Navbar shows new name/avatar immediately
            dispatch(loginSuccess({ user: res.data.user, token }));

            setSuccessMsg("Settings saved successfully!");
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setErrorMsg(err.response?.data?.message || "Failed to save settings.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex bg-[#F8F9FD] min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10">
                <Navbar />

                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-black">Settings</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">Manage your account and preferences.</p>
                </div>

                <div className="max-w-2xl space-y-6">

                    {/* Profile Card */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm">
                        <div className="flex items-center gap-6 mb-8">
                            <img
                                src={avatar || user?.avatar}
                                alt="Profile"
                                className="w-24 h-24 rounded-full border-4 border-indigo-100 shadow-md object-cover"
                                onError={(e) => { e.target.src = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"; }}
                            />
                            <div>
                                <h2 className="text-2xl font-bold">{user?.name}</h2>
                                <p className="text-gray-500">{user?.email}</p>
                            </div>
                        </div>

                        {successMsg && (
                            <div className="bg-green-50 text-green-700 border border-green-200 p-4 rounded-2xl mb-6 font-bold text-sm">
                                ✓ {successMsg}
                            </div>
                        )}
                        {errorMsg && (
                            <div className="bg-red-50 text-red-700 border border-red-200 p-4 rounded-2xl mb-6 font-bold text-sm">
                                ✗ {errorMsg}
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Display Name</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-black transition"
                                    placeholder="Your full name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Avatar URL</label>
                                <input
                                    type="url"
                                    value={avatar}
                                    onChange={e => setAvatar(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-black transition"
                                    placeholder="https://example.com/your-photo.jpg"
                                />
                                <p className="text-xs text-gray-400 mt-1">Paste any image URL to change your profile picture.</p>
                            </div>

                            <hr className="border-gray-100 my-2" />
                            <p className="text-sm font-bold text-gray-600">Change Password <span className="font-normal text-gray-400">(leave blank to keep current)</span></p>

                            <div>
                                <label className="block text-sm font-bold text-gray-600 mb-2">Current Password</label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={e => setCurrentPassword(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-black transition"
                                    placeholder="Enter current password"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">New Password</label>
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={e => setNewPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-black transition"
                                        placeholder="Min. 6 characters"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-600 mb-2">Confirm New Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 outline-none focus:ring-2 focus:ring-black transition"
                                        placeholder="Repeat new password"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? "Saving..." : "Save Changes"}
                            </button>
                        </form>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-red-100">
                        <h3 className="text-xl font-bold text-red-600 mb-2">Account Info</h3>
                        <p className="text-gray-500 text-sm mb-4">Logged in as <strong>{user?.email}</strong></p>
                        <p className="text-xs text-gray-400">To delete your account, please contact support.</p>
                    </div>

                </div>
            </div>
            <Footer />
            <MobileNav />
        </div>
    );
};

export default Settings;
