import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
    const user = useSelector((state) => state.auth.user);
    const token = useSelector((state) => state.auth.token);
    const navigate = useNavigate();

    const [showModal, setShowModal] = useState(false);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [groups, setGroups] = useState([]);
    const [pendingInvites, setPendingInvites] = useState([]);
    const [financials, setFinancials] = useState({ owe: 0, owed: 0, balance: 0 });
    const [friends, setFriends] = useState([]);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        axios.get('http://localhost:5000/api/groups', { headers })
            .then(async (res) => {
                setGroups(res.data);
                let totalOwe = 0, totalOwed = 0;
                try {
                    const expPromises = res.data.map(g =>
                        axios.get(`http://localhost:5000/api/expenses/${g._id}`, { headers })
                    );
                    const expResponses = await Promise.all(expPromises);
                    expResponses.forEach(r => {
                        r.data.forEach(exp => {
                            if (exp.status !== 'approved') return;
                            const paidById = String(exp.paidBy?._id || exp.paidBy);
                            const myId = String(user?._id);
                            const userPaid = paidById === myId;
                            const settledIds = new Set((exp.settledSplits || []).map(s => String(s._id || s)));

                            if (userPaid) {
                                // If I paid the bill, sum up what everyone else still owes me.
                                // We skip anyone who has already settled their share.
                                (exp.splits || []).forEach(split => {
                                    const splitUserId = String(split.user?._id || split.user);
                                    if (splitUserId !== myId && !settledIds.has(splitUserId)) {
                                        totalOwed += split.amountOwed;
                                    }
                                });
                            } else {
                                // Someone else paid — I owe my split (if not settled)
                                const mySplit = exp.splits?.find(s => String(s.user?._id || s.user) === myId);
                                if (mySplit && !settledIds.has(myId)) {
                                    totalOwe += mySplit.amountOwed;
                                }
                            }
                        });
                    });
                    setFinancials({ owe: totalOwe, owed: totalOwed, balance: totalOwed - totalOwe });
                } catch (e) { console.log(e); }
            })
            .catch(err => console.log(err));

        axios.get('http://localhost:5000/api/groups/my-invites', { headers })
            .then(res => setPendingInvites(res.data))
            .catch(err => console.log(err));

        axios.get('http://localhost:5000/api/users/friends', { headers })
            .then(res => setFriends(res.data.friends || []))
            .catch(err => console.log(err));

    }, [token, showModal, user?._id]);

    const handleCreateGroup = (e) => {
        e.preventDefault();
        setErrorMsg('');
        if (!newGroupName) { setErrorMsg("Please enter a name for the split group"); return; }

        axios.post('http://localhost:5000/api/groups', { groupName: newGroupName, members: [] }, { headers })
        .then((res) => {
            setShowModal(false);
            setNewGroupName('');
            navigate(`/group/${res.data._id}`);
        })
        .catch((err) => setErrorMsg(err.response?.data?.message || "Failed to create split group."));
    };

    const handleAcceptInvite = async (groupId) => {
        try {
            await axios.post('http://localhost:5000/api/groups/accept-invite', { groupId }, { headers });
            setPendingInvites(prev => prev.filter(g => g._id !== groupId));
            navigate(`/group/${groupId}`);
        } catch (err) { console.log(err); }
    };

    const handleDeclineInvite = async (groupId) => {
        try {
            await axios.post('http://localhost:5000/api/groups/decline-invite', { groupId }, { headers });
            setPendingInvites(prev => prev.filter(g => g._id !== groupId));
        } catch (err) { console.log(err); }
    };

    return (
        <div className="flex bg-[#F8F9FD] min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10 relative">
                <Navbar />

                {/* Hero */}
                <div className="mb-6 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
                    <div>
                        <h1 className="text-2xl md:text-4xl font-bold text-black mb-1 md:mb-2">Split the bills!</h1>
                        <p className="text-gray-500 text-sm md:text-base max-w-md">Track your splits and settle debts with zero awkwardness.</p>
                    </div>
                    <button onClick={() => setShowModal(true)}
                        className="bg-black text-white px-6 md:px-8 py-3 md:py-4 rounded-full font-bold text-sm md:text-base shadow-xl hover:bg-gray-800 transition transform hover:-translate-y-1 w-full md:w-auto">
                        + Make a New Split Group
                    </button>
                </div>

                {/* Pending Invites */}
                {pendingInvites.length > 0 && (
                    <div className="bg-[#BFDBFE] p-6 rounded-[32px] shadow-sm mb-8">
                        <h3 className="text-lg font-bold mb-4">
                            Split Group Invites
                            <span className="ml-2 bg-black text-white text-xs px-3 py-1 rounded-full">{pendingInvites.length}</span>
                        </h3>
                        <div className="space-y-3">
                            {pendingInvites.map(g => (
                                <div key={g._id} className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm">
                                    <div>
                                        <p className="font-bold">{g.groupName}</p>
                                        <p className="text-xs text-gray-400">Invited by {g.admin?.name || 'someone'} • {g.members?.length || 1} members</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleAcceptInvite(g._id)}
                                            className="bg-black text-white text-sm px-5 py-2 rounded-full font-bold hover:bg-gray-800">Accept</button>
                                        <button onClick={() => handleDeclineInvite(g._id)}
                                            className="bg-gray-100 text-gray-700 text-sm px-5 py-2 rounded-full font-bold hover:bg-red-100 hover:text-red-600">Decline</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                    <div className="bg-[#BFDBFE] p-8 rounded-[40px] shadow-sm col-span-1 md:col-span-2">
                        <p className="text-gray-700 font-medium mb-1 text-sm">Net Balance</p>
                        <h3 className="text-5xl font-bold text-black mb-10">${financials.balance.toFixed(2)}</h3>
                        <div className="flex gap-4">
                            <button onClick={() => setShowModal(true)} className="bg-black text-white px-6 py-2 rounded-full font-bold text-sm hover:bg-gray-800">Make a New Split</button>
                            <button onClick={() => setShowRequestModal(true)} className="bg-white text-black px-6 py-2 rounded-full font-bold text-sm border border-gray-200 hover:bg-gray-50">Request</button>
                        </div>
                    </div>
                    <div className="bg-[#D9F99D] p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
                        <p className="font-bold text-black">You are owed</p>
                        <h4 className="text-3xl font-bold text-green-700">+${financials.owed.toFixed(2)}</h4>
                    </div>
                    <div className="bg-[#E9D5FF] p-8 rounded-[40px] shadow-sm flex flex-col justify-between">
                        <p className="font-bold text-black">You owe</p>
                        <h4 className="text-3xl font-bold text-red-600">-${financials.owe.toFixed(2)}</h4>
                    </div>
                </div>

                {/* Groups + Friends */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white p-8 rounded-[40px] shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold">My Splits</h3>
                            <button onClick={() => setShowModal(true)} className="text-sm font-bold text-gray-400 hover:text-black">+ New Split</button>
                        </div>
                        <div className="space-y-4">
                            {groups.length === 0 ? (
                                <p className="text-gray-500 py-4">No split groups yet. Create one to get started!</p>
                            ) : groups.map(group => (
                                <div key={group._id} onClick={() => navigate(`/group/${group._id}`)}
                                    className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-2xl cursor-pointer transition border border-transparent hover:border-gray-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl font-bold text-indigo-700">
                                            {group.groupName?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold">{group.groupName}</p>
                                            <p className="text-xs text-gray-400">
                                                {group.members?.length || 1} members
                                                {group.admin?._id === user?._id && <span className="ml-1 text-yellow-600">• Admin</span>}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-gray-400 text-sm">→</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm">
                        <h3 className="text-2xl font-bold mb-6">Friends</h3>
                        <div className="flex flex-wrap gap-4">
                            {friends.length === 0 ? (
                                <p className="text-gray-400 text-sm">Go to the <span onClick={() => navigate('/friends')} className="text-indigo-600 cursor-pointer font-bold">Friends page</span> to add people!</p>
                            ) : friends.slice(0, 6).map(friend => (
                                <div key={friend._id} onClick={() => navigate('/friends')} className="flex flex-col items-center gap-2 cursor-pointer group">
                                    <div className="w-14 h-14 bg-indigo-100 rounded-full border-2 border-white shadow-md group-hover:scale-110 transition flex items-center justify-center font-bold text-indigo-700">
                                        {friend.name?.[0]?.toUpperCase()}
                                    </div>
                                    <p className="text-xs font-bold group-hover:text-indigo-500">{friend.name?.split(' ')[0]}</p>
                                </div>
                            ))}
                            <div onClick={() => navigate('/friends')} className="w-14 h-14 bg-black rounded-full flex items-center justify-center text-white text-2xl cursor-pointer hover:bg-gray-800 transition">+</div>
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-8 bg-gray-900 p-8 rounded-[40px] shadow-lg flex flex-col justify-center relative overflow-hidden">
                    <div className="absolute top-[-50px] right-[-50px] w-64 h-64 bg-gray-800 rounded-full opacity-50"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h3 className="text-3xl font-bold text-white mb-2">You're doing great!</h3>
                            <p className="text-gray-400">{groups.length} active splits • {friends.length} friends</p>
                        </div>
                        <button onClick={() => navigate('/group')} className="bg-[#D9F99D] text-black px-8 py-3 rounded-full font-bold shadow-md hover:bg-[#bef068] transition">
                            View Splits
                        </button>
                    </div>
                </div>

                {/* Create Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-[400px]">
                            <h3 className="text-3xl font-bold mb-2 text-black">Create a Split Group</h3>
                            <p className="text-gray-500 mb-8 text-sm">Start a new shared expense tracker.</p>
                            {errorMsg && <div className="bg-red-100 text-red-700 p-3 rounded-2xl mb-4 text-sm font-bold">{errorMsg}</div>}
                            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
                                <input type="text" placeholder="Split Group Name (e.g., Lahore Trip)"
                                    className="border-none bg-gray-100 p-4 rounded-full px-6 focus:ring-2 focus:ring-black outline-none font-medium"
                                    value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
                                <div className="flex gap-4 mt-6">
                                    <button type="button" onClick={() => setShowModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-800 p-4 rounded-full font-bold hover:bg-gray-200 transition">Cancel</button>
                                    <button type="submit"
                                        className="flex-1 bg-black text-white p-4 rounded-full font-bold hover:bg-gray-800 transition shadow-lg">Create</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Request Modal */}
                {showRequestModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
                        <div className="bg-white p-10 rounded-[40px] shadow-2xl w-[420px]">
                            <h3 className="text-3xl font-bold mb-2 text-black">Request Payment</h3>
                            <p className="text-gray-500 mb-8 text-sm">Choose a split group to request payments from.</p>
                            {groups.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No split groups yet.</p>
                            ) : (
                                <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
                                    {groups.map(g => (
                                        <div key={g._id} onClick={() => { setShowRequestModal(false); navigate(`/group/${g._id}`); }}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-indigo-50 cursor-pointer transition">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-bold text-indigo-700 text-sm">
                                                    {g.groupName?.[0]?.toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{g.groupName}</p>
                                                    <p className="text-xs text-gray-400">{g.members?.length || 1} members</p>
                                                </div>
                                            </div>
                                            <span className="text-gray-400">→</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            <div className="flex gap-4">
                                <button onClick={() => setShowRequestModal(false)}
                                    className="flex-1 bg-gray-100 text-gray-800 p-4 rounded-full font-bold hover:bg-gray-200 transition">Close</button>
                                <button onClick={() => { setShowRequestModal(false); setShowModal(true); }}
                                    className="flex-1 bg-black text-white p-4 rounded-full font-bold hover:bg-gray-800 transition shadow-lg">+ New Split</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <MobileNav />
        </div>
    );
};

export default Dashboard;