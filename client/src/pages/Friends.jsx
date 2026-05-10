import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';

// ─── Sub-components ────────────────────────────────────────────────────────

const Avatar = ({ name, avatarUrl, size = 'md' }) => {
    const sizes = { sm: 'w-9 h-9 text-sm', md: 'w-12 h-12 text-base', lg: 'w-16 h-16 text-xl' };
    const initials = name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
    const colors = ['bg-indigo-200', 'bg-lime-200', 'bg-purple-200', 'bg-yellow-200', 'bg-pink-200'];
    const color = colors[name?.charCodeAt(0) % colors.length] || 'bg-gray-200';

    if (avatarUrl && !avatarUrl.includes('pixabay')) {
        return <img src={avatarUrl} alt={name} className={`${sizes[size]} rounded-full object-cover border-2 border-white shadow`} onError={(e) => { e.target.style.display = 'none'; }} />;
    }
    return (
        <div className={`${sizes[size]} ${color} rounded-full flex items-center justify-center font-bold text-gray-700 flex-shrink-0`}>
            {initials}
        </div>
    );
};

// ─── Main Friends Page ──────────────────────────────────────────────────────

const Friends = () => {
    const token = useSelector((state) => state.auth.token);
    const currentUser = useSelector((state) => state.auth.user);
    const navigate = useNavigate();

    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [sentRequests, setSentRequests] = useState(new Set()); // track optimistic UI state
    const [loading, setLoading] = useState(true);
    const [searchLoading, setSearchLoading] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    // Fetch friends and pending requests on load
    const loadFriends = useCallback(async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/users/friends', { headers });
            setFriends(res.data.friends || []);
            setFriendRequests(res.data.friendRequests || []);
        } catch (err) {
            console.log("Error loading friends:", err);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => { loadFriends(); }, [loadFriends]);

    // Search with debounce
    useEffect(() => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }
        const timer = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/users/search?q=${encodeURIComponent(searchTerm)}`, { headers });
                // Filter out existing friends from results
                const friendIds = new Set(friends.map(f => f._id));
                setSearchResults(res.data.filter(u => !friendIds.has(u._id) && u._id !== currentUser._id));
            } catch (err) {
                console.log("Error searching:", err);
            } finally {
                setSearchLoading(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, friends, token]);

    const handleSendRequest = async (targetUserId) => {
        try {
            await axios.post('http://localhost:5000/api/users/friend-request', { targetUserId }, { headers });
            setSentRequests(prev => new Set(prev).add(targetUserId));
        } catch (err) {
            const msg = err.response?.data?.message || "Failed to send request";
            alert(msg);
        }
    };

    const handleAccept = async (requesterId) => {
        try {
            const res = await axios.post('http://localhost:5000/api/users/accept-friend', { requesterId }, { headers });
            setFriends(res.data.friends || []);
            setFriendRequests(res.data.friendRequests || []);
        } catch (err) {
            console.log("Error accepting:", err);
        }
    };

    const handleDecline = async (requesterId) => {
        try {
            await axios.post('http://localhost:5000/api/users/decline-friend', { requesterId }, { headers });
            setFriendRequests(prev => prev.filter(r => r._id !== requesterId));
        } catch (err) {
            console.log("Error declining:", err);
        }
    };

    return (
        <div className="flex bg-[#F8F9FD] min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10">
                <Navbar />

                <div className="mb-6 md:mb-8">
                    <h1 className="text-2xl md:text-4xl font-bold text-black">Friends</h1>
                    <p className="text-gray-500 mt-1 text-sm md:text-base">Find people, send requests, and manage your connections.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left: Search + Results */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Search Box */}
                        <div className="bg-white p-8 rounded-[40px] shadow-sm">
                            <h3 className="text-xl font-bold mb-5">Find People</h3>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Search by name or email..."
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-2 focus:ring-black transition font-medium"
                                />
                            </div>

                            {/* Search Results */}
                            <div className="mt-4 space-y-3">
                                {searchLoading && (
                                    <p className="text-gray-400 text-sm text-center py-4">Searching...</p>
                                )}
                                {!searchLoading && searchTerm && searchResults.length === 0 && (
                                    <p className="text-gray-400 text-sm text-center py-4">No users found matching "{searchTerm}"</p>
                                )}
                                {searchResults.map(user => (
                                    <div key={user._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 transition">
                                        <div className="flex items-center gap-3">
                                            <Avatar name={user.name} avatarUrl={user.avatar} size="md" />
                                            <div>
                                                <p className="font-bold">{user.name}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            </div>
                                        </div>
                                        {sentRequests.has(user._id) ? (
                                            <span className="text-xs bg-gray-200 text-gray-500 px-4 py-2 rounded-full font-bold">Request Sent ✓</span>
                                        ) : (
                                            <button
                                                onClick={() => handleSendRequest(user._id)}
                                                className="bg-black text-white text-sm px-5 py-2 rounded-full font-bold hover:bg-gray-800 transition"
                                            >
                                                + Add Friend
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Pending Requests */}
                        {friendRequests.length > 0 && (
                            <div className="bg-[#BFDBFE] p-8 rounded-[40px] shadow-sm">
                                <h3 className="text-xl font-bold mb-5">
                                    Friend Requests
                                    <span className="ml-2 bg-black text-white text-xs px-3 py-1 rounded-full">{friendRequests.length}</span>
                                </h3>
                                <div className="space-y-3">
                                    {friendRequests.map(req => (
                                        <div key={req._id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={req.name} avatarUrl={req.avatar} size="md" />
                                                <div>
                                                    <p className="font-bold">{req.name}</p>
                                                    <p className="text-xs text-gray-400">{req.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleAccept(req._id)}
                                                    className="bg-black text-white text-sm px-5 py-2 rounded-full font-bold hover:bg-gray-800 transition"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleDecline(req._id)}
                                                    className="bg-gray-100 text-gray-700 text-sm px-5 py-2 rounded-full font-bold hover:bg-red-100 hover:text-red-600 transition"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Friends List */}
                        <div className="bg-white p-8 rounded-[40px] shadow-sm">
                            <h3 className="text-xl font-bold mb-5">
                                My Friends
                                <span className="ml-2 text-gray-400 font-normal text-base">({friends.length})</span>
                            </h3>
                            {loading ? (
                                <p className="text-gray-400 text-center py-8">Loading...</p>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-5xl mb-3">👋</p>
                                    <p className="text-gray-500 font-medium">No friends yet.</p>
                                    <p className="text-gray-400 text-sm mt-1">Search for someone above to get started!</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {friends.map(friend => (
                                        <div key={friend._id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-2xl transition group">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={friend.name} avatarUrl={friend.avatar} size="md" />
                                                <div>
                                                    <p className="font-bold">{friend.name}</p>
                                                    <p className="text-xs text-gray-400">{friend.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => navigate('/group')}
                                                className="opacity-0 group-hover:opacity-100 text-xs bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full font-bold hover:bg-indigo-200 transition"
                                            >
                                                View Groups →
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Stats Panel */}
                    <div className="space-y-6">
                        <div className="bg-[#D9F99D] p-8 rounded-[40px] shadow-sm">
                            <p className="font-bold text-gray-700 text-sm mb-2">Total Friends</p>
                            <h4 className="text-5xl font-bold">{friends.length}</h4>
                        </div>
                        <div className="bg-[#E9D5FF] p-8 rounded-[40px] shadow-sm">
                            <p className="font-bold text-gray-700 text-sm mb-2">Pending Requests</p>
                            <h4 className="text-5xl font-bold">{friendRequests.length}</h4>
                        </div>
                        <div className="bg-white p-8 rounded-[40px] shadow-sm">
                            <h4 className="font-bold mb-3">Quick Tips</h4>
                            <ul className="text-sm text-gray-500 space-y-2">
                                <li>• Search by first name, last name, or email</li>
                                <li>• Once friends, you can be invited to their groups</li>
                                <li>• Go to a Group page to split bills together</li>
                            </ul>
                        </div>
                    </div>

                </div>
            </div>
            <MobileNav />
        </div>
    );
};

export default Friends;
