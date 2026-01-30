import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, MapPin, Search, LocateFixed, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
const BASE_URL = import.meta.env.BASE_URL

// Leaflet Icon Fix
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const CATEGORIES = [
    "General Store", "Pharmacy", "Restaurant/Cafe", "Hotel/Lodge", "ATM/Bank",
    "Hospital/Clinic", "Electronics", "Clothing", "Hardware/Repair", "Other"
];

const AddShopPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        name: '',
        category: 'General Store',
        location: '',
        status: 'OPEN',
        openTime: '09:00',
        closeTime: '22:00',
        latitude: null,
        longitude: null
    });
    const [searchQuery, setSearchQuery] = useState('');
    const [isLocating, setIsLocating] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const LocationPicker = () => {
        useMapEvents({
            click(e) { updateLocation(e.latlng.lat, e.latlng.lng); },
        });
        return formData.latitude ? <Marker position={[formData.latitude, formData.longitude]} /> : null;
    };

    const ChangeView = ({ center }) => {
        const map = useMap();
        useEffect(() => { if (center[0]) map.setView(center, 16); }, [center]);
        return null;
    };

    const updateLocation = async (lat, lng) => {
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        try {
            // Optimistic update for UI feel
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await res.json();
            if (data.display_name) {
                // Shorten address for cleaner UI
                const shortAddr = data.display_name.split(',').slice(0, 3).join(',');
                setFormData(prev => ({ ...prev, location: shortAddr }));
            }
        } catch (err) { console.error(err); }
    };

    const getUserLocation = () => {
        setIsLocating(true);
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    updateLocation(pos.coords.latitude, pos.coords.longitude);
                    setIsLocating(false);
                },
                () => {
                    alert("Could not access GPS. Please search dynamically.");
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${searchQuery}`);
            const data = await res.json();
            if (data.length > 0) {
                updateLocation(parseFloat(data[0].lat), parseFloat(data[0].lon));
            } else {
                alert("Place not found. Try a different query.");
            }
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        getUserLocation();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const submissionData = {
            name: formData.name,
            category: formData.category,
            location: formData.location || "Custom Location",
            status: formData.status,
            openTime: formData.openTime,
            closeTime: formData.closeTime,
            coordinates: {
                type: 'Point',
                coordinates: [Number(formData.longitude), Number(formData.latitude)]
            }
        };

        try {
            const res = await fetch('https://isshopopen.onrender.com/api/shops', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(submissionData)
            });

            if (res.ok) {
                // Show immediate success feedback then redirect
                navigate('/');
            } else {
                const error = await res.json();
                alert(`Error: ${error.message}`);
            }
        } catch (err) {
            alert("Connection failed. Is the server running?");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            {/* Header with Back Button */}
            <div className="bg-white border-b sticky top-0 z-30 shadow-sm px-4 py-3 flex items-center justify-between">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 px-3 py-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="font-bold text-sm">Back</span>
                </button>
                <h1 className="text-lg font-bold text-gray-800">Add New Place</h1>
                <div className="w-16" /> {/* Spacer balance */}
            </div>

            <main className="max-w-2xl mx-auto px-4 mt-6 space-y-6">

                {/* 1. Map & Search Section */}
                <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wide">1. Locate the Place</label>

                    <div className="flex shadow-sm rounded-xl overflow-hidden border border-gray-200">
                        <input
                            className="flex-1 p-3.5 bg-white focus:outline-none"
                            placeholder="Search area (e.g. Ongole Bus Stand)"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch} className="bg-gray-50 px-5 border-l hover:bg-gray-100 transition-colors">
                            <Search className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>

                    <div className="h-72 w-full rounded-2xl overflow-hidden shadow-lg border-2 border-white relative z-0">
                        {formData.latitude ? (
                            <MapContainer center={[formData.latitude, formData.longitude]} zoom={16} style={{ height: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                <LocationPicker />
                                <ChangeView center={[formData.latitude, formData.longitude]} />
                            </MapContainer>
                        ) : (
                            <div className="h-full bg-gray-200 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                                <LocateFixed className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm font-medium">Acquiring GPS...</p>
                            </div>
                        )}

                        <button
                            onClick={getUserLocation}
                            className="absolute bottom-4 right-4 z-[1000] bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-50 active:scale-95 transition-all"
                            title="Use my current location"
                        >
                            <LocateFixed className={isLocating ? "animate-spin text-emerald-600" : ""} />
                        </button>
                    </div>

                    {formData.location && (
                        <div className="flex items-start gap-2 text-xs text-gray-500 bg-white p-3 rounded-lg border">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-600" />
                            {formData.location}
                        </div>
                    )}
                </div>

                {/* 2. Details Form */}
                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <label className="text-sm font-bold text-gray-500 uppercase tracking-wide block">2. Details</label>

                    <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Place Name</label>
                            <input
                                required
                                className="w-full p-3.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                placeholder="e.g. Siva Tiffins"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                            <div className="relative">
                                <select
                                    className="w-full p-3.5 border border-gray-200 rounded-xl appearance-none bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                >
                                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Standard Hours</label>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Opens At</label>
                                <input
                                    type="time"
                                    className="w-full p-3 border rounded-xl"
                                    value={formData.openTime}
                                    onChange={e => setFormData({ ...formData, openTime: e.target.value })}
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 mb-1 block">Closes At</label>
                                <input
                                    type="time"
                                    className="w-full p-3 border rounded-xl"
                                    value={formData.closeTime}
                                    onChange={e => setFormData({ ...formData, closeTime: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Status Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Current Status</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'OPEN' })}
                                className={`p-3 rounded-xl border font-bold transition-all ${formData.status === 'OPEN'
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                Open Now
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, status: 'CLOSED' })}
                                className={`p-3 rounded-xl border font-bold transition-all ${formData.status === 'CLOSED'
                                    ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20'
                                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                                    }`}
                            >
                                Closed
                            </button>
                        </div>
                    </div>


                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            disabled={!formData.latitude || isSubmitting}
                            className="flex-[2] py-4 bg-black text-white rounded-xl font-bold hover:bg-emerald-600 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-5 h-5" />
                                    Add Place Now
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </main>
        </div >
    );
};

export default AddShopPage;
