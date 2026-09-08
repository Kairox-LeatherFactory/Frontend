'use client';
import { Search, Warehouse, Package, ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import { getPieces } from '../../_lib/helpers';

/**
 * OrdersSidebar Component
 *
 * Left-side interactive navigation tree for exploring factory production orders.
 * Features:
 * - Real-time keyword search across clients, PO numbers, and styles
 * - Expandable Order accordions that dynamically fetch order trees (`/api/v1/analytics/orders/{id}/tree`)
 * - Expandable Style nodes that dynamically fetch style details (`/api/v1/analytics/styles/{id}/detail`)
 * - Selectable piece items with active indicator dots
 *
 * @param {Object} props
 * @param {Array<Object>} props.orderGroups - Filtered/sorted list of order group records.
 * @param {number} props.totalOrdersCount - Total number of visible orders.
 * @param {string} props.searchQuery - Current search filter text.
 * @param {Function} props.setSearchQuery - Search text setter: `(query: string) => void`.
 * @param {Object} props.expandedOrders - Map of expanded order IDs (`{ [id]: boolean }`).
 * @param {Function} props.onToggleOrder - Callback to toggle order expansion: `(group: Object) => void`.
 * @param {Object} props.expandedStyles - Map of expanded style IDs (`{ [id]: boolean }`).
 * @param {Function} props.onToggleStyle - Callback to toggle style expansion: `(style: Object, group: Object) => void`.
 * @param {Object|null} props.activeItem - Active node object selected in the viewer.
 * @param {Function} props.onSelectPieceItem - Handler when a piece item is clicked in the sidebar.
 * @param {string|null} props.selectedPieceCode - Currently selected piece code.
 * @param {Object} props.orderTrees - Cache of fetched order tree objects.
 * @param {Object} props.loadingTree - Map of loading states for order tree fetches.
 * @param {Object} props.styleDetails - Cache of fetched style detail objects.
 * @param {Object} props.loadingStyleDetail - Map of loading states for style detail fetches.
 * @param {Object} props.sidebarRef - Ref attached to sidebar container for smooth scrolling.
 * @param {Object} props.styleRefs - Ref map storing element references for auto-scroll into view.
 * @param {Object} props.glassPanelStyle - Styling object for glassmorphism backdrop.
 * @returns {JSX.Element} Orders exploration navigation sidebar.
 */
export default function OrdersSidebar({
  orderGroups,
  totalOrdersCount,
  searchQuery,
  setSearchQuery,
  expandedOrders,
  onToggleOrder,
  expandedStyles,
  onToggleStyle,
  activeItem,
  onSelectPieceItem,
  selectedPieceCode,
  orderTrees,
  loadingTree,
  styleDetails,
  loadingStyleDetail,
  sidebarRef,
  styleRefs,
  glassPanelStyle,
}) {
  return (
    <div
      ref={sidebarRef}
      className="w-full lg:w-[35%] rounded-2xl p-4 overflow-y-auto flex flex-col gap-1 max-h-[75vh]"
      style={glassPanelStyle}
    >
      {/* Sticky Top Header: Title, Order Count, and Search Bar */}
      <div
        className="sticky top-0 z-10 pb-3 mb-2"
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div className="flex items-center justify-between px-2 mb-2">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Orders Explorer
          </p>
          <span
            className="text-xs font-black px-2.5 py-1 rounded-full"
            style={{
              background: '#faf6f0',
              color: '#a86022',
              border: '1px solid rgba(200, 131, 74, 0.2)',
            }}
          >
            {totalOrdersCount} orders
          </span>
        </div>

        {/* Real-time Search Input Box */}
        <div className="relative flex items-center px-1">
          <Search
            className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10"
            style={{ color: '#9a7a5a' }}
          />
          <input
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg pl-9 pr-3 text-sm font-semibold focus:outline-none transition-colors"
            style={{
              background: '#faf6f0',
              border: '1px solid rgba(200, 131, 74, 0.2)',
              color: '#2d1f0e',
            }}
          />
        </div>
      </div>

      {/* Orders Hierarchical Tree Nodes */}
      {orderGroups.map((group) => {
        const fetchedTree = orderTrees[group.rawId];
        const isTreeLoading = !!loadingTree[group.id];
        const displayStyles =
          fetchedTree?.styles || (group.rawId ? [] : group.styles || []);
        const isOrderActive = activeItem?.data?.id === group.id;

        return (
          <div key={group.id} className="flex flex-col gap-0.5">
            {/* Order Node Row */}
            <div
              data-order-id={group.id}
              onClick={() => onToggleOrder(group)}
              className="flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all duration-200 group"
              style={{
                background: isOrderActive ? 'rgba(200, 131, 74, 0.1)' : 'transparent',
                border: isOrderActive
                  ? '1px solid rgba(200, 131, 74, 0.2)'
                  : '1px solid transparent',
              }}
            >
              {expandedOrders[group.id] ? (
                <ChevronDown className="w-4 h-4 text-[#c8834a] shrink-0" />
              ) : (
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 transition-colors" />
              )}
              <Warehouse className="w-4 h-4 text-[#c8834a] shrink-0" />
              <span
                className={`font-bold text-sm truncate select-none ${
                  isOrderActive
                    ? 'text-[#2d1f0e]'
                    : 'text-slate-600 group-hover:text-slate-800'
                } transition-colors`}
              >
                {group.id}
              </span>
              {isTreeLoading && (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a] ml-auto" />
              )}
            </div>

            {/* Expanded Styles Under this Order */}
            {expandedOrders[group.id] && (
              <div className="pl-5 flex flex-col gap-0.5 ml-3 border-l border-slate-200/50 mt-0.5">
                {isTreeLoading ? (
                  <div className="flex items-center gap-2 p-2.5 text-xs text-slate-400 font-bold animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a]" />
                    <span>Loading minted styles…</span>
                  </div>
                ) : displayStyles.length === 0 ? (
                  <span className="text-xs text-slate-400 p-2 italic">
                    No minted styles found
                  </span>
                ) : (
                  displayStyles.map((style, sIdx) => {
                    const styleId = style.style_id || style.id || `style-${sIdx}`;
                    const styleName =
                      style.style_name ||
                      style.style ||
                      style.style_code ||
                      'Unknown Style';
                    const isStyleActive = activeItem?.data?.style_id === styleId;

                    return (
                      <div
                        key={styleId}
                        className="flex flex-col gap-0.5"
                        ref={(el) => (styleRefs.current[styleId] = el)}
                      >
                        {/* Style Node Row */}
                        <div
                          onClick={() => onToggleStyle(style, group)}
                          className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-all duration-200 group"
                          style={{
                            background: isStyleActive
                              ? 'rgba(255, 255, 255, 0.8)'
                              : 'transparent',
                            border: isStyleActive
                              ? '1px solid #c8834a'
                              : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-2 truncate">
                            {expandedStyles[styleId] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />
                            ) : (
                              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors" />
                            )}
                            <Package className="w-3.5 h-3.5 text-amber-500/80 shrink-0" />
                            <span className="font-semibold text-xs truncate text-slate-700">
                              {styleName}
                            </span>
                          </div>
                          {loadingStyleDetail[styleId] && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#c8834a] shrink-0" />
                          )}
                        </div>

                        {/* Pieces list nested under expanded style */}
                        {expandedStyles[styleId] && styleDetails[styleId] && (
                          <div className="pl-4 flex flex-col gap-0.5 ml-3 border-l border-amber-200/60 mt-0.5">
                            {getPieces(styleDetails[styleId]).length === 0 && (
                              <span className="text-xs text-slate-400 p-2 italic">
                                No pieces found
                              </span>
                            )}
                            {getPieces(styleDetails[styleId]).map((piece) => {
                              const pieceCode =
                                piece.bundle_id || piece.piece_code || piece.piece_id;
                              const isActivePiece = selectedPieceCode === pieceCode;

                              return (
                                <div
                                  key={pieceCode}
                                  onClick={() => onSelectPieceItem(piece, style, group)}
                                  className="flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all duration-150 group"
                                  style={{
                                    background: isActivePiece
                                      ? 'rgba(16, 185, 129, 0.08)'
                                      : 'transparent',
                                    border: isActivePiece
                                      ? '1px solid rgba(16, 185, 129, 0.3)'
                                      : '1px solid transparent',
                                  }}
                                >
                                  <span
                                    className="w-1.5 h-1.5 rounded-full shrink-0"
                                    style={{
                                      background: isActivePiece ? '#10b981' : '#cbd5e1',
                                    }}
                                  />
                                  <span
                                    className={`text-xs font-mono truncate ${
                                      isActivePiece
                                        ? 'text-emerald-700 font-bold'
                                        : 'text-slate-500 group-hover:text-slate-700'
                                    }`}
                                  >
                                    {pieceCode}
                                  </span>
                                  <span
                                    className="ml-auto text-[10px] font-bold shrink-0"
                                    style={{ color: '#c8834a' }}
                                  >
                                    #{piece.seq}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
