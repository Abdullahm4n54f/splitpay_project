import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../redux/authSlice';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/splitpay.png';

const Navbar = () => {
    const user = useSelector((state) => state.auth.user);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <div className="flex justify-between items-center bg-white p-4 md:p-6 rounded-[24px] md:rounded-[32px] shadow-sm mb-6 md:mb-8">
            {/* Logo visible only on mobile (sidebar hidden) */}
            <div className="flex items-center gap-3">
                <img src={logo} alt="SplitPay" className="h-8 object-contain md:hidden" />
                <h2 className="text-lg md:text-2xl font-bold text-black">
                    Hello, {user ? user.name : "Guest"}!
                </h2>
            </div>

            <div className="flex items-center gap-3 md:gap-5">
                <img
                    src={user?.avatar || "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png"}
                    alt="Profile"
                    className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-200 shadow-sm"
                />
                <button
                    onClick={handleLogout}
                    className="bg-gray-100 text-black px-4 md:px-6 py-2 md:py-3 rounded-full font-semibold text-sm md:text-base hover:bg-red-100 hover:text-red-600 transition"
                >
                    Logout
                </button>
            </div>
        </div>
    );
};

export default Navbar;