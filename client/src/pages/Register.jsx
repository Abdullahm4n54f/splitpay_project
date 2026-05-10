import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/splitpay.png';

const Register = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleRegister = (e) => {
        e.preventDefault();
        setError('');

        // Simple validation
        if (!name || !email || !password) {
            setError("Please fill in all fields");
            return;
        }

        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/register`, { name, email, password })
            .then(() => {
                alert("Account created! Now please login.");
                navigate('/login');
            })
            .catch(err => {
                setError(err.response?.data?.message || "Registration failed");
            });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            <div className="p-10 bg-white rounded-[40px] shadow-2xl w-96 border border-gray-100">
                <div className="flex justify-center mb-2">
                    <img src={logo} alt="SplitPay" className="w-48 object-contain" />
                </div>
                <p className="text-gray-500 text-center mb-8 text-sm">Start splitting bills easily</p>
                
                {error && <div className="bg-red-100 text-red-700 p-3 rounded-2xl mb-4 text-xs font-bold text-center">{error}</div>}

                <form onSubmit={handleRegister} className="flex flex-col gap-4">
                    <input 
                        className="border-none p-4 rounded-full px-6 bg-gray-100 focus:ring-2 focus:ring-black outline-none" 
                        placeholder="Full Name" 
                        onChange={e => setName(e.target.value)} 
                    />
                    <input 
                        className="border-none p-4 rounded-full px-6 bg-gray-100 focus:ring-2 focus:ring-black outline-none" 
                        placeholder="Email Address" 
                        onChange={e => setEmail(e.target.value)} 
                    />
                    <input 
                        className="border-none p-4 rounded-full px-6 bg-gray-100 focus:ring-2 focus:ring-black outline-none" 
                        type="password" 
                        placeholder="Password" 
                        onChange={e => setPassword(e.target.value)} 
                    />
                    <button className="bg-black text-white p-4 rounded-full font-bold mt-4 shadow-lg hover:bg-gray-800 transition">
                        Create Account
                    </button>
                </form>
                
                <p className="mt-6 text-center text-sm text-gray-600">
                    Already have an account? <Link to="/login" className="font-bold text-black underline">Login</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;