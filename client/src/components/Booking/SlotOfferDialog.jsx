import React, { useState, useEffect } from 'react';

const SlotOfferDialog = ({ offer, onAccept, onDecline, onClose }) => {
    const [timeLeft, setTimeLeft] = useState(0);

    useEffect(() => {
        if (!offer) return;

        const expiresAt = new Date(offer.expiresAt).getTime();

        const updateTimer = () => {
            const now = new Date().getTime();
            const difference = expiresAt - now;

            if (difference <= 0) {
                setTimeLeft(0);
                onDecline(); // Auto-decline if time runs out
            } else {
                setTimeLeft(Math.floor(difference / 1000));
            }
        };

        updateTimer();
        const timer = setInterval(updateTimer, 1000);

        return () => clearInterval(timer);
    }, [offer, onDecline]);

    if (!offer) return null;

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-slide-up border border-indigo-100 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-4 text-emerald-600 dark:text-emerald-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h2 className="text-2xl font-bold">Slot Available!</h2>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-6">
                    A slot is now available for you at <span className="font-semibold text-gray-900 dark:text-white">{offer.stationName}</span>.
                </p>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Assigned Slot</span>
                        <span className="font-semibold text-indigo-600 dark:text-indigo-400">{offer.slotName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Time to Accept</span>
                        <span className={`font-mono font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                            {minutes}:{seconds.toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onDecline}
                        className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-xl transition-colors"
                    >
                        Decline
                    </button>
                    <button
                        onClick={onAccept}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-transform active:scale-95"
                    >
                        Accept Slot
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SlotOfferDialog;
