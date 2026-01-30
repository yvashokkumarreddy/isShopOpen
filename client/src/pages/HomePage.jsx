import React, { useState, useEffect, useCallback } from 'react';
import { Search, MapPin, Navigation, Store, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import ShopCard from '../components/ShopCard';
import homeBanner from '../assets/home_banner.png';
const BASE_URL = import.meta.env.BASE_URL
const HomePage = () => {
    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [locating, setLocating] = useState(true);
    const [filterStatus, setFilterStatus] = useState('ALL'); // 'ALL', 'OPEN', 'CLOSED'
    const [showAll, setShowAll] = useState(false); // New state for "Show All" toggle

    // 1. DYNAMIC LOCATION WATCHER (Ensures Ongole accuracy)
    useEffect(() => {
        let watchId;
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newCoords = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(newCoords);
                    setLocating(false);
                },
                (error) => {
                    console.error("GPS Access Denied:", error);
                    setLocating(false);
                },
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } else {
            setLocating(false);
        }
        return () => watchId && navigator.geolocation.clearWatch(watchId);
    }, []);

    // 2. HYBRID FETCH (Local DB + External Fallback)
    const fetchShops = useCallback(async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            setLoading(true);
            

            const queryParams = new URLSearchParams();
            if (searchTerm) queryParams.append('search', searchTerm);

            // Logic: If 'showAll' is true, send 'all=true'. Otherwise use location if available.
            if (showAll) {
                queryParams.append('all', 'true');
            } else if (userLocation) {
                queryParams.append('lat', userLocation.lat);
                queryParams.append('lng', userLocation.lng);
            }

            // 1. Fetch Local (Fast)
            const localRes = await fetch(`https://isshopopen.onrender.com/api/shops?${queryParams.toString()}`);
            const communityShops = localRes.ok ? await localRes.json() : [];

            // 2. Fetch External with a Deadline (Only if not in "Show All" mode which is local-focused basically, or we can allow global too?)
            // For now, let's keep external fetch only if we have location and not 'showAll' explicitly? 
            // Actually, external APIs usually require location. If showAll is on, we might skip external or just use last known loc.
            // Let's keep it simple: if showAll, we just show local DB dump.
            let globalShops = [];
            if (!showAll && userLocation) {
                try {
                    const externalRes = await fetch(
                        `https://isshopopen.onrender.com/api/external/google?lat=${userLocation.lat}&lng=${userLocation.lng}`,
                        { signal: controller.signal }
                    );
                    if (externalRes.ok) globalShops = await externalRes.json();
                } catch (e) {
                    console.log("External API was too slow, skipping...");
                }
            }

            // Limit total combined shops to 50
            setShops([...communityShops, ...globalShops].slice(0, 100));
            clearTimeout(timeoutId);
        } catch (err) {
            console.error("Fetch failed", err);
        } finally {
            setLoading(false);
        }
    }, [searchTerm, userLocation, showAll]);

    // Only fetch initially on mount or when locating finishes, but NOT on every location update
    // This respects the user's wish for "manual refresh only" after initial load
    useEffect(() => {
        if (!locating && shops.length === 0) {
            fetchShops();
        }
    }, [locating]); // Removed userLocation and fetchShops to stop auto-spam

    // Check for showAll changes to refetch
    useEffect(() => {
        fetchShops();
    }, [showAll]);

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            <header className="relative w-full h-64 md:h-96 rounded-[2.5rem] overflow-hidden shadow-2xl mt-2">
                <img src={homeBanner} alt="Banner" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col items-center justify-center text-center p-6">
                    <h1 className="text-4xl md:text-6xl font-black text-white">
                        Is it open <span className="text-emerald-400 font-outline-2">right now?</span>
                    </h1>
                    <p className="text-gray-200 text-lg md:text-xl mt-2 font-medium">
                        Live crowd-sourced status for Ongole.
                    </p>
                </div>
            </header>

            {/* Dynamic Search Bar */}
            <div className="relative max-w-2xl mx-auto -mt-10 z-10">
                <div className="flex bg-white rounded-2xl shadow-2xl p-2 border ring-8 ring-black/5">
                    <div className="flex items-center flex-1 px-4">
                        <Search className="w-5 h-5 text-emerald-500 mr-2" />
                        <input
                            type="text"
                            placeholder="Search pharmacy, ATM, general store..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchShops()}
                            className="w-full py-1 focus:outline-none text-gray-700 bg-transparent"
                        />
                    </div>
                    <button onClick={fetchShops} className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-emerald-700 transition-all">
                        Search
                    </button>
                </div>
                <div className="mt-4 flex justify-center">
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-white rounded-full border shadow-sm">
                        <Navigation className={`w-3 h-3 ${locating ? 'animate-spin text-amber-500' : 'text-emerald-500'}`} />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                            {locating ? 'Syncing GPS...' : userLocation ? 'Ongole Live Tracking' : 'Static Mode'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Results Grid */}
            <main id="shop-list" className="pt-4">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                            <Store className="w-6 h-6 text-emerald-600" />
                            {showAll ? 'All Database Shops' : 'Explore Nearby'}
                        </h2>
                        <button
                            onClick={() => setShowAll(!showAll)}
                            className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${showAll ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
                        >
                            {showAll ? 'Show Nearby Only' : 'Show All Shops'}
                        </button>
                    </div>

                    <div className="flex items-center">
                        <button
                            onClick={fetchShops}
                            className="ml-2 p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-full transition-colors focus:outline-none"
                            title="Refresh Shops"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                    {!loading && (
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-100 uppercase">
                                {shops.filter(s => s.source === 'COMMUNITY').length} Verified
                            </span>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full border border-blue-100 uppercase">
                                {shops.filter(s => s.source !== 'COMMUNITY').length} Global
                            </span>
                        </div>
                    )}
                </div>



                {/* Filter Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                    {['ALL', 'OPEN', 'CLOSED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-6 py-2 rounded-full font-bold text-sm transition-all whitespace-nowrap ${filterStatus === status
                                ? 'bg-black text-white shadow-lg scale-105'
                                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {status === 'ALL' ? 'All Places' : status === 'OPEN' ? 'Open Now' : 'Closed'}
                        </button>
                    ))}
                </div>

                {
                    loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-64 bg-gray-100 rounded-3xl animate-pulse shadow-inner" />
                            ))}
                        </div>
                    ) : shops.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed">
                            <Globe className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 font-bold text-xl">No shops found here yet.</p>
                            <p className="text-gray-400 text-sm">Be the first to add a place in this area!</p>
                            <button onClick={() => window.location.href = '/add'} className="mt-6 bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg">
                                + Add Local Shop
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {shops
                                .filter(shop => {
                                    // Helper: Check if shop is open based on time
                                    const isTimeOpen = (s) => {
                                        if (!s.openTime || !s.closeTime) return false;
                                        try {
                                            const now = new Date();
                                            const current = now.getHours() * 60 + now.getMinutes();
                                            const [oh, om] = s.openTime.split(':').map(Number);
                                            const [ch, cm] = s.closeTime.split(':').map(Number);
                                            const open = oh * 60 + om;
                                            const close = ch * 60 + cm;
                                            return close < open ? (current >= open || current < close) : (current >= open && current < close);
                                        } catch { return false; }
                                    };

                                    const isOpen = shop.status === 'OPEN' || (shop.status === 'UNCERTAIN' && isTimeOpen(shop));

                                    if (filterStatus === 'ALL') return true;
                                    if (filterStatus === 'OPEN') return isOpen;
                                    if (filterStatus === 'CLOSED') return !isOpen;
                                    return true;
                                })
                                .map(shop => (
                                    <ShopCard key={shop._id} shop={shop} userLocation={userLocation} />
                                ))}
                        </div>
                    )
                }
            </main >
        </div >
    );
};

export default HomePage;
