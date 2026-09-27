'use client';
import { useMemo } from 'react';
import { Warehouse } from 'lucide-react';
import { getStageRank } from '../_lib/helpers';
import OrderLevelCard from './levels/OrderLevelCard';
import StyleLevelCard from './levels/StyleLevelCard';
import PieceTravelerCard from './levels/PieceTravelerCard';

/**
 * HierarchyViewer Component
 *
 * The central right-hand viewport of the Orders Explorer.
 * Coordinates and renders the 3-tier hierarchical stack:
 *   - Level 1: Client and Production Order summary
 *   - Level 2: Style specification, completion stats, and piece list
 *   - Level 3: Individual Piece Traveler journey and sequential stage history
 *
 * @param {Object} props
 * @param {Object|null} props.activeItem - Currently selected tree node (`{ type: 'order'|'style'|'piece', data, parentGroup }`).
 * @param {Object} props.orderTrees - Cache of fetched order tree structures keyed by raw order ID.
 * @param {Object} props.styleDetails - Cache of style details keyed by style ID.
 * @param {string|null} props.selectedPieceCode - Currently inspected piece code.
 * @param {Object|null} props.pieceDetail - Fetched piece traveler detail payload.
 * @param {Function} props.onSelectPiece - Handler to select/inspect a specific piece code.
 * @param {boolean} props.loadingPiece - Loading indicator for piece detail fetch.
 * @param {boolean} props.canDeleteStages - Whether the viewer may delete stage entries (DM · MD).
 * @param {Function} props.onDeleteStage - Opens the delete dialog for one stage entry.
 * @returns {JSX.Element} Hierarchical response viewer.
 */
export default function HierarchyViewer({
  activeItem,
  orderTrees,
  styleDetails,
  selectedPieceCode,
  pieceDetail,
  onSelectPiece,
  loadingPiece,
  canDeleteStages,
  onDeleteStage,
}) {
  // Chronologically sort stage history (Leather Cutting -> Lining Cutting -> ... -> Packaging).
  // Must run before the early return below — hooks can't be conditional.
  const stages = pieceDetail?.stages;
  const sortedStages = useMemo(() => {
    if (!Array.isArray(stages)) return [];
    return [...stages].sort((a, b) => getStageRank(a) - getStageRank(b));
  }, [stages]);

  // Empty State: Prompt user to select an order from the sidebar
  if (!activeItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-center py-16 animate-fade-in">
        <Warehouse className="w-10 h-10 text-slate-300 mb-2" />
        <p className="font-black text-slate-400 text-base">Select a Client / Order</p>
        <p className="text-slate-400/60 text-xs mt-1">
          Click an order group on the left to start exploring.
        </p>
      </div>
    );
  }

  const group = activeItem.type === 'order' ? activeItem.data : activeItem.parentGroup;
  const treeData = group ? orderTrees[group.rawId] : null;

  const style = activeItem.type === 'style' ? activeItem.data : null;
  const sDetail = style ? styleDetails[style.style_id || style.id] : null;

  return (
    <div className="space-y-6 pb-20">
      {/* LEVEL 1: Client / Order Data Card */}
      {group && <OrderLevelCard group={group} treeData={treeData} />}

      {/* LEVEL 2: Style Data Card */}
      {style && (
        <StyleLevelCard
          style={style}
          sDetail={sDetail}
          selectedPieceCode={selectedPieceCode}
          onSelectPiece={onSelectPiece}
        />
      )}

      {/* LEVEL 3: Piece Traveler Data Card */}
      {selectedPieceCode && (
        <PieceTravelerCard
          selectedPieceCode={selectedPieceCode}
          loadingPiece={loadingPiece}
          pieceDetail={pieceDetail}
          sortedStages={sortedStages}
          onClose={() => onSelectPiece(null)}
          canDeleteStages={canDeleteStages}
          onDeleteStage={onDeleteStage}
        />
      )}
    </div>
  );
}
