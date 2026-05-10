import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';
import { setGroupData, setExpenses, addExpenseToStore } from '../redux/groupSlice';
import { generateGroupPDF } from '../utils/generatePDF';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import MobileNav from '../components/MobileNav';
import Footer from '../components/Footer';

const GroupPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const token = useSelector((state) => state.auth.token);
    const currentUser = useSelector((state) => state.auth.user);
    const group = useSelector((state) => state.group.currentGroup);
    const expenses = useSelector((state) => state.group.expenses);

    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [customSplits, setCustomSplits] = useState({});
    const [commentText, setCommentText] = useState('');
    const [addBillError, setAddBillError] = useState('');
    const [balances, setBalances] = useState([]);
    const [replyTo, setReplyTo] = useState(null);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteSearch, setInviteSearch] = useState('');
    const [inviteResults, setInviteResults] = useState([]);
    const [expandedBill, setExpandedBill] = useState(null);
    const [attachmentUrl, setAttachmentUrl] = useState('');

    const headers = { Authorization: `Bearer ${token}` };

    const fetchData = () => {
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${id}`, { headers })
            .then(res => dispatch(setGroupData(res.data)))
            .catch(err => console.log(err));
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/${id}`, { headers })
            .then(res => dispatch(setExpenses(res.data)))
            .catch(err => console.log(err));
        axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${id}/balances`, { headers })
            .then(res => setBalances(res.data))
            .catch(err => console.log(err));
    };

    useEffect(() => {
        if (id) fetchData();
        return () => { dispatch(setGroupData(null)); dispatch(setExpenses([])); };
    }, [id]);

    useEffect(() => {
        if (id) {
            axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${id}/balances`, { headers })
                .then(res => setBalances(res.data)).catch(() => {});
        }
    }, [expenses]);

    // Invite search
    useEffect(() => {
        if (!inviteSearch.trim()) { setInviteResults([]); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/search?q=${encodeURIComponent(inviteSearch)}`, { headers });
                const memberIds = new Set(group?.members?.map(m => m._id) || []);
                const pendingIds = new Set(group?.pendingInvites?.map(m => m._id) || []);
                setInviteResults(res.data.filter(u => !memberIds.has(u._id) && !pendingIds.has(u._id)));
            } catch (err) { console.log(err); }
        }, 400);
        return () => clearTimeout(timer);
    }, [inviteSearch]);

    const isAdmin = group?.admin?._id === currentUser?._id || group?.admin === currentUser?._id;

    // ─── Handlers ────────────────────────────────────────────────────────────

    const handleAddExpense = (e) => {
        e.preventDefault();
        setAddBillError('');
        const totalAmount = Number(amount);
        if (!description || !totalAmount || totalAmount <= 0) {
            setAddBillError("Fill in description and a valid amount.");
            return;
        }
        const members = group.members;
        let formattedSplits = [];
        const hasCustom = Object.values(customSplits).some(v => v > 0);
        if (hasCustom) {
            let check = 0;
            for (const memberId in customSplits) {
                const owed = Number(customSplits[memberId]);
                if (owed > 0) { formattedSplits.push({ user: memberId, amountOwed: owed }); check += owed; }
            }
            if (Math.abs(check - totalAmount) > 0.01) {
                setAddBillError(`Splits (Rs ${check.toFixed(2)}) ≠ total (Rs ${totalAmount.toFixed(2)})`);
                return;
            }
        } else {
            const per = parseFloat((totalAmount / members.length).toFixed(2));
            let rem = totalAmount;
            members.forEach((m, i) => {
                const owed = i === members.length - 1 ? parseFloat(rem.toFixed(2)) : per;
                formattedSplits.push({ user: m._id, amountOwed: owed });
                rem -= per;
            });
        }
        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses`, {
            description, amount: totalAmount, groupId: id, splits: formattedSplits,
            attachment: attachmentUrl || null
        }, { headers })
        .then(res => {
            dispatch(addExpenseToStore(res.data));
            setDescription(''); setAmount(''); setCustomSplits({}); setAttachmentUrl('');
        })
        .catch(err => setAddBillError(err.response?.data?.message || "Failed to add bill."));
    };

    const handleApprove = async (expenseId) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/approve/${expenseId}`, {}, { headers });
            dispatch(setExpenses(expenses.map(e => e._id === expenseId ? res.data : e)));
        } catch (err) { alert(err.response?.data?.message || "Failed to approve"); }
    };

    const handleSettle = async (expenseId, userId) => {
        try {
            const res = await axios.put(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/expenses/settle/${expenseId}`, { userId }, { headers });
            dispatch(setExpenses(expenses.map(e => e._id === expenseId ? res.data : e)));
        } catch (err) { alert(err.response?.data?.message || "Failed to settle"); }
    };

    const handleAddComment = (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/comment`, {
            groupId: id, text: commentText, replyTo: replyTo?.index ?? null
        }, { headers })
        .then(res => { dispatch(setGroupData(res.data)); setCommentText(''); setReplyTo(null); })
        .catch(err => console.log(err));
    };

    const handleInvite = async (userId) => {
        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/invite`, { groupId: id, userId }, { headers });
            dispatch(setGroupData(res.data));
            setInviteResults(prev => prev.filter(u => u._id !== userId));
        } catch (err) { alert(err.response?.data?.message || "Failed to invite"); }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone and will delete all expenses.")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/groups/${id}`, { headers });
            navigate('/dashboard');
        } catch (err) {
            alert(err.response?.data?.message || "Failed to delete group");
        }
    };

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const getProgress = (exp) => {
        if (!exp.splits || exp.splits.length === 0) return 100;
        const settled = exp.settledSplits?.length || 0;
        return Math.round((settled / exp.splits.length) * 100);
    };

    const isSplitSettled = (exp, userId) => {
        return exp.settledSplits?.some(s => (s._id || s) === userId);
    };

    if (!group) return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    const approvedExpenses = expenses.filter(e => e.status === 'approved');
    const pendingExpenses = expenses.filter(e => e.status === 'pending');

    return (
        <>
        <div className="flex bg-slate-50 min-h-screen font-sans">
            <Sidebar />
            <div className="flex-1 p-4 md:p-10 pb-24 md:pb-10">
                <Navbar />

                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-4xl font-bold">{group.groupName}</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            Admin: {group.admin?.name || 'Unknown'}
                            {isAdmin && <span className="bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full ml-1 font-bold">You</span>}
                        </p>
                    </div>
                    <div className="flex gap-3">
                        {isAdmin && (
                            <button onClick={() => setShowInviteModal(true)}
                                className="bg-[#D9F99D] text-black font-bold px-6 py-3 rounded-full hover:bg-[#bef068] transition">
                                + Invite Member
                            </button>
                        )}
                        {isAdmin && (
                            <button onClick={handleDeleteGroup}
                                className="bg-red-100 text-red-700 font-bold px-6 py-3 rounded-full hover:bg-red-200 transition">
                                Delete Group
                            </button>
                        )}
                        <button onClick={() => generateGroupPDF(group.groupName, approvedExpenses, group.members, group.admin)}
                            className="bg-indigo-100 text-indigo-700 font-bold px-6 py-3 rounded-full hover:bg-indigo-200 transition">
                            Export PDF
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

                    {/* LEFT: Bills + Chat */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Pending Bills (admin sees these for approval) */}
                        {isAdmin && pendingExpenses.length > 0 && (
                            <div className="bg-[#FEF3C7] p-8 rounded-[32px] shadow-sm">
                                <h3 className="text-xl font-bold mb-4">
                                    Pending Approval
                                    <span className="ml-2 bg-yellow-500 text-white text-xs px-3 py-1 rounded-full">{pendingExpenses.length}</span>
                                </h3>
                                {pendingExpenses.map(exp => (
                                    <div key={exp._id} className="bg-white p-4 rounded-2xl mb-3 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold">{exp.description}</p>
                                            <p className="text-xs text-gray-400">Submitted by {exp.paidBy?.name || 'someone'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-bold">Rs {Number(exp.amount).toFixed(2)}</p>
                                            <button onClick={() => handleApprove(exp._id)}
                                                className="bg-green-500 text-white text-sm px-4 py-2 rounded-full font-bold hover:bg-green-600">
                                                Approve ✓
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Non-admin sees their pending bills */}
                        {!isAdmin && pendingExpenses.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-[32px]">
                                <p className="text-yellow-700 font-bold text-sm">⏳ You have {pendingExpenses.length} bill(s) waiting for admin approval</p>
                            </div>
                        )}

                        {/* Approved Bills */}
                        <div className="bg-white p-8 rounded-[32px] shadow-sm">
                            <h3 className="text-2xl font-bold mb-6">Split Bills</h3>
                            {approvedExpenses.length === 0 ? (
                                <p className="text-gray-400">No approved bills yet.</p>
                            ) : approvedExpenses.map(exp => {
                                const progress = getProgress(exp);
                                const isExpanded = expandedBill === exp._id;
                                return (
                                    <div key={exp._id} className="mb-4">
                                        <div onClick={() => setExpandedBill(isExpanded ? null : exp._id)}
                                            className="p-4 bg-gray-50 rounded-2xl cursor-pointer hover:bg-gray-100 transition">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                                                    <div>
                                                        <p className="font-bold">{exp.description}</p>
                                                        <p className="text-xs text-gray-400">
                                                            Paid by {exp.paidBy?.name || 'someone'} • {exp.splits?.length || 0} splits
                                                            {exp.attachment && <span className="ml-1">📎</span>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-bold text-lg">Rs {Number(exp.amount).toFixed(2)}</p>
                                                    {progress === 100 ? (
                                                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Done ✓</span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">{progress}% settled</span>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Progress Bar */}
                                            <div className="mt-3 bg-gray-200 rounded-full h-2 overflow-hidden">
                                                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-green-500' : 'bg-indigo-500'}`}
                                                    style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Expanded: Split Details */}
                                        {isExpanded && (
                                            <div className="mt-2 bg-white border border-gray-100 rounded-2xl p-4 space-y-2">
                                                {exp.splits?.map((split, idx) => {
                                                    const settled = isSplitSettled(exp, split.user?._id || split.user);
                                                    return (
                                                        <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold">
                                                                    {split.user?.name?.[0] || '?'}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-sm">{split.user?.name || 'Unknown'}</p>
                                                                    <p className="text-xs text-gray-400">Rs {split.amountOwed.toFixed(2)}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {settled ? (
                                                                    <span className="bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-bold">Settled ✓</span>
                                                                ) : isAdmin ? (
                                                                    <button onClick={(e) => { e.stopPropagation(); handleSettle(exp._id, split.user?._id || split.user); }}
                                                                        className="bg-black text-white text-xs px-4 py-1.5 rounded-full font-bold hover:bg-gray-800">
                                                                        Mark Settled
                                                                    </button>
                                                                ) : (
                                                                    <span className="text-xs text-orange-500 font-bold">Pending</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                {exp.attachment && (
                                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                                        <p className="text-xs font-bold text-gray-500 mb-2">📎 Attachment</p>
                                                        <img src={exp.attachment} alt="Receipt" className="max-h-40 rounded-xl border" onError={(e) => { e.target.style.display = 'none'; }} />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* Chat */}
                        <div className="bg-white p-8 rounded-[32px] shadow-sm">
                            <h3 className="text-2xl font-bold mb-4">Group Chat</h3>
                            <div className="space-y-3 mb-4 max-h-64 overflow-y-auto bg-gray-50 rounded-2xl p-4">
                                {(!group.comments || group.comments.length === 0) ? (
                                    <p className="text-gray-400 text-sm text-center py-4">No messages yet.</p>
                                ) : group.comments.map((c, i) => (
                                    <div key={i} className="group flex gap-2 items-start hover:bg-white p-2 rounded-xl transition">
                                        <div className="w-7 h-7 bg-indigo-200 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold">
                                            {c.user?.name?.[0] || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            {c.replyTo != null && group.comments[c.replyTo] && (
                                                <div className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded mb-1 truncate border-l-2 border-indigo-300">
                                                    ↩ {group.comments[c.replyTo].user?.name}: {group.comments[c.replyTo].text?.slice(0, 50)}
                                                </div>
                                            )}
                                            <span className="font-bold text-sm">{c.user?.name || 'Someone'}: </span>
                                            <span className="text-sm">{c.text}</span>
                                        </div>
                                        <button onClick={() => setReplyTo({ index: i, name: c.user?.name, text: c.text })}
                                            className="opacity-0 group-hover:opacity-100 text-xs text-gray-400 hover:text-indigo-600 flex-shrink-0 mt-1 transition">
                                            Reply
                                        </button>
                                    </div>
                                ))}
                            </div>
                            {replyTo && (
                                <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2 mb-2 text-sm">
                                    <span className="text-indigo-600 font-bold">↩ Replying to {replyTo.name}:</span>
                                    <span className="text-gray-500 truncate flex-1">{replyTo.text?.slice(0, 40)}</span>
                                    <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-red-500 font-bold">✕</button>
                                </div>
                            )}
                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                                    className="flex-1 bg-gray-100 rounded-full px-5 py-3 outline-none" placeholder="Say something..." />
                                <button type="submit" className="bg-black text-white px-6 py-3 rounded-full font-bold hover:bg-gray-800 transition">Send</button>
                            </form>
                        </div>
                    </div>

                    {/* RIGHT: Add Bill + Members */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Add Bill */}
                        <div className="bg-[#d9f99d] p-8 rounded-[32px] shadow-sm">
                            <h3 className="text-2xl font-bold mb-1">Add Bill</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                {isAdmin ? 'Bills you create are auto-approved.' : 'Your bill will need admin approval.'}
                            </p>
                            {addBillError && <div className="bg-red-100 text-red-700 p-3 rounded-2xl mb-4 text-sm font-bold">{addBillError}</div>}
                            <form onSubmit={handleAddExpense} className="space-y-4">
                                <input value={description} onChange={e => setDescription(e.target.value)}
                                    placeholder="Description (e.g. Dinner)" className="w-full rounded-full py-3 px-5 outline-none shadow-sm" />
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
                                    placeholder="Total Amount (Rs)" className="w-full rounded-full py-3 px-5 outline-none shadow-sm" />
                                <input type="url" value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)}
                                    placeholder="Receipt image URL (optional)" className="w-full rounded-full py-3 px-5 outline-none shadow-sm" />
                                {group.members.length > 1 && (
                                    <div className="bg-white bg-opacity-60 p-4 rounded-2xl">
                                        <p className="text-xs font-bold text-gray-600 mb-3">Custom splits (optional):</p>
                                        {group.members.map(m => (
                                            <div key={m._id} className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-sm">{m.name}</span>
                                                <input type="number" min="0" step="0.01" placeholder="0.00"
                                                    onChange={e => setCustomSplits({ ...customSplits, [m._id]: Number(e.target.value) })}
                                                    className="w-24 rounded-lg text-center py-1 px-2 border border-gray-200" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <button type="submit" className="w-full bg-black text-white py-4 rounded-full font-bold hover:bg-gray-800 transition shadow-lg">
                                    {isAdmin ? 'Add Bill' : 'Submit for Approval'}
                                </button>
                            </form>
                        </div>

                        {/* Members */}
                        <div className="bg-white p-8 rounded-[32px] shadow-sm">
                            <h3 className="text-2xl font-bold mb-6">Members ({group.members.length})</h3>
                            <div className="space-y-3">
                                {group.members.map(m => {
                                    const bal = balances.find(b => b.user?._id === m._id);
                                    const net = bal?.net || 0;
                                    return (
                                        <div key={m._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-sm">
                                                    {m.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">
                                                        {m.name}
                                                        {(group.admin?._id === m._id || group.admin === m._id) && (
                                                            <span className="ml-2 bg-yellow-200 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold">Admin</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400">{m.email}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={`font-bold text-sm ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {net > 0 ? `+Rs ${net.toFixed(2)}` : net < 0 ? `-Rs ${Math.abs(net).toFixed(2)}` : 'Settled'}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {group.pendingInvites?.length > 0 && (
                                <div className="mt-6">
                                    <p className="text-sm font-bold text-gray-500 mb-3">Pending Invites</p>
                                    {group.pendingInvites.map(u => (
                                        <div key={u._id} className="flex items-center gap-3 p-2 text-gray-400">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold">{u.name?.[0]}</div>
                                            <span className="text-sm">{u.name} <span className="text-xs">(invited)</span></span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-10 rounded-[40px] shadow-2xl w-[450px] max-h-[80vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-2">Invite to {group.groupName}</h3>
                        <p className="text-gray-500 text-sm mb-6">Search for a user by name or email.</p>
                        <input type="text" value={inviteSearch} onChange={e => setInviteSearch(e.target.value)}
                            placeholder="Search by name or email..."
                            className="w-full bg-gray-100 rounded-2xl px-5 py-3 outline-none mb-4 focus:ring-2 focus:ring-black" />
                        <div className="space-y-3 mb-6">
                            {inviteResults.length === 0 && inviteSearch && <p className="text-gray-400 text-sm text-center py-2">No users found</p>}
                            {inviteResults.map(u => (
                                <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-indigo-200 rounded-full flex items-center justify-center font-bold text-sm">{u.name?.[0]}</div>
                                        <div>
                                            <p className="font-bold text-sm">{u.name}</p>
                                            <p className="text-xs text-gray-400">{u.email}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleInvite(u._id)}
                                        className="bg-black text-white text-sm px-5 py-2 rounded-full font-bold hover:bg-gray-800">Invite</button>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setShowInviteModal(false); setInviteSearch(''); setInviteResults([]); }}
                            className="w-full bg-gray-100 text-gray-700 py-3 rounded-full font-bold hover:bg-gray-200 transition">Close</button>
                    </div>
                </div>
            )}
            <Footer />
            <MobileNav />
        </div>
        </>
    );
};

export default GroupPage;
