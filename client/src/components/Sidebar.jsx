import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import logo from '../assets/splitpay.png';

const Sidebar = () => {
    const location = useLocation();

    return (
        <div className="w-64 bg-indigo-200 min-h-screen p-6 rounded-r-[40px] hidden md:block">
            <div className="flex items-center justify-center mb-12 mt-4">
                <img src={logo} alt="SplitPay" className="w-full object-contain" />
            </div>

            <nav className="flex flex-col gap-4">
                <Link 
                    to="/dashboard" 
                    className={`px-5 py-4 rounded-full font-semibold transition ${location.pathname === '/dashboard' ? 'bg-black text-white shadow-xl' : 'text-gray-800 hover:bg-indigo-300'}`}
                >
                    Home
                </Link>
                
                <Link 
                    to="/group" 
                    className={`px-5 py-4 rounded-full font-semibold transition ${location.pathname.startsWith('/group') ? 'bg-black text-white shadow-xl' : 'text-gray-800 hover:bg-indigo-300'}`}
                >
                    Splits
                </Link>

                <Link 
                    to="/friends" 
                    className={`px-5 py-4 rounded-full font-semibold transition ${location.pathname === '/friends' ? 'bg-black text-white shadow-xl' : 'text-gray-800 hover:bg-indigo-300'}`}
                >
                    Friends
                </Link>
                
                <Link 
                    to="/settings" 
                    className={`px-5 py-4 rounded-full font-semibold transition ${location.pathname === '/settings' ? 'bg-black text-white shadow-xl' : 'text-gray-800 hover:bg-indigo-300'}`}
                >
                    Settings
                </Link>
            </nav>
        </div>
    );
};

export default Sidebar;