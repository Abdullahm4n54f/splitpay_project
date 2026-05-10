import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';

const GroupRedirect = () => {
    const navigate = useNavigate();
    const token = useSelector((state) => state.auth.token);

    useEffect(() => {
        axios.get('http://localhost:5000/api/groups', {
            headers: { Authorization: `Bearer ${token}` }
        })
        .then(res => {
            if (res.data.length > 0) {
                navigate(`/group/${res.data[0]._id}`);
            } else {
                navigate('/dashboard');
            }
        })
        .catch(err => {
            console.error(err);
            navigate('/dashboard');
        });
    }, [navigate, token]);

    return (
        <div className="flex justify-center items-center h-screen bg-slate-50">
            <h2 className="text-2xl font-bold">Loading your groups...</h2>
        </div>
    );
};

export default GroupRedirect;
