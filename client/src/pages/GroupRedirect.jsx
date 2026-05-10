import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';

const MyGroups = () => {
    const navigate = useNavigate();
    const token = useSelector((state) => state.auth.token);
    const user = useSelector((state) => state.auth.user);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups`, {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
            setGroups(res.data);
            setLoading(false);
        })
        .catch(err => {
            console.error(err);
            setLoading(false);
        });
    }, [token]);

    if (loading) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    return (
        <div className="flex bg-[#F8F9FD] min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10">
                <Navbar />

                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-bold text-black">My Split Groups</h1>
                        <p className="text-gray-500 text-sm mt-1">All groups you are part of</p>
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-black text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-800 transition"
                    >
                        + New Group
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <div className="text-6xl">💸</div>
                        <h3 className="text-2xl font-bold text-gray-700">No split groups yet</h3>
                        <p className="text-gray-400 text-sm">Create a group or wait to be invited by a friend.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="mt-4 bg-black text-white px-8 py-3 rounded-full font-bold hover:bg-gray-800 transition"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {groups.map(group => {
                            const isAdmin = group.admin?._id === user?._id || group.admin === user?._id;
                            return (
                                <div
                                    key={group._id}
                                    onClick={() => navigate(`/group/${group._id}`)}
                                    className="bg-white p-6 rounded-[32px] shadow-sm hover:shadow-md cursor-pointer transition border border-transparent hover:border-indigo-100 hover:-translate-y-1"
                                >
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center text-2xl font-bold text-indigo-700">
                                            {group.groupName?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg">{group.groupName}</h3>
                                            <p className="text-xs text-gray-400">
                                                {group.members?.length || 1} member{group.members?.length !== 1 ? 's' : ''}
                                                {isAdmin && <span className="ml-2 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">Admin</span>}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {group.members?.slice(0, 4).map(m => (
                                            <div key={m._id} className="w-8 h-8 bg-indigo-200 rounded-full flex items-center justify-center text-xs font-bold text-indigo-700" title={m.name}>
                                                {m.name?.[0]?.toUpperCase()}
                                            </div>
                                        ))}
                                        {group.members?.length > 4 && (
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-500">
                                                +{group.members.length - 4}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-400">Admin: {group.admin?.name || 'Unknown'}</span>
                                        <span className="text-indigo-500 font-bold">View →</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                <Footer />
            </div>
            <MobileNav />
        </div>
    );
};

export default MyGroups;
