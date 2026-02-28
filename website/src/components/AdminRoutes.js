import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import apiv2 from '../utils/apiv2';
import Loader from './Loader';

export default function AdminRoutes() {
    const [loaded, setLoaded] = useState(false);
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token || token === '') {
            setAuthorized(false);
            setLoaded(true);
            return;
        }

        let mounted = true;
        apiv2.get('/isadmin')
            .then((res) => {
                if (!mounted) return;
                setAuthorized(res?.data?.isAdmin === true);
                setLoaded(true);
            })
            .catch((err) => {
                console.error('Admin verification failed:', err);
                if (!mounted) return;
                setAuthorized(false);
                setLoaded(true);
            });

        return () => {
            mounted = false;
        };
    }, []);

    if (!loaded) {
        return <Loader />;
    }

    return authorized ? <Outlet /> : <Navigate to='/profile' replace />;
}
