import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, ShieldCheck, AlertCircle, Globe } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '../lib/utils';
import homeBanner from '../assets/home_banner.png'; // Reuse banner for consistency
const BASE_URL = import.meta.env.BASE_URL
const ShopDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    // 1. Try to load from State (Fastest)
    const [shop, setShop] = useState(location.state?.shop || null);
    const [loading, setLoading] = useState(!location.state?.shop);
    const [updating, setUpdating] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!shop) {
            fetchShop(); // Only fetch if we didn't receive data via state
        }
    }, [id]);

    const fetchShop = async () => {
        try {
            setLoading(true);
            const res = await fetch(`https://isshopopen.onrender.com/api/shops/${id}`);
            if (!res.ok) {
                if (res.status === 404) throw new Error('Shop not found in database');
                throw new Error('Failed to fetch details');
            }
            const data = await res.json();
            setShop(data);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (status) => {
        setUpdating(true);
        // Optimistic Update
        const prevShop = { ...shop };
        setShop({ ...shop, status, lastStatusUpdate: new Date().toISOString(), lastReportedBy: 'COMMUNITY' });

        try {
            const res = await fetch(`https://isshopopen.onrender.com/api/shops/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, source: 'COMMUNITY' })
            });

            if (!res.ok) {
                // If 404, it might be an external shop that needs to be CREATED first
                // For MVP, we'll just alert the user. 
                // In V2, we would upsert (create-if-missing) here.
                throw new Error('Cannot update status for this external shop yet.');
            }

            const updatedShop = await res.json();
            setShop(updatedShop);

            // Redirect to home after 1 second to let user see "Successful" state or just immediate
            navigate('/');
        } catch (err) {
            console.error("Update failed", err);
            setShop(prevShop); // Rollback
            alert("Note: Updating status for external/demo data is not supported in this version.");
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        </div>
    );

    if (error || !shop) return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
            <AlertCircle className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Shop Not Found</h2>
            <p className="text-gray-500 mb-6">
                {error === 'Shop details not available for external data yet'
                    ? "This looks like an external shop. Please search again from the Home Page to view it."
                    : error || "This shop may have been removed."}
            </p>
            <button onClick={() => navigate('/')} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">
                Return Home
            </button>
        </div>
    );

    // --- TIMING LOGIC ---
    const isCurrentlyOpen = (openStr, closeStr) => {
        if (!openStr || !closeStr) return false;
        try {
            const now = new Date();
            const current = now.getHours() * 60 + now.getMinutes();

            const [openH, openM] = openStr.split(':').map(Number);
            const [closeH, closeM] = closeStr.split(':').map(Number);

            const open = openH * 60 + openM;
            const close = closeH * 60 + closeM;

            if (close < open) { // Overnight
                return current >= open || current < close;
            } else {
                return current >= open && current < close;
            }
        } catch (e) { return false; }
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    let statusDisplay = shop.status;
    let timingLabel = null;

    if (shop.status === 'UNCERTAIN' && shop.openTime && shop.closeTime) {
        if (isCurrentlyOpen(shop.openTime, shop.closeTime)) {
            statusDisplay = 'OPEN_NOW';
            timingLabel = `Open until ${formatTime(shop.closeTime)}`;
        } else {
            statusDisplay = 'CLOSED_NOW';
            timingLabel = `Closed (Opens ${formatTime(shop.openTime)})`;
        }
    }

    const isOpen = statusDisplay === 'OPEN' || statusDisplay === 'OPEN_NOW';
    const isUncertain = statusDisplay === 'UNCERTAIN';
    const isExternal = shop.source === 'Google' || shop.source === 'OSM' || shop.source === 'MOCK_DATA';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Header */}
            <div className="relative h-64 md:h-80 w-full overflow-hidden">
                <img src={homeBanner} alt="City" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50" />
                <div className="absolute top-6 left-6">
                    <button onClick={() => navigate('/')} className="flex items-center text-white/90 hover:text-white bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm transition-all">
                        <ArrowLeft className="w-5 h-5 mr-1" /> Back to Map
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12 text-white">
                    <div className="max-w-7xl mx-auto">
                        <span className={cn("inline-block px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4 shadow-sm backdrop-blur-md",
                            isOpen ? "bg-emerald-500/90 text-white" : isUncertain ? "bg-gray-500/90 text-white" : "bg-red-500/90 text-white"
                        )}>
                            {isOpen ? "Open Now" : isUncertain ? "Status Unknown" : "Closed"}
                        </span>

                        {(shop.reportCount || 0) > 0 && !isExternal && (
                            <span className="inline-block ml-3 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-4 shadow-sm backdrop-blur-md bg-white/20 text-white border border-white/20">
                                👥 {shop.reportCount} Verified Reports
                            </span>
                        )}
                        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 text-shadow-lg">{shop.name}</h1>
                        <p className="text-white/80 text-xl font-medium flex items-center gap-2">
                            {shop.category}
                            {isExternal && <span className="text-xs bg-blue-500/80 px-2 py-0.5 rounded text-white border border-blue-400/50">External Data</span>}
                        </p>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto -mt-8 px-4 relative z-10 pb-20">
                <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100 flex flex-col md:flex-row gap-12">
                    {/* Left Column: Info */}
                    <div className="flex-1 space-y-8">
                        <div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Location</h3>
                            <div className="flex items-start gap-3 text-gray-700 font-medium text-lg bg-gray-50 p-4 rounded-2xl">
                                <MapPin className="w-6 h-6 text-emerald-600 mt-0.5 shrink-0" />
                                {shop.location}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Status Info</h3>
                            <div className="flex items-center gap-3 text-gray-600 bg-gray-50 p-4 rounded-2xl">
                                {isOpen ? <ShieldCheck className="w-5 h-5 text-emerald-500" /> : <Clock className="w-5 h-5 text-gray-400" />}
                                <div>
                                    <p className="font-semibold text-gray-900">
                                        {timingLabel || (isExternal ? "Live Estimate" : "Community Verified")}
                                    </p>
                                    <p className="text-sm">
                                        {isExternal ? shop.staticHours :
                                            timingLabel ? "Based on standard hours" :
                                                (shop.lastStatusUpdate && !isNaN(new Date(shop.lastStatusUpdate).getTime())) ?
                                                    `Updated ${formatDistanceToNow(new Date(shop.lastStatusUpdate), { addSuffix: true })} by ${shop.lastReportedBy?.toLowerCase()}` :
                                                    "Status recently updated"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {shop.openTime && shop.closeTime && (
                            <div>
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-3">Standard Hours</h3>
                                <div className="flex items-center gap-3 text-gray-700 bg-gray-50 p-4 rounded-2xl font-medium">
                                    <Clock className="w-5 h-5 text-gray-400" />
                                    {formatTime(shop.openTime)} - {formatTime(shop.closeTime)}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Actions */}
                    <div className="flex-1 border-l border-gray-100 pl-0 md:pl-12 pt-8 md:pt-0">
                        <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 text-center">
                            Is this inaccurate?
                        </h3>

                        <div className="grid grid-cols-1 gap-4">
                            <button
                                onClick={() => handleUpdateStatus('OPEN')}
                                disabled={updating}
                                className="group relative w-full p-4 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-100 transition-all text-left overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-emerald-600 shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="text-xl font-bold">✓</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-emerald-900">Report as OPEN</p>
                                        <p className="text-xs text-emerald-700/70 font-medium">I'm here and it's open</p>
                                    </div>
                                </div>
                            </button>

                            <button
                                onClick={() => handleUpdateStatus('CLOSED')}
                                disabled={updating}
                                className="group relative w-full p-4 rounded-2xl bg-red-50 hover:bg-red-100 border-2 border-red-100 transition-all text-left overflow-hidden"
                            >
                                <div className="relative z-10 flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm group-hover:scale-110 transition-transform">
                                        <span className="text-xl font-bold">✕</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-red-900">Report as CLOSED</p>
                                        <p className="text-xs text-red-700/70 font-medium">It's currently shut</p>
                                    </div>
                                </div>
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-6 max-w-xs mx-auto">
                            Updating status helps the whole community save time!
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ShopDetailPage;
