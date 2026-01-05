// client/src/components/BuildingView.js - PART 1/4
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config';
import { motion, AnimatePresence } from "framer-motion";
import { printAssetPDF } from '../utils/printAsset';
import {
  LayoutGrid,
  List,
  ArrowLeft,
  Search,
  X,
  MapPin,
  Layers,
  RefreshCw,
  AlertCircle,
  Package,
  Loader2,
  Download,
  CheckCircle2,
  Menu,
  ChevronLeft,
  ChevronRight,
  Building2,
  User,
  Barcode,
  Clock,
  Users,
  FileText,
  Eye,
  ExternalLink,
  Undo2,
  Copy,
} from "lucide-react";
import AIAssistant from './Chatbot';
import { useConfirmDialog } from "./useConfirmDialog";
// Convert half-width katakana to full-width
function toFullWidth(str) {
  if (!str) return str;
  
  const halfToFull = {
    'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
    'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
    'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
    'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
    'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
    'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
    'ｱ': 'ア', 'ｲ': 'イ', 'ｳ': 'ウ', 'ｴ': 'エ', 'ｵ': 'オ',
    'ｶ': 'カ', 'ｷ': 'キ', 'ｸ': 'ク', 'ｹ': 'ケ', 'ｺ': 'コ',
    'ｻ': 'サ', 'ｼ': 'シ', 'ｽ': 'ス', 'ｾ': 'セ', 'ｿ': 'ソ',
    'ﾀ': 'タ', 'ﾁ': 'チ', 'ﾂ': 'ツ', 'ﾃ': 'テ', 'ﾄ': 'ト',
    'ﾅ': 'ナ', 'ﾆ': 'ニ', 'ﾇ': 'ヌ', 'ﾈ': 'ネ', 'ﾉ': 'ノ',
    'ﾊ': 'ハ', 'ﾋ': 'ヒ', 'ﾌ': 'フ', 'ﾍ': 'ヘ', 'ﾎ': 'ホ',
    'ﾏ': 'マ', 'ﾐ': 'ミ', 'ﾑ': 'ム', 'ﾒ': 'メ', 'ﾓ': 'モ',
    'ﾔ': 'ヤ', 'ﾕ': 'ユ', 'ﾖ': 'ヨ',
    'ﾗ': 'ラ', 'ﾘ': 'リ', 'ﾙ': 'ル', 'ﾚ': 'レ', 'ﾛ': 'ロ',
    'ﾜ': 'ワ', 'ｦ': 'ヲ', 'ﾝ': 'ン',
    'ｧ': 'ァ', 'ｨ': 'ィ', 'ｩ': 'ゥ', 'ｪ': 'ェ', 'ｫ': 'ォ',
    'ｯ': 'ッ', 'ｬ': 'ャ', 'ｭ': 'ュ', 'ｮ': 'ョ',
    '｡': '。', '｢': '「', '｣': '」', '､': '、', '･': '・',
    'ｰ': 'ー', 'ﾞ': '゛', 'ﾟ': '゜'
  };

  let result = str;
  // First replace two-character combinations (dakuten/handakuten)
  Object.keys(halfToFull).forEach(half => {
    result = result.split(half).join(halfToFull[half]);
  });
  
  return result;
}

export default function BuildingView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [assets, setAssets] = useState([]);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [notification, setNotification] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleNavigateToAsset = (building, floor, room, assetId) => {
    if (id === building) {
      setSelectedFloor(floor);
      setSelectedRoom(room);
      const asset = assets.find(a => a.id === assetId);
      if (asset) {
        setSelectedAsset(asset);
        showNotification(`✅ Found: ${asset.name}`, "success");
      }
    } else {
      navigate(`/building/${encodeURIComponent(building)}`, {
        state: {
          targetFloor: floor,
          targetRoom: room,
          targetAssetId: assetId
        }
      });
    }
  };

  const fetchAssets = useCallback(async (isRefresh = false) => {
    if (!id) return;

    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/assets?building=${encodeURIComponent(id)}`);
      setAssets(res.data || []);

      if (isRefresh) {
        showNotification("Assets refreshed successfully", "success");
      }
    } catch (err) {
      console.error("Error fetching building assets:", err);
      showNotification("Failed to load assets", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchAssets();
  }, [fetchAssets]);

  useEffect(() => {
    if (location.state?.targetFloor && location.state?.targetRoom && location.state?.targetAssetId && assets.length > 0) {
      const { targetFloor, targetRoom, targetAssetId } = location.state;
      setSelectedFloor(targetFloor);
      setSelectedRoom(targetRoom);
      const asset = assets.find(a => a.id === targetAssetId);
      if (asset) {
        setSelectedAsset(asset);
        showNotification(`✅ Found: ${asset.name}`, "success");
      }
      window.history.replaceState({}, document.title);
    }
  }, [location.state, assets]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (selectedAsset || mobileSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedAsset, mobileSidebarOpen]);

  const floors = useMemo(() => {
    const unique = new Set(assets.map((a) => a.floor || "Unknown"));
    return Array.from(unique).sort();
  }, [assets]);

  const rooms = useMemo(() => {
    if (!selectedFloor) return [];
    const filtered = assets.filter((a) => a.floor === selectedFloor);
    const unique = new Set(filtered.map((a) => a.room || "Unknown"));
    return Array.from(unique).sort();
  }, [assets, selectedFloor]);

  const floorCounts = useMemo(() => {
    const counts = {};
    assets.forEach((a) => {
      const floor = a.floor || "Unknown";
      counts[floor] = (counts[floor] || 0) + 1;
    });
    return counts;
  }, [assets]);

  const roomCounts = useMemo(() => {
    const counts = {};
    assets
      .filter((a) => a.floor === selectedFloor)
      .forEach((a) => {
        const room = a.room || "Unknown";
        counts[room] = (counts[room] || 0) + 1;
      });
    return counts;
  }, [assets, selectedFloor]);

  const filteredAssets = useMemo(() => {
    let filtered = assets;

    if (selectedFloor) filtered = filtered.filter((a) => a.floor === selectedFloor);
    if (selectedRoom) filtered = filtered.filter((a) => a.room === selectedRoom);

    if (searchTerm)
      filtered = filtered.filter(
        (a) =>
          a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          String(a.id).toLowerCase().includes(searchTerm.toLowerCase())
      );

    if (statusFilter !== "all")
      filtered = filtered.filter(
        (a) => a.inventory_status?.toLowerCase() === statusFilter.toLowerCase()
      );

    return filtered.sort((a, b) => String(a.id).localeCompare(String(b.id), undefined, { numeric: true }));
  }, [assets, selectedFloor, selectedRoom, searchTerm, statusFilter]);

  const exportAssets = () => {
    try {
      const headers = ["Asset Number", "Name", "Floor", "Room", "Inventory Status", "Condition", "Notes", "User", "Actual User"];
      const rows = filteredAssets.map(a => [
        String(a.id), // Keep as string
        a.name,
        a.floor,
        a.room,
        a.inventory_status || "pending",
        a.condition || "N/A",
        a.notes || "N/A",
        a.user || "Unassigned",
        a.actual_user || "N/A"
      ]);

      // Add BOM for proper Excel UTF-8 handling and wrap asset numbers to preserve leading zeros
      const csvContent = [headers, ...rows]
        .map(row =>
          row.map((cell, idx) => {
            const cellValue = String(cell);
            // For asset number column, add zero-width space to force text format
            if (idx === 0) {
              return `"\u200B${cellValue}"`;
            }
            return `"${cellValue}"`;
          }).join(",")
        ).join("\n");

      const bom = '\uFEFF';
      const csv = bom + csvContent;
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${id}-assets-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification("Report exported successfully", "success");
    } catch (err) {
      showNotification("Export failed", "error");
    }
  };

  const clearFilters = () => {
    setSelectedFloor("");
    setSelectedRoom("");
    setSearchTerm("");
    setStatusFilter("all");
    showNotification("Filters cleared", "info");
  };

  const handleAssetUpdate = (updatedAsset) => {
    setAssets(prevAssets =>
      prevAssets.map(a => a.id === updatedAsset.id ? updatedAsset : a)
    );
    setSelectedAsset(updatedAsset);
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-base sm:text-lg font-semibold">Loading assets...</p>
          <p className="text-gray-500 text-xs sm:text-sm mt-2">{decodeURIComponent(id)}</p>
        </div>
      </div>
    );

  if (!assets.length)
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-12 text-center max-w-md border border-gray-100">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">No Assets Found</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">The building "{decodeURIComponent(id)}" has no assets.</p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl text-sm sm:text-base"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    );

  const hasActiveFilters = selectedFloor || selectedRoom || searchTerm || statusFilter !== "all";

  // CONTINUES IN PART 2...
  // client/src/components/BuildingView.js - PART 2/4: Main Layout

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999]"
          >
            <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${notification.type === "success"
              ? "bg-gradient-to-r from-green-500 to-emerald-500"
              : notification.type === "error"
                ? "bg-gradient-to-r from-red-500 to-pink-500"
                : "bg-gradient-to-r from-blue-500 to-indigo-500"
              } text-white font-semibold min-w-[280px] justify-center`}>
              {notification.type === "success" && <CheckCircle2 className="w-5 h-5" />}
              {notification.type === "error" && <AlertCircle className="w-5 h-5" />}
              {notification.message}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 lg:hidden"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="absolute left-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-800">Navigation</h2>
                  <button onClick={() => setMobileSidebarOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <Link to="/dashboard" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold group" onClick={() => setMobileSidebarOpen(false)}>
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  Back to Dashboard
                </Link>
                <div className="pb-6 border-b border-gray-200">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{decodeURIComponent(id)}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Package className="w-4 h-4 text-indigo-500" />
                    <span className="font-semibold">{assets.length}</span> total assets
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-700">FLOORS</h4>
                    {selectedFloor && <button onClick={() => { setSelectedFloor(""); setSelectedRoom(""); }} className="text-xs text-indigo-600">Clear</button>}
                  </div>
                  <div className="space-y-2">
                    {floors.map((floor) => (
                      <button
                        key={floor}
                        onClick={() => { setSelectedFloor(floor); setSelectedRoom(""); setMobileSidebarOpen(false); }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${selectedFloor === floor ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                          }`}
                      >
                        <div className="flex justify-between items-center">
                          <span>{floor}</span>
                          <span className={`text-xs px-2 py-1 rounded-full ${selectedFloor === floor ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                            {floorCounts[floor]}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                {rooms.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">ROOMS</h4>
                      {selectedRoom && <button onClick={() => setSelectedRoom("")} className="text-xs text-indigo-600">Clear</button>}
                    </div>
                    <div className="space-y-2">
                      {rooms.map((room) => (
                        <button
                          key={room}
                          onClick={() => { setSelectedRoom(room); setMobileSidebarOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium ${selectedRoom === room ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                            }`}
                        >
                          <div className="flex justify-between">
                            <span>Room {room}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${selectedRoom === room ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                              {roomCounts[room]}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar - SINGLE SCROLL */}
      <aside className="hidden lg:flex flex-col w-80 bg-white/80 backdrop-blur-xl border-r border-gray-200 shadow-sm sticky top-0 h-screen">
        {/* Fixed Header */}
        <div className="p-6 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2 mb-6 text-indigo-600 hover:text-indigo-700 font-semibold group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Dashboard
          </Link>
          <div className="pb-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 leading-tight">{decodeURIComponent(id)}</h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Package className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold">{assets.length}</span> total assets
            </div>
            {hasActiveFilters && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-indigo-600 font-medium">{filteredAssets.length} filtered</span>
                <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 underline">Clear filters</button>
              </div>
            )}
          </div>
        </div>

        {/* SINGLE SCROLLABLE AREA FOR FLOORS AND ROOMS */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
          {/* Floors */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-gray-700">FLOORS</h3>
              </div>
              {selectedFloor && <button onClick={() => { setSelectedFloor(""); setSelectedRoom(""); }} className="text-xs text-indigo-600">Clear</button>}
            </div>
            <div className="space-y-2">
              {floors.map((floor) => (
                <button
                  key={floor}
                  onClick={() => { setSelectedFloor(floor); setSelectedRoom(""); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${selectedFloor === floor ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{floor}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${selectedFloor === floor ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {floorCounts[floor]}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Rooms */}
          {rooms.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-gray-700">ROOMS</h3>
                </div>
                {selectedRoom && <button onClick={() => setSelectedRoom("")} className="text-xs text-indigo-600">Clear</button>}
              </div>
              <div className="space-y-2">
                {rooms.map((room) => (
                  <button
                    key={room}
                    onClick={() => setSelectedRoom(room)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${selectedRoom === room ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg" : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                      }`}
                  >
                    <div className="flex justify-between items-center">
                      <span>Room {room}</span>
                      <span className={`text-xs px-2 py-1 rounded-full font-bold ${selectedRoom === room ? "bg-white/20 text-white" : "bg-gray-200 text-gray-700"}`}>
                        {roomCounts[room]}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* CONTINUES IN PART 3... */}

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between lg:hidden">
            <button onClick={() => setMobileSidebarOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium shadow-lg">
              <Menu className="w-4 h-4" />
              Menu
            </button>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {selectedRoom ? `Room ${selectedRoom}` : selectedFloor ? selectedFloor : "All Assets"}
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              <span className="font-semibold text-gray-800">{filteredAssets.length}</span> assets
              {hasActiveFilters && <span className="text-gray-500"> filtered</span>}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search assets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white w-full shadow-sm"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm">
              <option value="all">All Inventory Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
            <button onClick={exportAssets} disabled={filteredAssets.length === 0} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl text-sm font-medium disabled:opacity-50 shadow-sm border border-gray-200">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button onClick={() => fetchAssets(true)} disabled={refreshing} className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl text-sm font-medium shadow-sm border border-gray-200">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <div className="flex bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden p-0.5 shadow-sm border border-gray-200">
              <button onClick={() => setViewMode("grid")} className={`p-2.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "text-gray-600"}`}>
                <LayoutGrid className="w-5 h-5" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2.5 rounded-lg transition-all ${viewMode === "list" ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md" : "text-gray-600"}`}>
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {filteredAssets.length > 0 ? (
            viewMode === "grid" ? (
              <motion.div key="grid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2 sm:gap-3">
                {filteredAssets.map((asset, index) => (
                  <motion.div key={asset.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * 0.02, 0.3) }}>
                    <AssetCard asset={asset} onClick={() => setSelectedAsset(asset)} />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1.5">
                {filteredAssets.map((asset, index) => (
                  <motion.div key={asset.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(index * 0.015, 0.3) }}>
                    <AssetListItem asset={asset} onClick={() => setSelectedAsset(asset)} />
                  </motion.div>
                ))}
              </motion.div>
            )
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 sm:py-20">
              <div className="inline-block p-6 sm:p-8 bg-gray-100 rounded-full mb-6">
                <Search className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-2">No assets found</h3>
              <p className="text-sm sm:text-base text-gray-500 mb-4">Try adjusting your filters or search term</p>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium shadow-lg">
                  Clear All Filters
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Asset Modal */}
      <AnimatePresence>
        {selectedAsset && (
          <CompactAssetModal
            asset={selectedAsset}
            onClose={() => setSelectedAsset(null)}
            onUpdate={handleAssetUpdate}
            showNotification={showNotification}
            navigate={navigate}
          />
        )}
      </AnimatePresence>

      <AIAssistant
        assets={assets}
        onNavigate={handleNavigateToAsset}
      />
    </div>
  );
}

/* Asset Card Component - Compact Design */
function AssetCard({ asset, onClick }) {
  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden group hover:border-indigo-300"
    >
      <div className="relative overflow-hidden h-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <img
          src={asset.image_url || `https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop`}
          alt={asset.name}
          className="w-full h-full object-contain bg-gray-100 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop';
          }}
        />
      </div>
      <div className="p-2">
        <h4 className="font-bold text-gray-900 text-base mb-0.5 truncate">{toFullWidth(asset.name)}</h4>
        <p className="text-xs text-gray-500 font-mono mb-1 truncate">ID: {String(asset.id)}</p>
        <div className="flex items-center justify-between text-xs text-gray-600">
          <span className="flex items-center gap-0.5">
            <Users className="w-2.5 h-2.5 text-indigo-500" />
            <span className="font-medium truncate">{asset.realuser}</span>
          </span>
          <span className="flex items-center gap-0.5">
            <User className="w-2.5 h-2.5 text-purple-500" />
            <span className="truncate max-w-[50px]">{asset.user || "-"}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* Asset List Item Component - Compact Design */
function AssetListItem({ asset, onClick }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center bg-white border border-gray-200 rounded-md px-2 py-1.5 hover:shadow-sm transition-all duration-200 cursor-pointer group hover:border-indigo-300 hover:bg-indigo-50/30"
    >
      <div className="relative w-10 h-10 rounded overflow-hidden mr-2 flex-shrink-0 bg-gray-100 border border-gray-200">
        <img
          src={asset.image_url || `https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=100&h=100&fit=crop`}
          alt={asset.name}
          className="w-full h-full object-contain bg-gray-100 group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=100&h=100&fit=crop';
          }}
        />
      </div>
      <div className="flex-1 min-w-0 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-gray-900 text-base truncate">{toFullWidth(asset.name)}</h4>
          <p className="text-xs text-gray-500 font-mono truncate">ID: {String(asset.id)}</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-sm text-gray-600">
          <span className="flex items-center gap-1 min-w-[60px]" title="使用者名">
            <User className="w-3 h-3 text-purple-500" />
            <span className="truncate">{asset.user || "-"}</span>
          </span>
          <span className="flex items-center gap-1 min-w-[50px]">
            <Users className="w-3 h-3 text-indigo-500" />
            <span>{asset.realuser}</span>
          </span>
          <span className="text-gray-400 min-w-[30px]">{asset.floor}</span>
        </div>
      </div>
    </div>
  );
}

// CONTINUES IN PART 4...
// client/src/components/BuildingView.js - PART 4/4: CompactAssetModal with Improved Inventory
// client/src/components/BuildingView.js - PART 4/4: CompactAssetModal with Improved Inventory

/* COMPACT ASSET MODAL - WITH 30-SEC UNDO OR UNTIL CLOSE */
function CompactAssetModal({ asset, onClose, onUpdate, showNotification, navigate }) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [inventoryStatus, setInventoryStatus] = useState(asset.inventory_status || 'pending');
  const [updating, setUpdating] = useState(false);
  const [showUndo, setShowUndo] = useState(false);
  const [undoTimer, setUndoTimer] = useState(null);
  const [justCompleted, setJustCompleted] = useState(false); // Track if completed in THIS session

  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  const handleCopyAssetNumber = async () => {
    const textToCopy = String(asset?.id ?? "");
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showNotification("📋 Asset number copied", "success");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = textToCopy;
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        textarea.style.left = "-1000px";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        showNotification("📋 Asset number copied", "success");
      } catch {
        showNotification("Failed to copy asset number", "error");
      }
    }
  };

  // Use image_urls array if available, fallback to single image_url
  const assetImages = asset.image_urls && asset.image_urls.length > 0
    ? asset.image_urls
    : (asset.image_url ? [asset.image_url] : []);
  const placeholderImage = 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=600&h=400&fit=crop';
  const displayImages = assetImages.length > 0 ? assetImages : [placeholderImage];

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [undoTimer]);

  // Handle Inventory Complete
  const handleInventoryComplete = async () => {
    try {
      const confirmed = await confirm({
        title: "Inventory complete?",
        message: "Mark inventory as complete for this asset?",
        confirmText: "Confirm",
        cancelText: "Cancel",
      });
      if (!confirmed) return;

      setUpdating(true);
      const updateData = {
        inventory_status: 'completed',
        inventory_date: new Date().toISOString()
      };
      const response = await axios.put(`${API_BASE_URL}/assets/${asset.id}`, updateData);
      setInventoryStatus('completed');
      setJustCompleted(true); // Mark as completed in THIS session
      setShowUndo(true);
      onUpdate({ ...asset, inventory_status: 'completed', inventory_date: new Date().toISOString() });
      showNotification("✅ Inventory completed!", "success");

      // 30-second timer
      const timer = setTimeout(() => {
        setShowUndo(false);
        setJustCompleted(false); // Reset after timer
      }, 30000);
      setUndoTimer(timer);
    } catch (err) {
      console.error("Error updating inventory:", err);
      showNotification(err.response?.data?.error || "Failed to update inventory", "error");
    } finally {
      setUpdating(false);
    }
  };

  // Handle Undo Inventory
  const handleUndoInventory = async () => {
    try {
      const confirmed = await confirm({
        title: "Undo inventory?",
        message: "Set inventory status back to pending?",
        confirmText: "Undo",
        cancelText: "Cancel",
        confirmVariant: "danger",
      });
      if (!confirmed) return;

      setUpdating(true);
      const updateData = {
        inventory_status: 'pending',
        inventory_date: null
      };
      const response = await axios.put(`${API_BASE_URL}/assets/${asset.id}`, updateData);
      setInventoryStatus('pending');
      setShowUndo(false);
      setJustCompleted(false);
      if (undoTimer) {
        clearTimeout(undoTimer);
        setUndoTimer(null);
      }
      onUpdate({ ...asset, inventory_status: 'pending', inventory_date: null });
      showNotification("↩️ Inventory reset", "info");
    } catch (err) {
      console.error("Error undoing inventory:", err);
      showNotification(err.response?.data?.error || "Failed to undo inventory", "error");
    } finally {
      setUpdating(false);
    }
  };

  const handlePrintPDF = () => {
    printAssetPDF(asset);
  };

  const handleViewFullDetails = () => {
    navigate(`/asset/${asset.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[1000] p-2 md:p-4"
      onClick={onClose}
    >
      {ConfirmDialogElement}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[96vh] md:h-auto md:max-h-[85vh] border border-gray-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-4 py-2 md:px-5 md:py-3 flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <h3 className="text-lg md:text-xl font-bold text-white">Asset Information</h3>
          <button onClick={onClose} className="p-1 md:p-1.5 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 md:p-4">
          

          {/* Asset Number with QR Code - Full Width at Top */}
          <div className="bg-indigo-50 rounded-lg p-2 md:p-3 border-2 border-indigo-300 mb-2 shadow-sm">
            <div className="flex items-start gap-2">
              {/* Left: Asset Number */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Barcode className="w-4 h-4 md:w-5 md:h-5 text-indigo-600" />
                  <p className="text-sm md:text-base font-bold text-indigo-700 uppercase tracking-wide">資産番号　（ＡＳＳＥＴ　ＮＵＭＢＥＲ）</p>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xl md:text-2xl font-bold text-gray-900 font-mono break-all">{asset.id}</p>
                  <button
                    type="button"
                    onClick={handleCopyAssetNumber}
                    className="p-2 rounded-lg bg-white hover:bg-indigo-100 border border-indigo-300 text-indigo-700 transition-all flex-shrink-0"
                    title="Copy asset number"
                    aria-label="Copy asset number"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-xs md:text-sm text-gray-600 mt-1">ＱＲコードをスキャンして資産を表示</p>
              </div>
              
              {/* Right: QR Code */}
              <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center flex-shrink-0 shadow-sm">
                {asset.qr_code_url ? (
                  <img src={asset.qr_code_url} alt="QR" className="w-full h-full object-contain p-1" />
                ) : (
                  <Barcode className="w-10 h-10 md:w-12 md:h-12 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 md:gap-3">
            {/* LEFT: Photo Only */}
            <div className="flex flex-col gap-1.5 md:gap-2">
              {/* Gallery */}
              <div className="flex gap-2 h-48 md:h-56 lg:h-64">
                {displayImages.length > 1 && (
                  <div className="flex flex-col gap-1 md:gap-2 w-10 md:w-12">
                    {displayImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImageIndex(idx)}
                        className={`w-full aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImageIndex === idx ? "border-indigo-600 ring-2 ring-indigo-200" : "border-gray-200"}`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" onError={(e) => e.target.src = placeholderImage} />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                  <img
                    src={displayImages[selectedImageIndex]}
                    alt={asset.name}
                    className="w-full h-full object-contain"
                    onError={(e) => e.target.src = placeholderImage}
                  />
                  {displayImages.length > 1 && (
                    <>
                      <button onClick={prevImage} className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow-lg hover:bg-white transition-all">
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button onClick={nextImage} className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 p-1.5 rounded-full shadow-lg hover:bg-white transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Recent Changes */}
              {/* <div className="flex-1 bg-yellow-50 rounded-lg border border-yellow-200 overflow-hidden">
                <div className="bg-yellow-100 px-2 py-1 border-b border-yellow-200 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  <p className="text-[10px] font-semibold text-yellow-700">Recent Changes (Last 3)</p>
                </div>
                <div className="p-2 space-y-1.5 overflow-y-auto max-h-32">
                  {(() => {
                    let history = [];
                    try {
                      if (asset.change_history) {
                        history = typeof asset.change_history === 'string' ? JSON.parse(asset.change_history) : asset.change_history;
                      }
                    } catch (e) {
                      history = [];
                    }
                    if (!Array.isArray(history) || history.length === 0) {
                      return (
                        <>
                          <div className="bg-white rounded p-1.5 border border-yellow-100 opacity-60">
                            <p className="text-[9px] text-gray-400 mb-0.5">No changes recorded</p>
                            <p className="text-[10px] text-gray-500 italic">Edit history will appear here</p>
                          </div>
                          <div className="bg-white rounded p-1.5 border border-yellow-100 opacity-40">
                            <p className="text-[9px] text-gray-400 mb-0.5">No previous changes</p>
                            <p className="text-[10px] text-gray-500 italic">History will appear here</p>
                          </div>
                        </>
                      );
                    }
                    return history.slice(0, 2).map((change, idx) => {
                      const dateStr = new Date(change.date).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      return (
                        <div key={idx} className={`bg-white rounded p-1.5 border border-yellow-100 ${idx === 1 ? 'opacity-70' : ''}`}>
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-[9px] text-gray-500">{dateStr}</p>
                            {idx === 0 && (
                              <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Latest</span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-700 line-clamp-2">
                            <span className="font-medium text-indigo-600">{change.user}</span>: {change.changes}
                          </p>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div> */}

              {/* Storage Location */}
              {/* <div className="h-20 bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-2 py-1 border-b border-gray-200 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-indigo-600" />
                  <p className="text-[10px] font-semibold text-gray-700">保管場所の地図 (SP-8全景、光都プラザ、相生info)</p>
                </div>
                <div className="h-[calc(100%-26px)] flex items-center justify-center p-2">
                  {asset.lat && asset.lon ? (
                    <div className="text-center">
                      <MapPin className="w-5 h-5 text-indigo-500 mx-auto mb-1" />
                      <p className="text-[10px] text-gray-600 leading-tight">{asset.lat.toFixed(4)}, {asset.lon.toFixed(4)}</p>
                      <p className="text-[9px] text-gray-400 mt-0.5">Map</p>
                    </div>
                  ) : (
                    <p className="text-[10px] text-gray-400">No coordinates available</p>
                  )}
                </div>
              </div> */}


            </div>

            {/* RIGHT: Information */}
            <div className="flex flex-col gap-1.5 md:gap-2">

              {/* 1. Management Location */}
              <div className="bg-orange-50 rounded-lg p-1.5 md:p-2 border border-orange-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Building2 className="w-3 h-3 text-orange-600" />
                  <p className="text-xs md:text-sm font-semibold text-orange-700 uppercase">管理箇所 (Management Location)</p>
                </div>
                <p className="text-[10px] md:text-xs text-gray-700">{asset.management_location || "-"}</p>
              </div>

              {/* 2. Product Name */}
              <div className="bg-green-50 rounded-lg p-1.5 md:p-2 border border-green-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <FileText className="w-3 h-3 text-green-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-green-700 uppercase">品名 (Product Name)</p>
                </div>
                <p className="text-sm md:text-base font-bold text-gray-900 leading-tight">{asset.name || "-"}</p>
              </div>

              {/* 3. User */}
              <div className="bg-purple-50 rounded-lg p-1.5 md:p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <User className="w-3 h-3 text-purple-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-purple-700 uppercase">使用者名 (User)</p>
                </div>
                <p className="text-sm md:text-base text-gray-700 font-medium">{asset.user || "-"}</p>
              </div>

              {/* 5. Actual User */}
              <div className="bg-purple-50 rounded-lg p-1.5 md:p-2 border border-purple-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Users className="w-3 h-3 text-purple-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-purple-700 uppercase">Actual User</p>
                </div>
                <p className="text-sm md:text-base text-gray-700 font-medium">{asset.actual_user || "-"}</p>
              </div>

              {/* 6. Company Name */}
              <div className="bg-blue-50 rounded-lg p-1.5 md:p-2 border border-blue-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Building2 className="w-3 h-3 text-blue-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-blue-700 uppercase">業者名 (Company Name)</p>
                </div>
                <p className="text-[10px] md:text-xs text-gray-700">{asset.company_name || "-"}</p>
              </div>


              {/* 8. Storage Location */}
              <div className="bg-cyan-50 rounded-lg p-1.5 md:p-2 border border-cyan-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-cyan-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-cyan-700 uppercase">保管場所の地図 (Storage Location)</p>
                </div>
                <div className="flex items-center gap-2">
                  {asset.lat && asset.lon ? (
                    <p className="text-sm md:text-base text-gray-700">{asset.lat.toFixed(4)}, {asset.lon.toFixed(4)}</p>
                  ) : (
                    <p className="text-sm md:text-base text-gray-700">-</p>
                  )}
                </div>
              </div>

              {/* 7. QR Code */}
              {/* 9. Recent Changes - Last 3 */}
              <div className="bg-yellow-50 rounded-lg p-1.5 md:p-2 border border-yellow-200">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-yellow-600" />
                  <p className="text-[9px] md:text-[10px] font-semibold text-yellow-700 uppercase">Recent Changes</p>
                </div>
                <div className="space-y-0.5 max-h-12 md:max-h-16 overflow-y-auto">
                  {(() => {
                    let history = [];
                    try {
                      if (asset.change_history) {
                        history = typeof asset.change_history === 'string'
                          ? JSON.parse(asset.change_history)
                          : asset.change_history;
                      }
                    } catch (e) {
                      history = [];
                    }

                    if (!Array.isArray(history) || history.length === 0) {
                      return <p className="text-sm text-gray-500 italic">No changes recorded</p>;
                    }

                    return history.slice(0, 2).map((change, idx) => {
                      const dateStr = new Date(change.date).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      });

                      return (
                        <div key={idx} className="text-sm text-gray-700">
                          <span className="text-gray-500">{dateStr}</span> - <span className="font-medium text-indigo-600">{change.user}</span>: {change.changes}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - SMART INVENTORY BUTTONS WITH STATUS CHANGE */}
        <div className="border-t border-gray-200 px-3 md:px-5 py-2 flex flex-wrap justify-between items-center gap-2 flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            {/* LOGIC: Different buttons based on inventory state */}
            {inventoryStatus === 'completed' && justCompleted && showUndo ? (
              /* Just completed in THIS session - show quick undo */
              <button
                onClick={handleUndoInventory}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              >
                <Undo2 className="w-4 h-4" />
                Undo Inventory
              </button>
            ) : inventoryStatus === 'completed' ? (
              /* Already inventoried (from previous session) - show status with option to reset */
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl text-sm font-semibold border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  Inventoried ✓
                </div>
                <button
                  onClick={handleUndoInventory}
                  disabled={updating}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200 text-gray-700 rounded-xl font-medium transition-all shadow-sm text-sm border border-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" />
                  Undo
                </button>
              </div>
            ) : (
              /* Not yet inventoried - show complete button */
              <button
                onClick={handleInventoryComplete}
                disabled={updating}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg text-sm disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                {updating ? 'Processing...' : 'Mark as Inventoried'}
              </button>
            )}
            <button
              onClick={handlePrintPDF}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-100 to-gray-100 hover:from-slate-200 hover:to-gray-200 text-gray-700 rounded-xl font-medium transition-all shadow-sm text-sm border border-gray-200"
            >
              <FileText className="w-4 h-4" />
              Print PDF
            </button>
          </div>
          <button
            onClick={handleViewFullDetails}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-medium transition-all shadow-md hover:shadow-lg text-sm"
          >
            <Eye className="w-4 h-4" />
            View Full Details
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}