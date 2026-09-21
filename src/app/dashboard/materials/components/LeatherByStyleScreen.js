'use client';
import { useState } from 'react';
import { Shirt, Search, Loader2 } from 'lucide-react';
import { useGetLeatherByStyleQuery } from '@/store/slices/materialApiSlice';
import { useGetWageStylesQuery } from '@/store/slices/apiSlice';

export function LeatherByStyleScreen({ showToast }) {
    const [styleSearch, setStyleSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const { data: wageStylesData } = useGetWageStylesQuery();
    const availableStyles = Array.isArray(wageStylesData) ? wageStylesData : wageStylesData?.styles || wageStylesData?.items || [];

    const { data: styleData, isLoading, isFetching } = useGetLeatherByStyleQuery(
        { style_id: debouncedSearch },
        { skip: !debouncedSearch }
    );

    const handleSearch = (e) => {
        e.preventDefault();
        setDebouncedSearch(styleSearch);
    };

    const handleSelectStyle = (e) => {
        const val = e.target.value;
        setStyleSearch(val);
        setDebouncedSearch(val);
    };

    return (
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <div className="flex items-center gap-2 mb-4">
                <Shirt className="w-5 h-5 text-amber-600" />
                <h3 className="text-lg font-black text-slate-800">Leather Stock by Style</h3>
            </div>
            
            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                {availableStyles.length > 0 && (
                    <div className="sm:w-64">
                        <select
                            onChange={handleSelectStyle}
                            value={styleSearch}
                            className="w-full h-10 px-3 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:border-amber-500"
                            style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                        >
                            <option value="">Select Existing Style...</option>
                            {availableStyles.map((s, idx) => {
                                const id = s.style_id || s.id || s.style_code;
                                const name = s.style_name || s.style_code || s.style || id;
                                return (
                                    <option key={id || idx} value={id}>
                                        {name} {id !== name ? `(${id})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                )}

                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        value={styleSearch}
                        onChange={(e) => setStyleSearch(e.target.value)}
                        placeholder="Or enter Style ID / Code (e.g. 3b64e1b7... or BOMBER-01)"
                        className="w-full h-10 pl-9 pr-3 rounded-xl border text-sm font-bold bg-slate-50 focus:outline-none focus:border-amber-500 font-mono"
                        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    />
                </div>

                <button type="submit" className="h-10 px-4 rounded-xl text-white font-black text-xs uppercase shadow-sm" style={{ background: '#c8834a' }}>
                    Check Stock (GET)
                </button>
            </form>

            <div className="pt-4">
                {(isLoading || isFetching) ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    </div>
                ) : !debouncedSearch ? (
                    <div className="text-center p-8 text-sm font-bold text-slate-400 border-2 border-dashed rounded-2xl" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        Select or enter a Style ID above to see required leather and available stock.
                    </div>
                ) : styleData ? (
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Stock Data for Style: <span className="font-mono text-amber-700">{debouncedSearch}</span></h4>
                        <pre className="text-xs font-mono text-slate-600 overflow-auto whitespace-pre-wrap">
                            {JSON.stringify(styleData, null, 2)}
                        </pre>
                    </div>
                ) : (
                    <div className="text-center p-8 text-sm font-bold text-slate-400 border-2 border-dashed rounded-2xl" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        No stock data found for Style ID: <span className="font-mono">{debouncedSearch}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
