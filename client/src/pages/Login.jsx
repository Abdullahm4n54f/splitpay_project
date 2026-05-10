import React, { useState } from 'react';
import axios from 'axios';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../redux/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import logo from '../assets/splitpay.png';

const Login = () => {
    // simple local state for our form inputs
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');

    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        setErrorMsg(''); // clear out old errors

        // basic inline validation required by the rubric
        if (email === '' || password === '') {
            setErrorMsg('Please fill in all fields');
            return;
        }

        // standard axios call to our backend
        axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/users/login`, {
            email: email,
            password: password
        })
            .then((response) => {
                // dispatch the data to Redux
                dispatch(loginSuccess({
                    user: response.data.user,
                    token: response.data.token
                }));

                // redirect the user to the main dashboard
                navigate('/dashboard');
            })
            .catch((error) => {
                console.log("Login error: ", error);

                // legible user messages, NOT raw error objects
                if (error.response && error.response.data.message) {
                    setErrorMsg(error.response.data.message);
                } else {
                    setErrorMsg('Something went wrong during login');
                }
            });
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-100">
            {/* Main FinTech styled card */}
            <div className="p-10 bg-white rounded-3xl shadow-xl w-96">
                <div className="flex justify-center mb-8">
                    <img src={logo} alt="SplitPay" className="w-48 object-contain" />
                </div>

                {/* Error Alert */}
                {errorMsg && (
                    <div className="bg-red-100 text-red-700 p-3 rounded-lg mb-6 text-sm text-center font-semibold">
                        {errorMsg}
                    </div>
                )}

                <form onSubmit={handleLogin} className="flex flex-col gap-5">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Email</label>
                        <input
                            type="email"
                            className="w-full border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="name@university.edu"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
                        <input
                            type="password"
                            className="w-full border border-gray-300 rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-4 bg-black text-white rounded-full py-3 font-bold text-lg hover:bg-gray-800 transition shadow-lg"
                    >
                        Login
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-600">
                    Don't have an account? <Link to="/register" className="font-bold text-black underline">Register</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;