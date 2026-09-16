'use client';
export default function DynamicDataViewer({ data }) {
  if (!data)
    return (
      <div className="text-slate-400 italic text-center p-4">
        No data available
      </div>
    );

  if (typeof data === "string") {
    return (
      <div className="p-4 text-slate-700 bg-slate-50 rounded-xl">{data}</div>
    );
  }

  if (data.clients && typeof data.clients === "object") {
    const clientsData = Object.entries(data.clients);

    return (
      <div className="space-y-6">
        {clientsData.map(([clientName, details]) => (
          <div
            key={clientName}
            className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4"
          >
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-xs font-black uppercase text-amber-700 bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                Sheet / Client: {clientName}
              </span>
              <span className="text-xs font-bold text-slate-500">
                Warnings:{" "}
                <strong className="text-emerald-600">
                  {details.warnings?.length || 0}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Order Lines
                </p>
                <p className="text-lg font-black text-slate-800">
                  {details.order_lines}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Pieces Ordered
                </p>
                <p className="text-lg font-black text-amber-600">
                  {details.pieces_ordered?.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  Styles Count
                </p>
                <p className="text-lg font-black text-slate-800">
                  {details.styles?.length || 0}
                </p>
              </div>
            </div>

            {details.styles && details.styles.length > 0 && (
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Detected Styles
                </h4>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex flex-wrap gap-2">
                    {details.styles.map((style, idx) => (
                      <span
                        key={idx}
                        className="text-xs font-bold bg-white text-slate-700 px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
                      >
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  let tableRows = Array.isArray(data)
    ? data
    : typeof data === "object"
      ? Object.values(data).find(Array.isArray) || [data]
      : [];

  if (tableRows.length === 0)
    return (
      <div className="text-slate-400 italic text-center p-4">
        No records found
      </div>
    );

  const keys = Array.from(
    new Set(
      tableRows.flatMap((row) =>
        row && typeof row === "object" ? Object.keys(row) : [],
      ),
    ),
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
      <table className="min-w-full text-left text-xs bg-white">
        <thead className="bg-slate-100 text-slate-700 font-black uppercase tracking-wider">
          <tr>
            {keys.map((k) => (
              <th
                key={k}
                className="px-4 py-3 border-b border-slate-200 whitespace-nowrap"
              >
                {String(k).replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {tableRows.map((row, i) => (
            <tr key={i} className="hover:bg-slate-50 transition-colors">
              {keys.map((k) => {
                const val = row ? row[k] : "-";
                return (
                  <td
                    key={k}
                    className="px-4 py-2.5 text-slate-700 font-medium whitespace-nowrap"
                  >
                    {typeof val === "object" && val !== null
                      ? JSON.stringify(val)
                      : String(val ?? "-")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}