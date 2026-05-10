import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import GroupPage from './pages/GroupPage';
import GroupRedirect from './pages/GroupRedirect';
import Friends from './pages/Friends';
import Settings from './pages/Settings';

const App = () => {
    const user = useSelector((state) => state.auth.user);

    return (
        <Routes>
            {/* Root redirect */}
            <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

            {/* Auth Routes */}
            <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
            <Route path="/register" element={!user ? <Register /> : <Navigate to="/dashboard" />} />

            {/* Protected Routes */}
            <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/group" element={user ? <GroupRedirect /> : <Navigate to="/login" />} />
            <Route path="/group/:id" element={user ? <GroupPage /> : <Navigate to="/login" />} />
            <Route path="/friends" element={user ? <Friends /> : <Navigate to="/login" />} />
            <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
        </Routes>
    );
};

export default App;