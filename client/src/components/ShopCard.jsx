import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn, calculateDistance } from '../lib/utils';
import { motion } from 'framer-motion';

const ShopCard = ({ shop, userLocation }) => {
    if (!shop) return null;

    // Determine status logic including timings
    let statusDisplay = shop.status;
    let timingLabel = null;

    // Helper to check if current time is within range
    const isCurrentlyOpen = (openStr, closeStr) => {
        if (!openStr || !closeStr) return false;
        try {
            const now = new Date();
            const current = now.getHours() * 60 + now.getMinutes();

            const [openH, openM] = openStr.split(':').map(Number);
            const [closeH, closeM] = closeStr.split(':').map(Number);

            const open = openH * 60 + openM;
            const close = closeH * 60 + closeM;

            if (close < open) { // Overnight (e.g. 10 PM to 2 AM)
                return current >= open || current < close;
            } else {
                return current >= open && current < close;
            }
        } catch (e) { return false; }
    };

    // Helper to format time for display (09:00 -> 9:00 AM)
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [h, m] = timeStr.split(':');
        const hour = parseInt(h);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    };

    // If status is UNCERTAIN (or expired), try to use schedule
    if (shop.status === 'UNCERTAIN' && shop.openTime && shop.closeTime) {
        if (isCurrentlyOpen(shop.openTime, shop.closeTime)) {
            statusDisplay = 'OPEN_NOW'; // Virtual status for display
            timingLabel = `Open (Closes ${formatTime(shop.closeTime)})`;
        } else {
            statusDisplay = 'CLOSED_NOW';
            timingLabel = `Closed (Opens ${formatTime(shop.openTime)})`;
        }
    }

    // Map internal status to UI
    const isOpen = statusDisplay === 'OPEN' || statusDisplay === 'OPEN_NOW';
    const isUncertain = statusDisplay === 'UNCERTAIN';

    // Styling
    const statusColor = isOpen ? 'bg-emerald-500' : isUncertain ? 'bg-gray-400' : 'bg-red-500';
    const statusText = isOpen ? 'Open' : isUncertain ? 'Uncertain' : 'Closed';
    const cardBorder = isOpen ? 'border-emerald-100' : 'border-gray-100';
    const shadow = isOpen ? 'shadow-emerald-100/50' : 'shadow-gray-100';

    let distance = null;
    if (userLocation && shop.coordinates && shop.coordinates.coordinates) {
        // shop.coordinates.coordinates is [lng, lat]
        distance = calculateDistance(
            userLocation.lat,
            userLocation.lng,
            shop.coordinates.coordinates[1],
            shop.coordinates.coordinates[0]
        );
    }

    return (
        <Link to={`/shop/${shop._id}`} state={{ shop }}>
            <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn("bg-white rounded-2xl p-5 border shadow-sm transition-all relative overflow-hidden", cardBorder, shadow)}
            >
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <h3 className="font-bold text-lg text-gray-900 leading-tight">{shop.name}</h3>
                        <p className="text-sm text-gray-500 font-medium">{shop.category}</p>
                    </div>
                    <div className={cn("px-3 py-1 rounded-full text-xs font-bold text-white flex items-center gap-1.5 shadow-sm", statusColor)}>
                        {isOpen && <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />}
                        {statusText}
                    </div>
                </div>

                <div className="space-y-2 mt-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-2 flex-1 min-w-0 mr-2">
                            <MapPin className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{shop.location}</span>
                        </div>
                        {distance && (
                            <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md shrink-0">
                                {distance} km
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                        {/* 1. Report/Reaction Count */}
                        {(shop.reportCount || 0) > 0 && shop.source !== 'Google' && shop.source !== 'OSM' && (
                            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100 bg-gray-50/50">
                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                <span>{shop.reportCount} {shop.reportCount === 1 ? 'Reaction' : 'Reactions'}</span>
                            </div>
                        )}

                        {/* 2. Timing/Status Badge */}
                        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
                            <Clock className="w-3.5 h-3.5" />
                            <span>
                                {timingLabel ? (
                                    <span className={isOpen ? "text-emerald-600 font-bold" : "text-gray-500 font-medium"}>
                                        {timingLabel}
                                    </span>
                                ) : (
                                    shop.source === 'Google' || shop.source === 'OSM' ? (
                                        <span className="text-emerald-600 font-medium">Live Status</span>
                                    ) : (shop.lastStatusUpdate && !isNaN(new Date(shop.lastStatusUpdate).getTime())) ? (
                                        <>Status Updated {formatDistanceToNow(new Date(shop.lastStatusUpdate), { addSuffix: true })}</>
                                    ) : (
                                        shop.staticHours || "Hours not listed"
                                    )
                                )}
                            </span>
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
};

export default ShopCard;
