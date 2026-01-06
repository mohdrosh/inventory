// client/src/components/DashboardView.js - PART 1/6
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useConfirmDialog } from "./useConfirmDialog";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config';
import MapPanel from "./MapPanel";
import {
  Search, Building2, Activity, Package, ShieldAlert, ArrowLeft,
  MapPin, Grid3x3, RefreshCw, AlertCircle,
  Clock, Loader2, Menu, LogOut, User, Camera, X,
  ScanLine, CheckCircle2, ChevronLeft, ChevronRight, Bell,
  Home,
  StepBack,
  Undo
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AIAssistant from './Chatbot';

// Convert half-width katakana to full-width
function toFullWidth(str) {
  if (!str) return str;
  
  const halfToFull = {
    // Two-character combinations FIRST (dakuten/handakuten)
    'ｶﾞ': 'ガ', 'ｷﾞ': 'ギ', 'ｸﾞ': 'グ', 'ｹﾞ': 'ゲ', 'ｺﾞ': 'ゴ',
    'ｻﾞ': 'ザ', 'ｼﾞ': 'ジ', 'ｽﾞ': 'ズ', 'ｾﾞ': 'ゼ', 'ｿﾞ': 'ゾ',
    'ﾀﾞ': 'ダ', 'ﾁﾞ': 'ヂ', 'ﾂﾞ': 'ヅ', 'ﾃﾞ': 'デ', 'ﾄﾞ': 'ド',
    'ﾊﾞ': 'バ', 'ﾋﾞ': 'ビ', 'ﾌﾞ': 'ブ', 'ﾍﾞ': 'ベ', 'ﾎﾞ': 'ボ',
    'ﾊﾟ': 'パ', 'ﾋﾟ': 'ピ', 'ﾌﾟ': 'プ', 'ﾍﾟ': 'ペ', 'ﾎﾟ': 'ポ',
    'ｳﾞ': 'ヴ', 'ﾜﾞ': 'ヷ', 'ｦﾞ': 'ヺ',
  };
  
  const singleHalfToFull = {
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
  
  // Then replace single characters
  Object.keys(singleHalfToFull).forEach(half => {
    result = result.split(half).join(singleHalfToFull[half]);
  });
  
  return result;
}
export default function DashboardView() {
  const navigate = useNavigate();

  // State Management
  const [assets, setAssets] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [highlightBuildingId, setHighlightBuildingId] = useState(null);
  const [focusBuildingId, setFocusBuildingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [notification, setNotification] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  // Scanner States
  const [showScanner, setShowScanner] = useState(false);
  const [scannerMode, setScannerMode] = useState('manual');
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Notification Panel States
  const [notifications, setNotifications] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  // Refs
  const html5QrCodeRef = useRef(null);
  const notificationPanelRef = useRef(null);

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Fetch Assets Function
  const fetchAssets = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await axios.get(`${API_BASE_URL}/assets`);
      setAssets(res.data || []);
      setLastUpdated(new Date());
      setError(null);

      if (isRefresh) {
        showNotification("Data refreshed successfully", "success");
      }
    } catch (err) {
      console.error("Error fetching assets:", err);
      setError("Failed to load assets. Please check your connection.");
      showNotification("Failed to load assets", "error");
      setAssets([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Fetch Buildings from API
  const fetchBuildings = useCallback(async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/buildings`);

      // Transform to match existing format
      const transformedBuildings = (res.data || []).map((building) => ({
        id: `b-${building.id}`,
        buildingId: building.id,
        name: building.name,
        lat: building.lat || 0,
        lon: building.lon || 0,
        total: building.total_assets || 0,
        desc: building.description || `Contains 含まれています ${building.total_assets || 0} assets across multiple rooms and floors 複数の部屋やフロアにまたがる資産.`,
        image: building.primary_image_url || building.images?.[0]?.image_url || 'images/istockSPring.jpg',
      }));

      setBuildings(transformedBuildings);
    } catch (err) {
      console.error("Error fetching buildings:", err);
      // Fallback: generate from assets if API fails
      generateBuildingsFromAssets();
    }
  }, []);

  // Fallback: Generate buildings from assets (backup method)
  const generateBuildingsFromAssets = useCallback(() => {
    if (assets.length === 0) return;

    const grouped = assets.reduce((acc, asset) => {
      const key = asset.building || "Unknown Building 不明な建物";
      if (!acc[key]) acc[key] = [];
      acc[key].push(asset);
      return acc;
    }, {});

    const generatedBuildings = Object.entries(grouped).map(([buildingName, items], i) => {
      const avgLat = items.reduce((s, a) => s + (a.lat || 0), 0) / items.length;
      const avgLon = items.reduce((s, a) => s + (a.lon || 0), 0) / items.length;
      const total = items.length;

      return {
        id: `b-${i}`,
        name: buildingName,
        lat: avgLat,
        lon: avgLon,
        total,
        desc: `Contains 含まれています ${total} assets across multiple rooms and floors 複数の部屋やフロアにまたがる資産.`,
        image: 'images/istockSPring.jpg',
      };
    });

    setBuildings(generatedBuildings);
  }, [assets]);

  useEffect(() => {
    fetchAssets();
    fetchBuildings();
  }, [fetchAssets, fetchBuildings]);
  // client/src/components/DashboardView.js - PART 2/6 (CONTINUE FROM PART 1)

  // Fetch user's read notification IDs from backend
  const fetchReadNotifications = useCallback(async () => {
    if (!user.userId) return;

    try {
      setLoadingNotifications(true);
      const res = await axios.get(`${API_BASE_URL}/notifications/read/${user.userId}`);
      setReadNotificationIds(res.data.readIds || []);
    } catch (err) {
      console.error("Error fetching read notifications:", err);
      // Fallback to localStorage if API fails
      const saved = localStorage.getItem(`readNotificationIds_${user.userId}`);
      setReadNotificationIds(saved ? JSON.parse(saved) : []);
    } finally {
      setLoadingNotifications(false);
    }
  }, [user.userId]);

  // Fetch read notifications on mount
  useEffect(() => {
    fetchReadNotifications();
  }, [fetchReadNotifications]);

  // Generate notifications from assets data
  const generateNotifications = useCallback(() => {
    if (assets.length === 0) return;

    const notifs = [];
    const now = new Date();

    // Inventory completed notifications
    assets.forEach(asset => {
      if (asset.inventory_status === 'completed 完成した' && asset.last_inventoried) {
        const inventoriedDate = new Date(asset.last_inventoried);
        const daysDiff = Math.floor((now - inventoriedDate) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
          notifs.push({
            id: `inv-${asset.id}`,
            type: 'inventory',
            title: '棚卸完了',
            message: `${asset.name || asset.id} の棚卸が完了しました`,
            asset: asset,
            timestamp: inventoriedDate,
            color: 'green'
          });
        }
      }

      // GPS location updates (last 24 hours)
      if (asset.gps_lat && asset.gps_lon && asset.updated_at) {
        const updatedDate = new Date(asset.updated_at);
        const hoursDiff = Math.floor((now - updatedDate) / (1000 * 60 * 60));
        if (hoursDiff <= 24) {
          notifs.push({
            id: `gps-${asset.id}`,
            type: 'location',
            title: '位置情報更新',
            message: `${asset.name || asset.id} の位置が更新されました`,
            asset: asset,
            timestamp: updatedDate,
            color: 'blue'
          });
        }
      }

      // Maintenance/attention needed
      if (asset.inventory_status === 'pending 保留中') {
        const createdDate = asset.created_at ? new Date(asset.created_at) : now;
        notifs.push({
          id: `pending-${asset.id}`,
          type: 'pending',
          title: '未棚卸',
          message: `${asset.name || asset.id} は棚卸が必要です`,
          asset: asset,
          timestamp: createdDate,
          color: 'orange'
        });
      }
    });

    // Sort by timestamp (newest first) and limit
    notifs.sort((a, b) => b.timestamp - a.timestamp);
    setNotifications(notifs.slice(0, 20));
  }, [assets]);

  // Update notifications when assets change
  useEffect(() => {
    generateNotifications();
  }, [assets, generateNotifications]);

  // Close notification panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target)) {
        setShowNotificationPanel(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get unread count
  const unreadCount = useMemo(() => {
    return notifications.filter(n => !readNotificationIds.includes(n.id)).length;
  }, [notifications, readNotificationIds]);

  // Mark notification as read (API call)
  const markAsRead = async (notifId) => {
    if (readNotificationIds.includes(notifId)) return;

    // Optimistic update
    const newReadIds = [...readNotificationIds, notifId];
    setReadNotificationIds(newReadIds);

    // Save to localStorage as backup
    localStorage.setItem(`readNotificationIds_${user.userId}`, JSON.stringify(newReadIds));

    // API call
    if (user.userId) {
      try {
        await axios.post(`${API_BASE_URL}/notifications/read`, {
          userId: user.userId,
          notificationId: notifId
        });
      } catch (err) {
        console.error("Error saving read status:", err);
      }
    }
  };

  // Mark all as read (API call)
  const markAllAsRead = async () => {
    const allIds = notifications.map(n => n.id);

    // Optimistic update
    setReadNotificationIds(allIds);

    // Save to localStorage as backup
    localStorage.setItem(`readNotificationIds_${user.userId}`, JSON.stringify(allIds));

    // API call
    if (user.userId) {
      try {
        await axios.post(`${API_BASE_URL}/notifications/read-all`, {
          userId: user.userId,
          notificationIds: allIds
        });
      } catch (err) {
        console.error("Error saving read-all status:", err);
      }
    }
  };

  // Format time ago
  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'たった今';
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffDays < 7) return `${diffDays}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  // Handle notification click - navigate directly to asset details
  const handleNotificationClick = (notif) => {
    markAsRead(notif.id);
    setShowNotificationPanel(false);
    if (notif.asset?.id) {
      // Navigate directly to asset details page
      navigate(`/asset/${encodeURIComponent(notif.asset.id)}`);
    } else if (notif.asset?.building) {
      // Fallback to building if no asset ID
      navigate(`/building/${encodeURIComponent(notif.asset.building)}`);
    }
  };

  // Notification Handler
  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Logout Handler
  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    navigate("/login");
    showNotification("Logged out successfully 正常にログアウトされました", "success 成功");
  };

  // Navigation Handler
  const handleNavigateToAsset = (building, floor, room, assetId) => {
    navigate(`/building/${encodeURIComponent(building)}`, {
      state: {
        targetFloor: floor,
        targetRoom: room,
        targetAssetId: assetId
      }
    });
  };
  // client/src/components/DashboardView.js - PART 3/6 (CONTINUE FROM PART 2)

  // Asset Search Function
  const searchAssetByCode = async (code) => {
    try {
      const trimmedCode = code.trim();
      if (!trimmedCode) {
        showNotification("⚠️ Please enter a valid code 有効なコードを入力してください", "error エラー");
        return;
      }

      setScanning(true);

      const foundAsset = assets.find(asset =>
        asset.id?.toLowerCase() === trimmedCode.toLowerCase() ||
        asset.name?.toLowerCase().includes(trimmedCode.toLowerCase())
      );

      if (foundAsset) {
        setScanSuccess(true);
        showNotification(`✅ Asset Found 見つかった資産: ${foundAsset.name}`, "success 成功");

        // Delay navigation to show success state
        setTimeout(() => {
          setShowScanner(false);
          setManualCode('');
          setScanSuccess(false);
          stopCamera();
          // Navigate to building page with asset info to open popup modal
          navigate(`/building/${encodeURIComponent(foundAsset.building)}`, {
            state: {
              targetFloor: foundAsset.floor,
              targetRoom: foundAsset.room,
              targetAssetId: foundAsset.id
            }
          });
        }, 1500);
      } else {
        showNotification(`❌ No asset found for code コードにアセットが見つかりません: ${trimmedCode}`, "error エラー");
        setScanning(false);
      }
    } catch (err) {
      console.error("Error searching asset:", err);
      showNotification("❌ Search failed - please try again 検索に失敗しました - もう一度お試しください", "error エラー");
      setScanning(false);
    }
  };

  // Camera Scanner Functions
  const startCameraScanner = async () => {
    try {
      const { Html5Qrcode } = await import('html5-qrcode');

      html5QrCodeRef.current = new Html5Qrcode("qr-reader-container");

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.777778,
        },
        (decodedText) => {
          console.log("Scanned:", decodedText);

          // Stop camera and search
          stopCamera().then(() => {
            showNotification("🔍 Code detected - searching asset コードが検出されました - 資産を検索中...", "info 情報");
            setTimeout(() => {
              searchAssetByCode(decodedText);
            }, 800);
          });
        },
        (errorMessage) => {
          // Ignore scanning errors
        }
      );

      showNotification("📸 Point at QR/barcode QR/バーコードをポイント", "info 情報");
    } catch (err) {
      console.error("Camera error:", err);
      showNotification("❌ Camera not available - using manual mode カメラが利用できません - 手動モードを使用しています", "error エラー");
      setScannerMode('manual');
    }
  };

  const stopCamera = async () => {
    try {
      if (html5QrCodeRef.current) {
        const scannerState = await html5QrCodeRef.current.getState();
        if (scannerState === 2) { // Html5QrcodeScannerState.SCANNING
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current = null;
      }
    } catch (err) {
      console.error("Error stopping camera:", err);
    }
  };

  // Handle Scanner Modal Close
  const handleCloseScanner = async () => {
    await stopCamera();
    setShowScanner(false);
    setManualCode('');
    setScanSuccess(false);
    setScanning(false);
  };

  // Handle Scanner Mode Switch
  const handleScannerModeChange = async (mode) => {
    await stopCamera();
    setScannerMode(mode);
    setScanSuccess(false);
  };

  // Reset Scanner for New Scan
  const handleScanAgain = async () => {
    setScanSuccess(false);
    setScanning(false);
    if (scannerMode === 'camera') {
      await startCameraScanner();
    }
  };

  // Scanner Effect
  useEffect(() => {
    if (showScanner && scannerMode === 'camera' && !scanSuccess) {
      startCameraScanner();
    }
    return () => {
      stopCamera();
    };
  }, [showScanner, scannerMode, scanSuccess]);

  // Disable body scroll when modals are open
  useEffect(() => {
    if (showScanner) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showScanner]);

  // Filtered Buildings (NO PAGINATION)
  const filteredBuildings = useMemo(() => {
    const q = search.toLowerCase();
    return buildings.filter((b) => b.name.toLowerCase().includes(q));
  }, [buildings, search]);

  // Statistics
  const totalAssets = assets.length;
  const verificationPendingCount = assets.filter(
    (a) => a.inventory_status === "completed"
  ).length;
  const maintenanceAssetCount = assets.filter(
    (a) => a.inventory_status !== "completed"
  ).length;

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 sm:w-16 sm:h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-base sm:text-lg font-semibold">Loading dashboard ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error && assets.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-md w-full text-center border border-gray-100">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Connection Error 接続エラー</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => fetchAssets()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
          >
            Try Again もう一度やり直してください
          </button>
        </div>
      </div>
    );
  }
  // client/src/components/DashboardView.js - PART 4/6 (CONTINUE FROM PART 3)
  // JSX RETURN STARTS HERE

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-white to-purple-50">

      {/* ============ NOTIFICATIONS ============ */}
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

      {/* ============ QR/BARCODE SCANNER MODAL ============ */}
      <AnimatePresence>
        {showScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={handleCloseScanner}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                    <ScanLine className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Asset Scanner アセットスキャナー</h3>
                    <p className="text-xs text-indigo-100">Scan or enter asset code 資産コードをスキャンまたは入力</p>
                  </div>
                </div>
                <button
                  onClick={handleCloseScanner}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-6">
                {/* Scanner Mode Toggle */}
                <div className="flex bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-1 mb-5 border border-gray-200">
                  <button
                    onClick={() => handleScannerModeChange('camera')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${scannerMode === 'camera'
                      ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100'
                      : 'text-gray-600'
                      }`}
                  >
                    <Camera className="w-5 h-5" />
                    Camera Scan カメラスキャン
                  </button>
                  <button
                    onClick={() => handleScannerModeChange('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${scannerMode === 'manual'
                      ? 'bg-white text-indigo-600 shadow-lg shadow-indigo-100'
                      : 'text-gray-600'
                      }`}
                  >
                    <Search className="w-5 h-5" />
                    Manual Entry 手動入力
                  </button>
                </div>

                {/* Camera Mode */}
                {scannerMode === 'camera' ? (
                  <div className="space-y-4">
                    <div id="qr-reader-container" className="relative aspect-video bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-200">
                      {/* html5-qrcode injects video here */}
                    </div>

                    {/* Success State - Show Scan Again Button */}
                    {scanSuccess ? (
                      <button
                        onClick={handleScanAgain}
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 text-lg"
                      >
                        <Camera className="w-6 h-6" />
                        Scan Again 再スキャン
                      </button>
                    ) : (
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
                        <p className="text-sm text-gray-700 text-center">
                          <span className="font-semibold">📱 Supports サポート:</span> QR codes & all standard barcodes (EAN, UPC, Code128, etc.) QR コードとすべての標準バーコード (EAN、UPC、Code128 など)
                        </p>
                        <p className="text-xs text-gray-600 text-center mt-1">
                          Hold steady and ensure good lighting for best results 安定した姿勢を保ち、十分な照明を確保することで最良の結果が得られます
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual Mode */
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-gray-700 mb-3">
                        Enter Asset ID or Barcode 資産IDまたはバーコードを入力
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={manualCode}
                          onChange={(e) => setManualCode(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && manualCode.trim()) {
                              searchAssetByCode(manualCode);
                            }
                          }}
                          placeholder="e.g., ASSET-001, 123456789"
                          className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 text-lg transition-all"
                          autoFocus
                        />
                        {manualCode && (
                          <button
                            onClick={() => setManualCode('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-100 rounded-lg transition-all"
                          >
                            <X className="w-5 h-5 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => searchAssetByCode(manualCode)}
                      disabled={scanning || !manualCode.trim()}
                      className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 rounded-xl font-bold transition-all shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center gap-2 text-lg"
                    >
                      {scanning ? (
                        <>
                          <Loader2 className="w-6 h-6 animate-spin" />
                          Searching 検索中...
                        </>
                      ) : (
                        <>
                          <Search className="w-6 h-6" />
                          Search Asset アセットの検索
                        </>
                      )}
                    </button>
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs text-gray-600 text-center">
                        💡 You can search by asset ID, name, barcode, or QR code 資産ID、名前、バーコード、QRコードで検索できます
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ CONFIRMATION DIALOG ============ */}
      {ConfirmDialogElement}

      {/* ============ HEADER ============ */}
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
        <div className="w-full px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title & Stats */}
            <div className="flex items-center gap-3 sm:gap-6 flex-1 min-w-0">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex-shrink-0"
              >
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  SPring-8
                </h1>
                {/* List View button under SPring-8 - visible only in Map View */}
                {viewMode === "map" && (
                  <button
                    onClick={() => setViewMode("list")}
                    className="mt-1 flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-all"
                  >
                    <Undo className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    Dashboard ダッシュボード
                  </button>
                )}
              </motion.div>

              {/* Desktop Stats */}
              <div className="hidden md:flex items-center gap-2 lg:gap-3">
                <CompactStat icon={<Package />} value={totalAssets} label="Assets 資産" color="blue" />
                <CompactStat icon={<Building2 />} value={buildings.length} label="Buildings 建物" color="purple" />
                <CompactStat icon={<Activity />} value={verificationPendingCount} label="棚卸済" color="green" />
                <CompactStat icon={<ShieldAlert />} value={maintenanceAssetCount} label="未棚卸" color="orange" />
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {/* Desktop Search */}
              <div className="hidden lg:block relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search buildings 建物を検索する..."
                  className="w-56 xl:w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white shadow-sm"
                />
              </div>

              <button
                onClick={() => setShowScanner(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-semibold shadow-lg transition-all"
              >
                <ScanLine className="w-4 h-4" />
                Scan Asset アセットのスキャン
              </button>

              {/* Desktop Action Buttons */}
              <div className="hidden lg:flex items-center gap-2">
                {/* Notification Bell */}
                <div className="relative" ref={notificationPanelRef}>
                  <button
                    onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                    className="relative p-2 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl transition-all shadow-sm border border-gray-200"
                    title="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Notification Panel */}
                  <AnimatePresence>
                    {showNotificationPanel && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-[100]"
                      >
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Bell className="w-4 h-4 text-white" />
                            <span className="text-white font-semibold text-sm">通知</span>
                            {unreadCount > 0 && (
                              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">
                                {unreadCount}件の未読
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && (
                            <button
                              onClick={markAllAsRead}
                              className="text-xs text-white/80 hover:text-white transition-colors"
                            >
                              すべて既読
                            </button>
                          )}
                        </div>

                        <div className="max-h-80 overflow-y-auto">
                          {notifications.filter(n => !readNotificationIds.includes(n.id)).length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                              <p className="text-sm">未読の通知はありません</p>
                            </div>
                          ) : (
                            notifications
                              .filter(notif => !readNotificationIds.includes(notif.id))
                              .map((notif) => {
                                return (
                                  <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors bg-indigo-50/50"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${notif.color === 'green' ? 'bg-green-100 text-green-600' :
                                        notif.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                                          notif.color === 'orange' ? 'bg-orange-100 text-orange-600' :
                                            'bg-gray-100 text-gray-600'
                                        }`}>
                                        {notif.type === 'inventory' && <CheckCircle2 className="w-4 h-4" />}
                                        {notif.type === 'location' && <MapPin className="w-4 h-4" />}
                                        {notif.type === 'pending' && <Clock className="w-4 h-4" />}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className="text-xs font-semibold text-gray-900">
                                            {notif.title}
                                          </p>
                                          <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                                        </div>
                                        <p className="text-xs text-gray-600 truncate">{notif.message}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5">
                                          {notif.asset?.building} • {formatTimeAgo(notif.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={() => fetchAssets(true)}
                  disabled={refreshing}
                  className="p-2 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 rounded-xl transition-all disabled:opacity-50 shadow-sm border border-gray-200"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                </button>

                <div className="flex bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden p-0.5 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "list"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                    title="List View"
                  >
                    <Grid3x3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("map")}
                    className={`p-2 rounded-lg transition-all ${viewMode === "map"
                      ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                    title="Map View"
                  >
                    <MapPin className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* User & Logout - Desktop */}
              <div className="hidden lg:flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                  <div className="w-7 h-7 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden xl:block">
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{user.name || "User"}</p>
                    <p className="text-xs text-gray-500 leading-tight">{user.role || "Staff"}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: "Logout Confirmation",
                      message: "Are you sure you want to logout?",
                      confirmText: "Logout",
                      cancelText: "Cancel",
                      confirmVariant: "danger",
                      body: (
                        <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                          <LogOut className="w-8 h-8 text-white" />
                        </div>
                      ),
                    });
                    if (confirmed) handleLogout();
                  }}
                  className="p-2 bg-gradient-to-br from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl transition-all shadow-sm border border-red-100"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all shadow-sm border border-gray-200"
              >
                <Menu className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Mobile Stats */}
          <div className="md:hidden grid grid-cols-4 gap-2 mt-3">
            <CompactStat icon={<Package />} value={totalAssets} label="Assets 資産" color="blue" isMobile />
            <CompactStat icon={<Building2 />} value={buildings.length} label="Buildings 建物" color="purple" isMobile />
            <CompactStat icon={<Activity />} value={verificationPendingCount} label="棚卸済" color="green" isMobile />
            <CompactStat icon={<ShieldAlert />} value={maintenanceAssetCount} label="未棚卸" color="orange" isMobile />
          </div>

          {/* Mobile Search */}
          <div className="lg:hidden mt-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 bg-white shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {mobileMenuOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="lg:hidden mt-3 overflow-hidden"
              >
                <div className="flex flex-col gap-2 p-3 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center gap-3 mb-2 px-4 py-3 bg-white rounded-xl shadow-sm border border-gray-200">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{user.name || "User ユーザー"}</p>
                      <p className="text-xs text-gray-500">{user.role || "Staff スタッフ"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setViewMode("list")}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm ${viewMode === "list"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-white text-gray-700 border border-gray-200"
                        }`}
                    >
                      <Grid3x3 className="w-4 h-4" />
                      List リスト
                    </button>
                    <button
                      onClick={() => setViewMode("map")}
                      className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm ${viewMode === "map"
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-white text-gray-700 border border-gray-200"
                        }`}
                    >
                      <MapPin className="w-4 h-4" />
                      Map 地図
                    </button>
                  </div>

                  <button
                    onClick={() => fetchAssets(true)}
                    disabled={refreshing}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold shadow-sm border border-gray-200"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh リフレッシュ
                  </button>

                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      const confirmed = await confirm({
                        title: "Logout Confirmation",
                        message: "Are you sure you want to logout?",
                        confirmText: "Logout",
                        cancelText: "Cancel",
                        confirmVariant: "danger",
                        body: (
                          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <LogOut className="w-8 h-8 text-white" />
                          </div>
                        ),
                      });
                      if (confirmed) handleLogout();
                    }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-br from-red-50 to-pink-50 hover:from-red-100 hover:to-pink-100 text-red-600 rounded-xl text-sm font-semibold shadow-sm border border-red-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout ログアウト
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ============ LIST VIEW (NO PAGINATION) ============ */}
      {viewMode === "list" && (
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <p className="text-gray-600 text-xs sm:text-sm font-medium">
              Showing 表示中 <span className="font-bold text-indigo-600">{filteredBuildings.length}</span> buildings 建物
              {search && <span className="text-gray-500"> (filtered)</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredBuildings.map((b, i) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onMouseEnter={() => setHighlightBuildingId(b.id)}
                onMouseLeave={() => setHighlightBuildingId(null)}
              >
                <BuildingCard
                  building={b}
                  onShowMap={() => {
                    setFocusBuildingId(b.id);
                    setViewMode("map");
                  }}
                />
              </motion.div>
            ))}

            {filteredBuildings.length === 0 && (
              <div className="col-span-full text-center py-16 bg-white rounded-2xl shadow-sm border border-gray-100">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">No buildings found 建物が見つかりませんでした</p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all"
                  >
                    Clear Search 検索をクリア
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ============ MAP VIEW ============ */}
      {/* ============ MAP VIEW ============ */}
      {viewMode === "map" && (
        <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative">
          {/* Building List Sidebar - DESKTOP ONLY (hidden on mobile/tablet) */}
          <div className="hidden lg:block w-96 flex-shrink-0 border-r border-gray-200 overflow-y-auto bg-white p-5 shadow-sm absolute left-0 top-0 bottom-0 z-10">


            <div className="space-y-2 pb-4">
              {filteredBuildings.map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-3 cursor-pointer rounded-xl p-3 transition-all ${highlightBuildingId === b.id
                    ? "bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-md"
                    : "bg-white border border-gray-200 hover:border-indigo-200 hover:shadow-md"
                    }`}
                  onMouseEnter={() => setHighlightBuildingId(b.id)}
                  onMouseLeave={() => setHighlightBuildingId(null)}
                  onClick={() => setFocusBuildingId(b.id)}
                >
                  <img
                    src={b.image}
                    alt={b.name}
                    className="w-16 h-16 object-cover rounded-lg shadow-sm"
                    onError={(e) => {
                      e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop';
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm truncate text-gray-900">{b.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">{b.total} assets 資産</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Container - Full screen on mobile/tablet, sidebar offset on desktop */}
          <div className="flex-1 min-h-0 overflow-hidden lg:pl-96">

            <MapPanel
              buildings={filteredBuildings}
              focusBuildingId={focusBuildingId}
              highlightBuildingId={highlightBuildingId}
              onMarkerHover={setHighlightBuildingId}
              onMarkerClick={setFocusBuildingId}
            />
          </div>
        </div>
      )}

      {/* ============ AI ASSISTANT (MOVABLE & MINIMIZABLE) ============ */}
      <AIAssistant
        assets={assets}
        onNavigate={handleNavigateToAsset}
      />
    </div>
  );
}

// ============ COMPACT STAT COMPONENT ============
function CompactStat({ icon, value, label, color, isMobile }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    green: "from-green-500 to-emerald-600",
    orange: "from-orange-500 to-amber-600",
  };

  if (isMobile) {
    return (
      <div className="bg-white rounded-xl p-2 border border-gray-200 text-center shadow-sm">
        <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors[color]} w-fit mx-auto mb-1 shadow-md`}>
          {React.cloneElement(icon, { className: "w-3.5 h-3.5 text-white" })}
        </div>
        <p className="text-base font-bold text-gray-900">{value}</p>
        <p className="text-[10px] text-gray-600 leading-tight font-medium">{label}</p>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1.5 border border-gray-200 shadow-sm">
      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${colors[color]} shadow-md`}>
        {React.cloneElement(icon, { className: "w-3.5 h-3.5 text-white" })}
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-600 leading-tight font-medium">{label}</p>
      </div>
    </div>
  );
}

// ============ BUILDING CARD COMPONENT ============
function BuildingCard({ building, onShowMap }) {
  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-gray-200 hover:border-indigo-300 hover:shadow-2xl transition-all duration-300 h-full flex flex-col">
      <div className="relative h-44 flex-shrink-0 bg-gray-100 overflow-hidden">
        <img
          src={building.image}
          alt={toFullWidth(building.name)}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          onError={(e) => {
            e.target.src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=300&fit=crop';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
        <div className="absolute bottom-3 left-3 right-3">
          <h3 className="text-white font-bold text-lg drop-shadow-lg truncate">
            {toFullWidth(building.name)}
          </h3>
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg shadow-md">
              <Package className="w-4 h-4 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{building.total}</span>
          </div>
          <span className="text-sm text-gray-600 font-medium">Assets 資産</span>
        </div>

        <p className="text-gray-600 text-sm leading-relaxed mb-4 flex-1">
          {building.desc}
        </p>

        <div className="flex gap-2">
          <button
            onClick={onShowMap}
            className="flex-1 bg-gradient-to-br from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 text-gray-700 font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-sm border border-gray-200"
          >
            <MapPin className="w-4 h-4" />
            Map 地図
          </button>
          <a
            href={`/building/${encodeURIComponent(building.name)}`}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl text-sm"
          >
            <Grid3x3 className="w-4 h-4" />
            View ビュー
          </a>
        </div>
      </div>
    </div>
  );
}