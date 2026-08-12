export default function Loading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <div className="flex flex-col items-center text-[#c8834a] animate-pulse">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#c8834a] mb-4" />
        <span className="text-sm font-black tracking-widest uppercase">LOADING ROUTE...</span>
      </div>
    </div>
  );
}
