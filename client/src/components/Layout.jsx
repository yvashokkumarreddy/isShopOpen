import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { Clock } from 'lucide-react';

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
            <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="relative">
                            <Clock className="w-6 h-6 text-emerald-600" />
                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-gray-900">
                            Open<span className="text-emerald-600">Now</span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <Link
                            to="/"
                            className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors hidden sm:block"
                        >
                            Explore Map
                        </Link>
                        {/* Check Status could link to home or a specific status page, keeping it Home for now with intention */}
                        <Link
                            to="/"
                            className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors hidden sm:block"
                        >
                            Check Status
                        </Link>
                        <Link
                            to="/add"
                            className="text-sm font-bold text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl hover:bg-emerald-100 transition-all shadow-sm border border-emerald-100"
                        >
                            Find & Add Place
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 py-6">
                <Outlet />
            </main>

            <footer className="py-6 text-center text-xs text-gray-400">
                <p>Real-time availability by the community.</p>
            </footer>
        </div>
    );
};

export default Layout;
