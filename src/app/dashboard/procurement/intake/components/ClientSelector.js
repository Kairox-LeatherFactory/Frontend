import {
    Loader2,
    Play,
    UserCheck,
} from 'lucide-react';

export default function ClientSelector({
    submissionId,
    activeClient,
    selectedClientId,
    setSelectedClientId,
    clients,
    clientsLoading,
    clientsFetching,
    isOpeningSubmission,
    promptConfirmation,
    showConfirmModal,
    pendingClient,
    setShowConfirmModal,
    confirmInitializeSubmission,
}) {
    return (
        <>
            {/* Client Header + Dropdown */}
            <div
                className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-5 rounded-2xl border"
                style={{
                    background: 'rgba(250,246,240,0.5)',
                    borderColor: 'rgba(200,131,74,.15)',
                }}
            >
                <div>
                    <p
                        className="text-sm font-medium"
                        style={{
                            color: '#9a7a5a',
                        }}
                    >
                        {submissionId ? (
                            <>
                                Active Client:{' '}
                                <strong className="text-[#c8834a]">
                                    {activeClient?.name}
                                </strong>

                                {' · '}

                                Submission ID:{' '}
                                <span className="font-mono text-xs text-[#c8834a]">
                                    {submissionId}
                                </span>
                            </>
                        ) : (
                            'Select client and click Initialize Submission to start.'
                        )}
                    </p>
                </div>

                {/* Client Dropdown */}
                <div className="w-full md:w-80">
                    <label
                        className="text-[10px] font-black uppercase tracking-wider block mb-1"
                        style={{
                            color: '#9a7a5a',
                        }}
                    >
                        Select Client to Initialize Submission
                    </label>

                    <div className="flex gap-2">
                        <select
                            value={selectedClientId}
                            onChange={(event) => {
                                const value = event.target.value;

                                setSelectedClientId(value);

                                promptConfirmation(value);
                            }}
                            disabled={
                                clientsLoading ||
                                clientsFetching ||
                                isOpeningSubmission
                            }
                            className="flex-1 p-2.5 rounded-xl border text-xs font-bold bg-[#faf6f0] text-[#c8834a] outline-none cursor-pointer disabled:opacity-50"
                            style={{
                                borderColor: 'rgba(200,131,74,.3)',
                            }}
                        >
                            <option value="" disabled>
                                -- Select Client --
                            </option>

                            {clients.map((client) => {
                                const clientId =
                                    client.id ||
                                    client._id ||
                                    client.client_id;

                                return (
                                    <option
                                        key={clientId}
                                        value={clientId}
                                    >
                                        {client.name}{' '}
                                        (
                                        {client.code ||
                                            client.country ||
                                            'Client'}
                                        )
                                    </option>
                                );
                            })}
                        </select>

                        <button
                            type="button"
                            onClick={() =>
                                promptConfirmation(selectedClientId)
                            }
                            disabled={
                                !selectedClientId ||
                                isOpeningSubmission
                            }
                            className="px-3.5 py-2.5 rounded-xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] transition-all shrink-0 flex items-center gap-1.5 disabled:opacity-40"
                        >
                            {isOpeningSubmission ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Play className="w-3.5 h-3.5 fill-current" />
                            )}

                            <span>
                                Initialize
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && pendingClient && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100">

                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 rounded-2xl bg-amber-50 text-[#c8834a]">
                                <UserCheck className="w-6 h-6" />
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-[#c8834a]">
                                    Start New Order
                                </h3>

                                <p className="text-xs text-slate-500 font-medium">
                                    Create a new workspace for this client
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-2xl bg-[#faf6f0] border border-amber-200/60 my-4 text-xs">
                            <p className="font-bold text-[#c8834a]">
                                Are you sure you want to start a new order for:
                            </p>

                            <p className="text-base font-black text-[#c8834a] mt-1">
                                {pendingClient.name}
                            </p>
                        </div>

                        <div className="flex justify-end gap-2 mt-2">
                            <button
                                type="button"
                                onClick={() => setShowConfirmModal(false)}
                                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={confirmInitializeSubmission}
                                disabled={isOpeningSubmission}
                                className="px-4 py-2 rounded-xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] disabled:opacity-50 flex items-center gap-2"
                            >
                                {isOpeningSubmission && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                )}

                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}