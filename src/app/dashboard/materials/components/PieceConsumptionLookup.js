'use client';
import { useState } from 'react';
import { Scissors, Search, Loader2, PackageCheck } from 'lucide-react';
import { useLazyGetPieceConsumptionQuery } from '@/store/slices/materialApiSlice';

export function PieceConsumptionLookup({ showToast }) {
    const [pieceIdInput, setPieceIdInput] = useState('');
    const [searchedId, setSearchedId] = useState('');
    const [triggerGetConsumption, { data: consumptionData, isLoading, isError, error }] = useLazyGetPieceConsumptionQuery();

    const handleSearch = async (e) => {
        e.preventDefault();
        const cleaned = pieceIdInput.trim();
        if (!cleaned) return;
        setSearchedId(cleaned);
        try {
            await triggerGetConsumption(cleaned).unwrap();
        } catch (err) {
            // Error handled by RTK query state
        }
    };

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4 mt-6" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <div className="flex items-center gap-2 mb-2">
                <Scissors className="w-5 h-5 text-amber-600" />
                <div>
                    <h3 className="text-lg font-black text-slate-800">Piece Leather Consumption (Hide-by-Hide)</h3>
                    <p className="text-xs font-medium text-slate-400">Lookup what exact leather hides &amp; sqft/dcm quantity a garment piece consumed.</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={pieceIdInput}
                        onChange={(e) => setPieceIdInput(e.target.value)}
                        placeholder="Scan or enter Piece ID (e.g. PIECE-104 or UUID)"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs font-bold font-mono bg-slate-50 focus:outline-none focus:border-amber-500"
                        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    />
                </div>
                <button type="submit" disabled={isLoading} className="h-10 px-4 rounded-xl text-white font-black text-xs uppercase shadow-sm flex items-center gap-1.5" style={{ background: '#c8834a' }}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackageCheck className="w-4 h-4" />} Fetch Consumption (GET)
                </button>
            </form>

            <div className="pt-2">
                {isLoading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : !searchedId ? (
                    <div className="text-center p-6 text-xs font-bold text-slate-400 border-2 border-dashed rounded-2xl" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        Enter a Piece Barcode or ID to view hide-by-hide consumption breakdown.
                    </div>
                ) : isError ? (
                    <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-red-700 text-xs font-bold">
                        Failed to load consumption for piece <span className="font-mono">{searchedId}</span>: {error?.data?.detail || error?.data?.message || 'Piece consumption record not found.'}
                    </div>
                ) : consumptionData ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-black uppercase text-slate-700">Piece ID: <span className="font-mono text-amber-800">{searchedId}</span></h4>
                            {consumptionData.total_consumed && (
                                <span className="text-xs font-black text-amber-800 bg-amber-100 px-2 py-1 rounded-lg">
                                    Total: {consumptionData.total_consumed} {consumptionData.uom || 'dcm'}
                                </span>
                            )}
                        </div>
                        <pre className="text-xs font-mono text-slate-600 overflow-auto whitespace-pre-wrap max-h-60 bg-white p-3 rounded-lg border border-slate-200">
                            {JSON.stringify(consumptionData, null, 2)}
                        </pre>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
