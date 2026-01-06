// client/src/components/FloorMapModal.js - DRAG & DROP WITH PERSISTENCE & AUTO-ORGANIZATION
import React, { useState, useMemo, useEffect, useCallback } from "react";
import { X, ChevronDown, Layers, MapPin, Info, Package, Search, ArrowLeft, User, Building, CheckCircle, RotateCcw, Navigation, RefreshCw, ScanLine, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { gpsToSvgCoordinates } from '../utils/gpsMapping';
import { useConfirmDialog } from "./useConfirmDialog";

// Room definitions for 1F (First Floor)
const ROOMS_1F = [
  // Left side - Bottom to Top
  { id: "101", name: "試料測定室", coordinates: "10,180 75,180 75,290 10,290", category: "office オフィス" },
  { id: "102", name: "廊下", coordinates: "10,100 75,100 75,175 10,175", category: "circulation 循環" },
  { id: "103", name: "X線実験準備室", coordinates: "10,10 75,10 75,95 10,95", category: "office オフィス" },

  // Main vertical corridor
  { id: "hallway-main-1f", name: "廊下", coordinates: "80,10 110,10 110,290 80,290", category: "circulation 循環" },
  // Center-left column - Bottom to Top
  { id: "104", name: "NMR室", coordinates: "115,180 185,180 185,290 115,290", category: "office オフィス" },
  { id: "105", name: "天秤室", coordinates: "115,138 185,138 185,175 115,175", category: "office オフィス" },
  { id: "106", name: "ソフト室", coordinates: "115,103 185,103 185,133 115,133", category: "office オフィス" },
  { id: "107", name: "測定室", coordinates: "115,75 185,75 185,98 115,98", category: "office オフィス" },
  { id: "stairs-1-1f", name: "階段", coordinates: "115,40 150,40 150,70 115,70", category: "utility ユーティリティ" },
  { id: "toilets-1f", name: "便所", coordinates: "155,10 185,10 185,70 155,70", category: "utility ユーティリティ" },

  // Center column - Bottom to Top (larger rooms)
  { id: "108", name: "実験室", coordinates: "190,180 305,180 305,290 190,290", category: "office オフィス" },
  { id: "109", name: "クリーン控室", coordinates: "190,103 305,103 305,175 190,175", category: "office オフィス" },
  { id: "110", name: "リフレッシュコーナー", coordinates: "190,75 305,75 305,98 190,98", category: "common 一般" },
  { id: "111", name: "化学準備室", coordinates: "190,10 305,10 305,70 190,70", category: "office オフィス" },

  // Center-right column - Bottom to Top
  { id: "112", name: "実験・計算室", coordinates: "310,180 395,180 395,290 310,290", category: "office オフィス" },
  { id: "113", name: "ドラフト室", coordinates: "310,138 395,138 395,175 310,175", category: "office オフィス" },
  { id: "114", name: "機器分析室", coordinates: "310,103 395,103 395,133 310,133", category: "office オフィス" },
  { id: "115", name: "試料調整室", coordinates: "310,75 395,75 395,98 310,98", category: "office オフィス" },
  { id: "116", name: "恒温・恒湿室", coordinates: "310,10 395,10 395,70 310,70", category: "office オフィス" },

  // Far right column - Bottom to Top (larger bottom room)
  { id: "117", name: "有機合成実験室", coordinates: "400,138 490,138 490,290 400,290", category: "office オフィス" },
  { id: "118", name: "会議・応接室", coordinates: "400,103 490,103 490,133 400,133", category: "office オフィス" },
  { id: "119", name: "倉庫", coordinates: "400,75 490,75 490,98 400,98", category: "utility ユーティリティ" },
  { id: "120", name: "RI・P3実験室", coordinates: "400,10 490,10 490,70 400,70", category: "office オフィス" },
];

// Room definitions for 2F (Second Floor)
const ROOMS_2F = [
  // Offices & Labs (Blue)
  { id: "201-1", name: "研究室 201-1", coordinates: "10,190 80,190 80,290 10,290", category: "office オフィス" },
  { id: "203", name: "応接室", coordinates: "115,110 185,110 185,150 115,150", category: "office オフィス" },
  { id: "204", name: "研究室", coordinates: "115,155 185,155 185,215 115,215", category: "office オフィス" },
  { id: "205", name: "研究室", coordinates: "115,220 185,220 185,290 115,290", category: "office オフィス" },
  { id: "206", name: "構造データ保管室", coordinates: "10,110 75,110 75,185 10,185", category: "office オフィス" },
  { id: "207", name: "会議室", coordinates: "10,10 75,10 75,70 10,70", category: "office オフィス" },
  { id: "208", name: "研究室", coordinates: "380,10 490,10 490,70 380,70", category: "office オフィス" },
  { id: "209", name: "研究室", coordinates: "305,10 375,10 375,70 305,70", category: "office オフィス" },
  { id: "210", name: "研究室", coordinates: "230,10 300,10 300,70 230,70", category: "office オフィス" },
  { id: "211", name: "研究室", coordinates: "155,10 225,10 225,70 155,70", category: "office オフィス" },
  // Circulation (Purple)
  { id: "hallway-main", name: "廊下", coordinates: "80,75 490,75 490,105 80,105", category: "circulation 循環" },
  { id: "hallway-side", name: "廊下", coordinates: "80,110 110,110 110,290 80,290", category: "circulation 循環" },
  { id: "entrance", name: "玄関", coordinates: "80,75 110,75 110,105 80,105", category: "circulation 循環" },
  // Common Areas (Green)
  { id: "refresh-corner", name: "リフレッシュコーナー", coordinates: "10,75 75,75 75,105 10,105", category: "common 一般" },
  // Utility (Yellow)
  { id: "stairs-1", name: "階段(1)", coordinates: "115,10 150,10 150,45 115,45", category: "utility ユーティリティ" },
  { id: "toilets", name: "便所", coordinates: "115,50 150,50 150,70 115,70", category: "utility ユーティリティ" },
  { id: "stairs-2", name: "階段(2)", coordinates: "460,110 490,110 490,150 460,150", category: "utility ユーティリティ" },
];

// Get rooms based on floor
const getRoomsForFloor = (floor) => {
  if (floor === "1F") return ROOMS_1F;
  if (floor === "2F") return ROOMS_2F;
  return [];
};

const CATEGORY_COLORS = {
  office: { fill: "#3b82f6", label: "Office" },
  utility: { fill: "#eab308", label: "Utility" },
  common: { fill: "#22c55e", label: "Common Area" },
  outdoor: { fill: "#10b981", label: "Outdoor" },
  circulation: { fill: "#a855f7", label: "Circulation" }
};

// Helper functions
const parseCoords = (coordinates) =>
  coordinates.split(' ').map(p => {
    const [x, y] = p.split(',').map(Number);
    return { x, y };
  });

const getRoomBounds = (points) => {
  if (points.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
};

// ===== POSITION STORAGE HELPERS =====
const absoluteToRelative = (x, y, roomCoordinates) => {
  const points = parseCoords(roomCoordinates);
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    relativeX: width > 0 ? Math.max(0, Math.min(1, (x - minX) / width)) : 0.5,
    relativeY: height > 0 ? Math.max(0, Math.min(1, (y - minY) / height)) : 0.5
  };
};

const relativeToAbsolute = (relativeX, relativeY, roomCoordinates) => {
  const points = parseCoords(roomCoordinates);
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const width = maxX - minX;
  const height = maxY - minY;

  return {
    x: minX + (relativeX * width),
    y: minY + (relativeY * height)
  };
};

const isPositionInRoom = (x, y, roomCoordinates) => {
  const points = parseCoords(roomCoordinates);
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
};
// LayoutMap Component - FREE-FORM DRAG & DROP with Auto-Grid & Persistence
function LayoutMap({
  rooms,
  selectedRoomId,
  hoveredRoomId,
  onRoomClick,
  onRoomHover,
  assets,
  onAssetClick,
  selectedAssetId,
  buildingName,
  floor,
  useGpsPositioning = false,
  onAssetPositionChange
}) {
  const { confirm, ConfirmDialogElement } = useConfirmDialog();
  const svgRef = React.useRef(null);
  const [draggedAsset, setDraggedAsset] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [tempPosition, setTempPosition] = useState(null);

  const zoomedRoom = rooms.find(r => r.id === selectedRoomId);

  let transform = "translate(0, 0) scale(1)";
  let currentScale = 1;

  // ======= Zoom & Pan Calculation =======
  if (zoomedRoom) {
    const viewBoxWidth = 500;
    const viewBoxHeight = 300;
    const roomPoints = parseCoords(zoomedRoom.coordinates);
    const roomBounds = getRoomBounds(roomPoints);

    if (roomBounds.width > 0 && roomBounds.height > 0) {
      const scale =
        Math.min(viewBoxWidth / roomBounds.width, viewBoxHeight / roomBounds.height) * 0.9;
      const centerX = roomBounds.minX + roomBounds.width / 2;
      const centerY = roomBounds.minY + roomBounds.height / 2;
      const translateX = viewBoxWidth / 2 - centerX * scale;
      const translateY = viewBoxHeight / 2 - centerY * scale;
      transform = `translate(${translateX}, ${translateY}) scale(${scale})`;
      currentScale = scale;
    }
  }

  // ======= Drag Handlers =======
  const getSVGCoordinates = useCallback((clientX, clientY) => {
    if (!svgRef.current) return null;

    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());

    const g = svg.querySelector('g[transform]');
    if (g) {
      const matrix = g.transform.baseVal.consolidate()?.matrix;
      if (matrix) {
        const invMatrix = matrix.inverse();
        const transformedPoint = svg.createSVGPoint();
        transformedPoint.x = svgP.x;
        transformedPoint.y = svgP.y;
        return transformedPoint.matrixTransform(invMatrix);
      }
    }
    return svgP;
  }, []);

  const handleAssetMouseDown = useCallback(async (e, asset, currentPos) => {
    if (draggedAsset) return;
    e.stopPropagation();
    e.preventDefault(); // Prevent default touch behavior

    // Handle both mouse and touch events
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    // Check if asset is already inventoried
    if (asset.inventory_status === 'completed') {
      const confirmed = await confirm({
        title: "資産移動の確認",
        message: `「${asset.name}」はすでに検品済みです。位置を変更してもよろしいですか?`,
        confirmText: "移動する",
        cancelText: "キャンセル",
        confirmVariant: "primary"
      });
      if (!confirmed) return;
    }

    const svgCoords = getSVGCoordinates(clientX, clientY);
    if (!svgCoords) return;

    setDragOffset({
      x: svgCoords.x - currentPos.x,
      y: svgCoords.y - currentPos.y
    });

    setDraggedAsset(asset);
    setTempPosition(currentPos);
  }, [getSVGCoordinates, confirm, draggedAsset]);

  const handleMouseMove = useCallback((e) => {
    if (!draggedAsset) return;
    e.preventDefault(); // Prevent scrolling while dragging

    // Handle both mouse and touch events
    const clientX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.startsWith('touch') ? e.touches[0].clientY : e.clientY;

    const svgCoords = getSVGCoordinates(clientX, clientY);
    if (!svgCoords) return;

    setTempPosition({
      x: svgCoords.x - dragOffset.x,
      y: svgCoords.y - dragOffset.y
    });
  }, [draggedAsset, dragOffset, getSVGCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (!draggedAsset || !tempPosition) {
      setDraggedAsset(null);
      setTempPosition(null);
      return;
    }

    // Find room at drop position
    const targetRoom = rooms.find(room =>
      isPositionInRoom(tempPosition.x, tempPosition.y, room.coordinates)
    );

    if (targetRoom) {
      onAssetPositionChange(draggedAsset, tempPosition.x, tempPosition.y, targetRoom);
    }

    setDraggedAsset(null);
    setTempPosition(null);
  }, [draggedAsset, tempPosition, rooms, onAssetPositionChange]);

  // Attach global mouse handlers
  // Attach global mouse and touch handlers
  useEffect(() => {
    if (draggedAsset) {
      // Mouse events
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      // Touch events
      window.addEventListener('touchmove', handleMouseMove, { passive: false });
      window.addEventListener('touchend', handleMouseUp);
      window.addEventListener('touchcancel', handleMouseUp);

      document.body.style.cursor = 'grabbing';
      document.body.style.touchAction = 'none'; // Prevent default touch actions

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleMouseMove);
        window.removeEventListener('touchend', handleMouseUp);
        window.removeEventListener('touchcancel', handleMouseUp);
        document.body.style.cursor = 'default';
        document.body.style.touchAction = 'auto';
      };
    }
  }, [draggedAsset, handleMouseMove, handleMouseUp]);

  // ======= Asset positioning: Manual > GPS > Auto-Grid =======
  const getAssetPosition = useCallback((asset, room, allRoomAssets, isZoomedView) => {
    const roomPoints = parseCoords(room.coordinates);
    const bounds = getRoomBounds(roomPoints);

    // 1. Manual position (highest priority - restored from database)
    if (asset.manual_position?.relative_x !== undefined &&
      asset.manual_position?.relative_y !== undefined &&
      asset.manual_position?.room_id === room.id) {
      const pos = relativeToAbsolute(
        asset.manual_position.relative_x,
        asset.manual_position.relative_y,
        room.coordinates
      );
      return { x: pos.x, y: pos.y, type: 'manual' };
    }

    // 2. GPS position (if enabled)
    if (useGpsPositioning && asset.latitude && asset.longitude) {
      const svgPos = gpsToSvgCoordinates(asset.latitude, asset.longitude, buildingName, floor);
      if (svgPos?.isInBounds) {
        return { x: svgPos.x, y: svgPos.y, type: 'gps' };
      }
    }

    // 3. Auto-Grid Layout for unplaced assets
    const unplacedAssets = allRoomAssets.filter(a =>
      (!a.manual_position?.relative_x || a.manual_position?.room_id !== room.id) &&
      (!useGpsPositioning || !a.latitude || !a.longitude)
    );

    const assetIndex = unplacedAssets.findIndex(a => a.id === asset.id);

    if (assetIndex !== -1 && unplacedAssets.length > 0) {
      const totalUnplaced = unplacedAssets.length;

      // Calculate optimal grid layout
      const aspectRatio = bounds.width / bounds.height;
      let cols = Math.ceil(Math.sqrt(totalUnplaced * aspectRatio));
      let rows = Math.ceil(totalUnplaced / cols);

      if (isZoomedView) {
        // More spacing when zoomed in
        const margin = Math.min(bounds.width, bounds.height) * 0.15;
        const availableWidth = bounds.width - 2 * margin;
        const availableHeight = bounds.height - 2 * margin;

        const cellWidth = availableWidth / cols;
        const cellHeight = availableHeight / rows;

        const row = Math.floor(assetIndex / cols);
        const col = assetIndex % cols;

        return {
          x: bounds.minX + margin + (col * cellWidth) + (cellWidth / 2),
          y: bounds.minY + margin + (row * cellHeight) + (cellHeight / 2),
          type: 'auto-grid'
        };
      } else {
        // Compact grid when overview
        const margin = 8;
        const availableWidth = bounds.width - 2 * margin;
        const availableHeight = bounds.height - 2 * margin;

        // Limit display count in overview
        const maxDisplay = Math.min(totalUnplaced, Math.floor((bounds.width * bounds.height) / 150));
        if (assetIndex >= maxDisplay) {
          return null; // Don't show excess assets in overview
        }

        const displayCols = Math.ceil(Math.sqrt(maxDisplay * aspectRatio));
        const displayRows = Math.ceil(maxDisplay / displayCols);

        const cellWidth = availableWidth / displayCols;
        const cellHeight = availableHeight / displayRows;

        const row = Math.floor(assetIndex / displayCols);
        const col = assetIndex % displayCols;

        return {
          x: bounds.minX + margin + (col * cellWidth) + (cellWidth / 2),
          y: bounds.minY + margin + (row * cellHeight) + (cellHeight / 2),
          type: 'auto-grid'
        };
      }
    }

    // 4. Fallback: center of room
    return {
      x: bounds.minX + bounds.width / 2,
      y: bounds.minY + bounds.height / 2,
      type: 'default'
    };
  }, [useGpsPositioning, buildingName, floor]);
  // ======= Render SVG =======
  return (
    <div className="w-full h-full relative group overflow-hidden">
      {zoomedRoom && (
        <button
          onClick={() => onRoomClick(null)}
          className="absolute top-2 left-2 z-10 bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-white/30 transition-all"
        >
          <X className="w-3 h-3" /> ズームアウト
        </button>
      )}

      <svg
        ref={svgRef}
        viewBox="0 0 500 300"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <rect
          width="500"
          height="300"
          fill="#2d3748"
          onClick={() => zoomedRoom && onRoomClick(null)}
          className={zoomedRoom ? "cursor-pointer" : ""}
        />

        <g
          style={{
            transition: draggedAsset ? "none" : "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)"
          }}
          transform={transform}
        >
          <g onMouseLeave={() => onRoomHover(null)}>
            {rooms.map(room => {
              const isSelected = room.id === selectedRoomId;
              const isHovered = room.id === hoveredRoomId;
              const roomPoints = parseCoords(room.coordinates);
              const bounds = getRoomBounds(roomPoints);
              const color = CATEGORY_COLORS[room.category]?.fill || "#6b7280";
              const isZoomedIn = !!zoomedRoom;
              const isCurrentZoomedRoom = isZoomedIn && isSelected;

              const roomAssets = assets.filter(a => a.room === room.id);

              return (
                <g
                  key={room.id}
                  opacity={isZoomedIn && !isSelected ? 0.1 : 1}
                  style={{ transition: "opacity 0.5s ease" }}
                >
                  <polygon
                    points={room.coordinates}
                    className="cursor-pointer transition-all"
                    fill={color}
                    fillOpacity={isSelected ? 0.5 : isHovered ? 0.3 : 0.15}
                    stroke={color}
                    strokeWidth={1 / currentScale}
                    onClick={() => onRoomClick(room.id)}
                    onMouseEnter={() => onRoomHover(room.id)}
                  />

                  {(isHovered || isSelected || !isZoomedIn) && (
                    <text
                      x={bounds.minX + bounds.width / 2}
                      y={isCurrentZoomedRoom ? bounds.minY + (24 / currentScale) : bounds.maxY - 8}
                      textAnchor="middle"
                      className="font-bold pointer-events-none fill-white"
                      style={{
                        fontSize: isCurrentZoomedRoom ? 18 / currentScale : "6px",
                        transition: "font-size 0.5s ease",
                        textShadow: "0 0 3px rgba(0,0,0,0.8)"
                      }}
                    >
                      {room.name}
                    </text>
                  )}

                  {/* ==== Render Assets ==== */}
                  {roomAssets.map((asset) => {
                    let pos;
                    let positionType;

                    if (draggedAsset?.id === asset.id && tempPosition) {
                      pos = tempPosition;
                      positionType = 'dragging';
                    } else {
                      const assetPos = getAssetPosition(asset, room, roomAssets, isCurrentZoomedRoom);
                      if (!assetPos) return null; // Skip if no position
                      pos = { x: assetPos.x, y: assetPos.y };
                      positionType = assetPos.type;
                    }

                    const isAssetSelected = selectedAssetId === asset.id;
                    const isDragging = draggedAsset?.id === asset.id;
                    const assetRadius = isCurrentZoomedRoom ? 6 : 3;

                    // Color based on status
                    const isInventoried = asset.inventory_status === 'completed';
                    const isVerified = asset.location_confirmed;

                    let fillColor;
                    if (isVerified && isInventoried) {
                      fillColor = "#10b981"; // Green: Verified & Inventoried
                    } else if (isVerified && !isInventoried) {
                      fillColor = "#8b5cf6"; // Purple: Location confirmed, but not inventoried
                    } else {
                      fillColor = "#f59e0b"; // Orange: Location not yet confirmed (includes auto-grid and manual-unconfirmed)
                    }

                    return (
                      <g
                        key={asset.id}
                        onMouseDown={(e) => !draggedAsset && isCurrentZoomedRoom && handleAssetMouseDown(e, asset, pos)}
                        onTouchStart={(e) => !draggedAsset && isCurrentZoomedRoom && handleAssetMouseDown(e, asset, pos)}
                        onClick={e => {
                          if (!isDragging) {
                            e.stopPropagation();
                            onAssetClick(asset);
                          }
                        }}
                        style={{
                          cursor: isCurrentZoomedRoom ? (isDragging ? 'grabbing' : 'grab') : 'pointer',
                          touchAction: 'none' // Prevent default touch actions on assets
                        }}
                      >
                        <circle
                          cx={pos.x} cy={pos.y}
                          r={assetRadius / currentScale}
                          fill={fillColor}
                          stroke={isAssetSelected ? "#e70b0bff" : "white"}
                          strokeWidth={(isAssetSelected ? 2 : 1) / currentScale}
                          className="transition-all"
                          style={{
                            filter: isCurrentZoomedRoom ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))' : 'none',
                            opacity: isDragging ? 0.7 : 1
                          }}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Drag hint */}
      {/* Drag hint */}
      {zoomedRoom && !draggedAsset && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1.5 rounded-full text-xs backdrop-blur-sm">
          💡 アセットをドラッグして配置
        </div>
      )}
      {ConfirmDialogElement}

      <style jsx>{`
        svg {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
        }
      `}</style>
    </div>
  );
}
// Room/Asset Info Panel - Shows room list or selected asset details
function RoomAssetPanel({ room, assets, selectedAsset, onAssetSelect, onBack, onAssetUpdate, showNotification, onRequestScan }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [inventoryStatus, setInventoryStatus] = useState(selectedAsset?.inventory_status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false);

  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (selectedAsset) {
      setInventoryStatus(selectedAsset.inventory_status || 'pending');
      setShowUndo(false);
      setJustCompleted(false);
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }
    }
  }, [selectedAsset?.id]);

  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [undoTimer]);

  const canPerformInventory = selectedAsset?.manual_position && selectedAsset?.location_confirmed;
  const hasManualPosition = selectedAsset?.manual_position?.relative_x !== undefined;

  const handleConfirmLocation = async () => {
    if (!selectedAsset) return;

    try {
      const confirmed = await confirm({
        title: "位置を確認",
        message: "この資産が正しい位置に配置されていることを確認しますか？",
        confirmText: "確認",
        cancelText: "キャンセル",
      });

      if (!confirmed) return;

      setUpdating(true);

      console.log('📍 Confirming location for:', selectedAsset.id);

      await axios.put(`${API_BASE_URL}/assets/${selectedAsset.id}`, {
        location_confirmed: true,
        location_confirmed_at: new Date().toISOString()
      });

      const updatedAsset = {
        ...selectedAsset,
        location_confirmed: true,
        location_confirmed_at: new Date().toISOString()
      };

      onAssetUpdate(updatedAsset);
      showNotification("✅ 位置が確認されました", "success 成功");
    } catch (err) {
      console.error("Error confirming location:", err);
      showNotification(err.response?.data?.error || "位置の確認に失敗しました", "error エラー");
    } finally {
      setUpdating(false);
    }
  };

  const handleInventoryComplete = async () => {
    if (!selectedAsset) return;

    if (!canPerformInventory) {
      showNotification("⚠️ 先に資産の位置を確認してください", "error エラー");
      return;
    }

    try {
      const confirmed = await confirm({
        title: "Inventory complete 在庫完了?",
        message: "Mark inventory as complete for this asset この資産の在庫を完了としてマークする?",
        confirmText: "Confirm 確認する",
        cancelText: "Cancel キャンセル",
      });
      if (!confirmed) return;

      setUpdating(true);
      const updateData = {
        inventory_status: 'completed 完成した',
        inventory_date: new Date().toISOString()
      };
      await axios.put(`${API_BASE_URL}/assets/${selectedAsset.id}`, updateData);
      setInventoryStatus('completed');
      setJustCompleted(true);
      setShowUndo(true);
      onAssetUpdate({ ...selectedAsset, inventory_status: 'completed', inventory_date: new Date().toISOString() });
      showNotification("✅ Inventory completed 在庫完了!", "success 成功");

      const timer = setTimeout(() => {
        setShowUndo(false);
        setJustCompleted(false);
      }, 30000);
      setUndoTimer(timer);
    } catch (err) {
      console.error("Error updating inventory:", err);
      showNotification(err.response?.data?.error || "Failed to update inventory 在庫の更新に失敗しました", "error エラー");
    } finally {
      setUpdating(false);
    }
  };

  const handleUndoInventory = async () => {
    if (!selectedAsset) return;
    try {
      const confirmed = await confirm({
        title: "Undo inventory インベントリを元に戻す?",
        message: "Set inventory status back to pending 在庫ステータスを保留に戻す?",
        confirmText: "Undo 元に戻す",
        cancelText: "Cancel キャンセル",
        confirmVariant: "danger 危険",
      });
      if (!confirmed) return;

      setUpdating(true);
      const updateData = {
        inventory_status: 'pending 保留中',
        inventory_date: null
      };
      await axios.put(`${API_BASE_URL}/assets/${selectedAsset.id}`, updateData);
      setInventoryStatus('pending');
      setShowUndo(false);
      setJustCompleted(false);
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }
      onAssetUpdate({ ...selectedAsset, inventory_status: 'pending', inventory_date: null });
      showNotification("↩️ Inventory reset to pending 在庫が保留にリセットされました", "info 情報");
    } catch (err) {
      console.error("Error undoing inventory:", err);
      showNotification(err.response?.data?.error || "Failed to undo inventory 在庫を元に戻すことができませんでした", "error エラー");
    } finally {
      setUpdating(false);
    }
  };

  const filteredAssets = useMemo(() => {
    if (!searchTerm.trim()) return assets;
    const term = searchTerm.toLowerCase();
    return assets.filter(a =>
      a.name.toLowerCase().includes(term) ||
      a.id.toLowerCase().includes(term)
    );
  }, [assets, searchTerm]);

  if (selectedAsset) {
    return (
      <>
        {ConfirmDialogElement}
        <div className="bg-gray-800 rounded-xl p-3 sm:p-4 border border-gray-700 h-full flex flex-col text-white overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-xs font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              部屋に戻る
            </button>
          </div>

          <div className="relative rounded-lg overflow-hidden border border-gray-700 bg-gray-900 mb-3 flex-shrink-0 aspect-[16/9]">
            <img
              src={(selectedAsset.image_urls && selectedAsset.image_urls[0]) || selectedAsset.image_url || 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop'}
              alt={selectedAsset.name}
              className="w-full h-full object-contain bg-gray-900"
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop';
              }}
            />
          </div>

          <div className="mb-3 flex-shrink-0">
            <h3 className="text-base font-bold text-white truncate">{selectedAsset.name}</h3>
            <p className="text-xs text-gray-400 font-mono">ID: {selectedAsset.id}</p>
          </div>

          {!hasManualPosition && (
            <div className="mb-3 p-2 bg-orange-500/20 border border-orange-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-orange-200">
                この資産は自動配置されています。正確な位置にドラッグして配置してください。
              </p>
            </div>
          )}

          {hasManualPosition && !selectedAsset.location_confirmed && (
            <div className="mb-3 p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-purple-200">
                位置が配置されました。正しい位置であることを確認してください。
              </p>
            </div>
          )}

          <div className="space-y-2 mb-3 flex-shrink-0">
            {hasManualPosition && !selectedAsset.location_confirmed && (
              <button
                onClick={handleConfirmLocation}
                disabled={updating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium text-xs transition-all disabled:opacity-50"
              >
                {updating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <MapPin className="w-3.5 h-3.5" />
                )}
                位置を確認
              </button>
            )}

            {inventoryStatus !== 'completed' ? (
              <div className="flex gap-2">
                <button
                  onClick={() => onRequestScan((code) => {
                    const normalizedCode = code.trim().toLowerCase();
                    const assetId = selectedAsset.id.toLowerCase();
                    if (normalizedCode === assetId || normalizedCode.includes(assetId)) {
                      handleInventoryComplete();
                      return true;
                    }
                    return false;
                  })}
                  disabled={!canPerformInventory}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canPerformInventory ? "位置を確認してください" : "Scan and Verify"}
                >
                  <ScanLine className="w-3.5 h-3.5" />
                  Scan スキャン
                </button>
                <button
                  onClick={handleInventoryComplete}
                  disabled={updating || !canPerformInventory}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title={!canPerformInventory ? "位置を確認してください" : "Mark Completed 完了マークを付ける"}
                >
                  {updating ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <CheckCircle className="w-3.5 h-3.5" />
                  )}
                  Mark inventory 在庫にマークを付ける
                </button>
              </div>
            ) : (
              <button
                onClick={handleUndoInventory}
                disabled={updating}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium text-xs transition-all disabled:opacity-50"
              >
                {updating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <RotateCcw className="w-3.5 h-3.5" />
                )}
                Undo inventory インベントリを元に戻す
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 flex-shrink-0">
            <div className="bg-gray-900 rounded-lg p-2 border border-gray-700">
              <div className="flex items-center gap-1 mb-0.5">
                <User className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">User ユーザー</span>
              </div>
              <p className="text-xs font-medium text-gray-200 truncate">{selectedAsset.user || "N/A"}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 border border-gray-700">
              <div className="flex items-center gap-1 mb-0.5">
                <Building className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">Company 会社</span>
              </div>
              <p className="text-xs font-medium text-gray-200 truncate">{selectedAsset.company_name || "N/A"}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 border border-gray-700">
              <div className="flex items-center gap-1 mb-0.5">
                <MapPin className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">Location 位置</span>
              </div>
              <p className="text-xs font-medium text-gray-200 truncate">{selectedAsset.floor} / {selectedAsset.room}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-2 border border-gray-700">
              <div className="flex items-center gap-1 mb-0.5">
                <CheckCircle className="w-3 h-3 text-blue-400" />
                <span className="text-[10px] text-gray-500">Status 状態</span>
              </div>
              <p className="text-xs font-medium truncate">
                {selectedAsset.location_confirmed ? (
                  <span className="text-green-400">✓ 確認済み</span>
                ) : hasManualPosition ? (
                  <span className="text-purple-400">配置済み</span>
                ) : (
                  <span className="text-orange-400">自動配置</span>
                )}
              </p>
            </div>
          </div>

          <div className="mt-auto pt-2 border-t border-gray-700 flex-shrink-0">
            <p className="text-[10px] text-gray-500 text-center">
              更新日: {new Date(selectedAsset.last_updated).toLocaleDateString()}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!room) {
    return (
      <>
        {ConfirmDialogElement}
        <div className="bg-gray-800 rounded-xl p-4 sm:p-6 h-full flex flex-col justify-center items-center text-center border border-gray-700">
          <Layers className="w-12 h-12 text-gray-600 mb-3" />
          <h3 className="text-lg sm:text-xl font-bold text-white">部屋が選択されていません</h3>
          <p className="text-gray-400 mt-2 text-xs sm:text-sm">マップ上の部屋をクリックして詳細を表示します。</p>
        </div>
      </>
    );
  }

  return (
    <>
      {ConfirmDialogElement}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 border border-gray-700 h-full flex flex-col text-white overflow-y-auto custom-scrollbar">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold truncate">{room.name}</h2>
        </div>

        {assets.length > 5 && (
          <div className="mt-3 sm:mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
          </div>
        )}

        <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-700 flex-grow flex flex-col min-h-0">
          <h4 className="text-base sm:text-lg font-semibold mb-3 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 sm:w-5 sm:h-5" /> Assets 資産
            </span>
            <span className="text-sm font-bold bg-blue-600 px-2.5 py-1 rounded-full">
              {filteredAssets.length}
            </span>
          </h4>

          {filteredAssets.length > 0 ? (
            <ul className="space-y-2 overflow-y-auto pr-2 flex-1 custom-scrollbar">
              {filteredAssets.map(asset => {
                const hasManualPos = asset.manual_position?.relative_x !== undefined;
                const isConfirmed = asset.location_confirmed;
                const statusColor = isConfirmed ? 'bg-green-500' : hasManualPos ? 'bg-purple-500' : 'bg-orange-500';

                return (
                  <li
                    key={asset.id}
                    onClick={() => onAssetSelect(asset)}
                    className="text-gray-400 text-xs sm:text-sm p-2 sm:p-3 bg-gray-900/50 rounded-lg border border-gray-700 hover:border-blue-600 hover:bg-gray-900/70 transition-all cursor-pointer flex items-start gap-2 sm:gap-3"
                  >
                    <div className={`w-2 h-2 rounded-full ${statusColor} mt-1.5 flex-shrink-0`}></div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-200 leading-tight truncate">{asset.name}</p>
                      <p className="text-xs font-mono text-gray-500 truncate mt-0.5">{asset.id}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-gray-400 text-xs sm:text-sm flex-1 flex flex-col items-center justify-center">
              <Package className="w-8 h-8 opacity-30 mb-2" />
              <p>{searchTerm ? 'No matching assets found' : 'No assets in this room'}</p>
            </div>
          )}
        </div>

        <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
      </div>
    </>
  );
}

function InfoCard({ icon, label, value }) {
  return (
    <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
      <div className="flex items-center gap-2 mb-1">
        <div className="text-blue-400">{React.cloneElement(icon, { className: "w-4 h-4" })}</div>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <p className="text-sm font-semibold text-gray-200 truncate">{value}</p>
    </div>
  );
}
// Main FloorMapModal Component
export default function FloorMapModal({ buildingName, onClose }) {
  const [assets, setAssets] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [hoveredRoomId, setHoveredRoomId] = useState(null);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);
  const [inventoryFilter, setInventoryFilter] = useState("all");
  const [notification, setNotification] = useState(null);
  const [mobileTab, setMobileTab] = useState('map');

  const [useGpsPositioning, setUseGpsPositioning] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const [showScanner, setShowScanner] = useState(false);
  const [scanCallback, setScanCallback] = useState(null);
  const html5QrCodeRef = React.useRef(null);

  const hasLayout = buildingName === "High Throughput Building 高処理能力の建物" && (selectedFloor === "1F" || selectedFloor === "2F");

  // Scanner Functions
  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCodeRef.current = new Html5Qrcode("floor-qr-reader");

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (scanCallback) {
            const success = scanCallback(decodedText);
            if (success) {
              stopScanner();
              setShowScanner(false);
              showNotification("✅ 資産が正常に検証されました！", "success 成功");
            } else {
              showNotification("❌ 資産コードが正しくありません", "error エラー");
            }
          }
        },
        () => { }
      );
    } catch (err) {
      console.error("Scanner error スキャナエラー:", err);
      showNotification("カメラエラー - 権限を確認してください", "error エラー");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.error("Stop scanner error スキャナー停止エラー", e);
      }
      html5QrCodeRef.current = null;
    }
  };

  useEffect(() => {
    if (showScanner) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [showScanner]);

  const handleRequestScan = (callback) => {
    setScanCallback(() => callback);
    setShowScanner(true);
  };

  const showNotification = (message, type = "info 情報") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAssetUpdate = (updatedAsset) => {
    setAssets(prevAssets =>
      prevAssets.map(a => a.id === updatedAsset.id ? updatedAsset : a)
    );
    setSelectedAsset(updatedAsset);
  };

  // Handle asset position change with PERSISTENCE
  const handleAssetPositionChange = async (asset, absoluteX, absoluteY, targetRoom) => {
    try {
      const { relativeX, relativeY } = absoluteToRelative(absoluteX, absoluteY, targetRoom.coordinates);

      const positionData = {
        room_id: targetRoom.id,
        relative_x: relativeX,
        relative_y: relativeY,
        position_updated_at: new Date().toISOString()
      };

      console.log('💾 Saving position 位置の保存:', {
        assetId: asset.id,
        room: targetRoom.id,
        relative: { x: relativeX, y: relativeY }
      });

      await axios.put(`${API_BASE_URL}/assets/${asset.id}`, {
        manual_position: positionData,
        location_confirmed: false,
        room: targetRoom.id,
        floor: selectedFloor
      });

      console.log('✅ Position saved successfully ポジションが正常に保存されました');

      const updatedAsset = {
        ...asset,
        manual_position: positionData,
        location_confirmed: false,
        room: targetRoom.id,
        floor: selectedFloor
      };

      setAssets(prevAssets =>
        prevAssets.map(a => a.id === asset.id ? updatedAsset : a)
      );

      if (selectedAsset?.id === asset.id) {
        setSelectedAsset(updatedAsset);
      }

      if (targetRoom.id !== asset.room) {
        setSelectedRoomId(targetRoom.id);
        showNotification(`📦 ${asset.name} を ${targetRoom.name} に移動しました`, "success 成功");
      } else {
        showNotification(`📍 ${asset.name} の位置を保存しました`, "success 成功");
      }
    } catch (error) {
      console.error('❌ Error saving asset position アセットの位置を保存中にエラーが発生しました:', error);
      console.error('Error details エラーの詳細:', error.response?.data);
      showNotification("❌ 位置の保存に失敗しました", "error");
      fetchAssets();
    }
  };

  // Fetch assets with POSITION LOADING
  const fetchAssets = useCallback(async () => {
    if (!buildingName) return;

    try {
      const response = await fetch(`${API_BASE_URL}/assets?building=${encodeURIComponent(buildingName)}`);
      const data = await response.json();

      console.log('📥 Loaded assets ロードされたアセット:', data.length);
      console.log('🔍 Sample positions サンプル位置:', data.slice(0, 3).map(a => ({
        id: a.id,
        name: a.name,
        manual_position: a.manual_position,
        location_confirmed: a.location_confirmed
      })));

      setAssets(data || []);
      setLastUpdate(new Date());

      if (loading) {
        const floors = [...new Set(data.map(a => a.floor))].sort();
        if (floors.length > 0) setSelectedFloor(floors[0]);
        setLoading(false);
      }
    } catch (err) {
      console.error("❌ Error fetching assets アセットの取得中にエラーが発生しました:", err);
      setLoading(false);
    }
  }, [buildingName, loading]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  const handleManualRefresh = () => {
    fetchAssets();
    showNotification("🔄 Positions updated ポジションが更新されました", "success 成功");
  };

  const floors = useMemo(() => {
    return [...new Set(assets.map(a => a.floor || "Unknown"))].sort();
  }, [assets]);

  const floorAssets = useMemo(() => {
    let filtered = assets.filter(a => a.floor === selectedFloor);

    if (inventoryFilter === "Completed") {
      filtered = filtered.filter(a => a.location_confirmed && a.inventory_status === "completed");
    } else if (inventoryFilter === "Confirmed") {
      filtered = filtered.filter(a => a.location_confirmed && a.inventory_status !== "completed");
    } else if (inventoryFilter === "Incomplete") {
      filtered = filtered.filter(a => !a.location_confirmed);
    }

    return filtered;
  }, [assets, selectedFloor, inventoryFilter]);

  const currentRooms = useMemo(() => {
    return getRoomsForFloor(selectedFloor);
  }, [selectedFloor]);

  const selectedRoom = useMemo(() => {
    return currentRooms.find(r => r.id === selectedRoomId);
  }, [selectedRoomId, currentRooms]);

  const roomAssets = useMemo(() => {
    if (!selectedRoom) return [];
    return floorAssets.filter(a => a.room === selectedRoom.id);
  }, [selectedRoom, floorAssets]);

  const handleAssetClick = (asset) => {
    setSelectedAsset(asset);
    if (window.innerWidth < 1024) {
      setMobileTab('info');
    }
  };

  const handleBackToRoom = () => {
    setSelectedAsset(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-2xl">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm sm:text-base">フロアマップを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-2xl text-white font-medium ${notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
                'bg-blue-500'
              }`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] flex flex-col overflow-hidden border border-gray-700"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="bg-white/20 rounded-xl p-1.5 sm:p-2">
              <Layers className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-xl font-bold text-white truncate">{buildingName}</h2>
              <p className="text-indigo-100 text-xs sm:text-sm hidden sm:block">インタラクティブフロアマップ</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-white/20 rounded-xl p-1">
              <button
                onClick={() => setInventoryFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${inventoryFilter === "all"
                  ? "bg-white text-indigo-700 shadow-md"
                  : "text-white hover:bg-white/20"
                  }`}
              >
                <span>全て</span>
              </button>
              <button
                onClick={() => setInventoryFilter("Completed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${inventoryFilter === "Completed"
                  ? "bg-green-500 text-white shadow-md"
                  : "text-white hover:bg-white/20"
                  }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                <span>検品済</span>
              </button>
              <button
                onClick={() => setInventoryFilter("Confirmed")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${inventoryFilter === "Confirmed"
                  ? "bg-purple-500 text-white shadow-md"
                  : "text-white hover:bg-white/20"
                  }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
                <span>位置確定済</span>
              </button>
              <button
                onClick={() => setInventoryFilter("Incomplete")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${inventoryFilter === "Incomplete"
                  ? "bg-orange-500 text-white shadow-md"
                  : "text-white hover:bg-white/20"
                  }`}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <span>位置確認待ち</span>
              </button>
            </div>

            <div className="flex items-center gap-1 bg-white/20 rounded-xl p-1">
              <button
                onClick={() => setUseGpsPositioning(!useGpsPositioning)}
                title={useGpsPositioning ? "GPS位置情報を無効化" : "GPS位置情報を有効化"}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${useGpsPositioning
                  ? "bg-blue-500 text-white shadow-md"
                  : "text-white hover:bg-white/20"
                  }`}
              >
                <Navigation className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">GPS</span>
              </button>
              <button
                onClick={handleManualRefresh}
                title="位置情報を更新"
                className="px-2 py-1.5 rounded-lg text-xs font-medium text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="relative">
              <button
                onClick={() => setFloorDropdownOpen(!floorDropdownOpen)}
                className="bg-white/20 hover:bg-white/30 text-white px-3 sm:px-4 py-2 rounded-xl flex items-center gap-2 transition-all text-sm sm:text-base shadow-sm"
              >
                <span className="font-medium truncate max-w-[80px] sm:max-w-none">{selectedFloor}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${floorDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {floorDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full mt-2 right-0 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[150px] z-10"
                  >
                    {floors.map(floor => (
                      <button
                        key={floor}
                        onClick={() => {
                          setSelectedFloor(floor);
                          setFloorDropdownOpen(false);
                          setSelectedRoomId(null);
                          setSelectedAsset(null);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors text-sm sm:text-base ${selectedFloor === floor ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'
                          }`}
                      >
                        {floor}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        {/* Content - Responsive Layout with Tabs on Mobile */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          {/* Mobile Filters Sub-Header */}
          <div className="lg:hidden bg-gray-800 border-b border-gray-700 p-2 flex justify-center gap-2 overflow-x-auto">
            <button
              onClick={() => setInventoryFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${inventoryFilter === "all"
                ? "bg-white text-indigo-700 shadow-md"
                : "text-gray-300 hover:bg-white/10"
                }`}
            >
              全て
            </button>
            <button
              onClick={() => setInventoryFilter("Completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${inventoryFilter === "Completed"
                ? "bg-green-500 text-white shadow-md"
                : "text-gray-300 hover:bg-white/10"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${inventoryFilter === "Completed" ? "bg-white" : "bg-green-500"}`}></div>
              検品済
            </button>
            <button
              onClick={() => setInventoryFilter("Confirmed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${inventoryFilter === "Confirmed"
                ? "bg-purple-500 text-white shadow-md"
                : "text-gray-300 hover:bg-white/10"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${inventoryFilter === "Confirmed" ? "bg-white" : "bg-purple-500"}`}></div>
              位置確定済
            </button>
            <button
              onClick={() => setInventoryFilter("Incomplete")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${inventoryFilter === "Incomplete"
                ? "bg-orange-500 text-white shadow-md"
                : "text-gray-300 hover:bg-white/10"
                }`}
            >
              <div className={`w-2 h-2 rounded-full ${inventoryFilter === "Incomplete" ? "bg-white" : "bg-orange-500"}`}></div>
              位置確認待ち
            </button>
          </div>

          {/* Mobile Tab Switcher */}
          <div className="lg:hidden bg-gray-800 border-b border-gray-700 flex">
            <button
              onClick={() => setMobileTab('map')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${mobileTab === 'map'
                ? 'bg-gray-900 text-white border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Layers className="w-4 h-4" />
                <span>フロアマップ</span>
              </div>
            </button>
            <button
              onClick={() => setMobileTab('info')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all ${mobileTab === 'info'
                ? 'bg-gray-900 text-white border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-200'
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Package className="w-4 h-4" />
                <span>部屋と資産情報</span>
                {selectedRoom && roomAssets.length > 0 && (
                  <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">
                    {roomAssets.length}
                  </span>
                )}
              </div>
            </button>
          </div>

          {/* Floor Plan */}
          <div className={`flex-1 bg-gray-900 p-2 sm:p-4 lg:p-6 overflow-hidden flex items-center justify-center ${mobileTab === 'map' ? 'block' : 'hidden lg:flex'
            }`}>
            <div className="bg-gray-800 rounded-lg sm:rounded-xl shadow-lg w-full h-full border border-gray-700 flex items-center justify-center">
              {hasLayout ? (
                <LayoutMap
                  rooms={currentRooms}
                  selectedRoomId={selectedRoomId}
                  hoveredRoomId={hoveredRoomId}
                  onRoomClick={setSelectedRoomId}
                  onRoomHover={setHoveredRoomId}
                  assets={floorAssets}
                  onAssetClick={handleAssetClick}
                  selectedAssetId={selectedAsset?.id}
                  buildingName={buildingName}
                  floor={selectedFloor}
                  useGpsPositioning={useGpsPositioning}
                  onAssetPositionChange={handleAssetPositionChange}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Layers className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm sm:text-base text-center px-4">
                    {buildingName} - {selectedFloor}のレイアウトが利用できません
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    資産総数: {floorAssets.length}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Room/Asset Info Panel */}
          <div className={`w-full lg:w-96 lg:flex-none bg-gray-900 border-t lg:border-t-0 lg:border-l border-gray-700 lg:h-full ${mobileTab === 'info' ? 'flex-1' : 'hidden lg:block'
            }`}>
            <RoomAssetPanel
              room={selectedRoom}
              assets={roomAssets}
              selectedAsset={selectedAsset}
              onAssetSelect={handleAssetClick}
              onBack={handleBackToRoom}
              onAssetUpdate={handleAssetUpdate}
              showNotification={showNotification}
              onRequestScan={handleRequestScan}
            />
          </div>
        </div>

        {/* Footer Legend */}
        <div className="bg-gray-800 px-4 sm:px-6 py-2 sm:py-3 border-t border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0 flex-shrink-0">
          <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap justify-center">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              位置確認待ち
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-500"></span>
              位置確定済
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              検品済
            </span>
            {useGpsPositioning && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                GPS
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-gray-400">
            {selectedAsset ? (
              <>表示: <span className="font-semibold text-gray-200">{selectedAsset.name}</span></>
            ) : selectedRoomId ? (
              <>部屋: <span className="font-semibold text-gray-200">{roomAssets.length}</span> 資産</>
            ) : (
              <>合計: <span className="font-semibold text-gray-200">{floorAssets.length}</span> 資産 on {selectedFloor}</>
            )}
          </p>
        </div>
      </motion.div>

      {/* Scanner Overlay */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black bg-opacity-90 flex flex-col items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl overflow-hidden w-full max-w-md relative shadow-2xl">
              <button
                onClick={() => setShowScanner(false)}
                className="absolute top-4 right-4 z-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-6 bg-gray-900 text-center">
                <h3 className="text-xl font-bold text-white mb-2">Scan Asset Code 資産コードのスキャン</h3>
                <p className="text-gray-400 text-sm">Align the QR code/barcode within the frame QRコード/バーコードをフレーム内に揃える</p>
              </div>

              <div id="floor-qr-reader" className="bg-black w-full" style={{ minHeight: '300px' }}></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}