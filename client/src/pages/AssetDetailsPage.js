// client/src/pages/AssetDetailsPage.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from '../config';
import { motion } from "framer-motion";
import { printAssetPDF } from '../utils/printAsset';
import { useConfirmDialog } from "../components/useConfirmDialog";
import {
  ArrowLeft,
  MapPin,
  Loader2,
  Download,
  Building2,
  User,
  Barcode,
  Clock,
  Users,
  FileText,
  Edit,
  Save,
  X,
  Package,
  Layers,
  AlertCircle,
  Calendar,
  Info,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Printer,
  RotateCcw,
  Camera,
  Upload,
  Image,
  Trash2,
  Copy,
  Tag,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
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

export default function AssetDetailsPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedAsset, setEditedAsset] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [notification, setNotification] = useState(null);
  const [inventoryStatus, setInventoryStatus] = useState('pending');
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhotoType, setSelectedPhotoType] = useState('full');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false); // Deleting image state
  const [changeHistory, setChangeHistory] = useState([]);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false); // Download format dropdown

  const { confirm, ConfirmDialogElement } = useConfirmDialog();

  // Camera capture states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = back camera, 'user' = front camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Photo types with labels (Japanese/English)
  const photoTypes = [
    { id: 'full', label: '全体写真 (Full View)', color: 'indigo' },
    { id: 'closeup', label: 'アップ写真 (Close-up)', color: 'green' },
    { id: 'qr', label: 'QRコード (QR Code)', color: 'purple' },
  ];

  const showNotification = (message, type = "info") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const copyAssetNumber = async () => {
    const textToCopy = String(asset?.id ?? "");
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showNotification("📋 Asset number copied コピーされた資産番号", "success 成功");
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
        showNotification("📋 Asset number copied コピーされた資産番号", "success 成功");
      } catch {
        showNotification("Failed to copy asset number 資産番号のコピーに失敗しました", "error エラー");
      }
    }
  };

  useEffect(() => {
    fetchAssetDetails();
  }, [assetId]);

  // Disable body scroll when modals are open
  useEffect(() => {
    if (showImageZoom || showPhotoUpload || showCamera) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showImageZoom, showPhotoUpload, showCamera]);

  const fetchAssetDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/assets/${assetId}`);
      console.log('Fetched asset data:', response.data);
      console.log('Change history from server:', response.data.change_history);

      setAsset(response.data);
      setEditedAsset(response.data);
      setInventoryStatus(response.data.inventory_status || 'pending');

      // Load change history from the asset data
      try {
        const historyData = response.data.change_history;
        let history = [];
        if (historyData) {
          if (typeof historyData === 'string') {
            history = JSON.parse(historyData);
          } else if (Array.isArray(historyData)) {
            history = historyData;
          }
        }
        console.log('Parsed change history:', history);
        setChangeHistory(Array.isArray(history) ? history.slice(0, 10) : []);
      } catch (e) {
        console.error('Error parsing change history:', e);
        setChangeHistory([]);
      }
    } catch (err) {
      console.error("Error fetching asset details:", err);
      showNotification("Failed to load asset details アセットの詳細を読み込めませんでした", "error エラー");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Detect what fields changed
      const changedFields = [];
      const fieldLabels = {
        name: '品名 (Product Name)',
        room: '部屋 Room',
        building: '建物 Building',
        floor: '床 Floor',
        status: '状態 Status',
        user: '使用者 (User)',
        actual_user: '実際使用者 (Actual User)',
        management_location: '管理箇所 (Management Location)',
        company_name: '業者名 (Company Name)',
        invoice_number: '伝票番号 (Invoice Number)',
        installation_location: '設置場所 (Installation Location)',
        parent_asset_id: '親資産 Parent Asset',
        description: '説明 Description',
        notes: '注意事項 Notes',
      };

      Object.keys(fieldLabels).forEach(key => {
        const oldVal = asset[key] || '';
        const newVal = editedAsset[key] || '';
        if (oldVal !== newVal) {
          changedFields.push({
            field: fieldLabels[key],
            from: oldVal || '(empty)',
            to: newVal || '(empty)'
          });
        }
      });

      // Generate change history entry
      const changeTime = new Date().toISOString();
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const userName = userData.name || 'Unknown';

      // Build new change history entry
      const newHistoryEntry = changedFields.length > 0 ? {
        date: changeTime,
        user: userName,
        changes: changedFields.map(c => c.field).join(', ')
      } : null;

      // Parse existing change_history and add new entry
      let existingHistory = [];
      try {
        existingHistory = asset.change_history ? JSON.parse(asset.change_history) : [];
      } catch (e) {
        existingHistory = [];
      }

      if (newHistoryEntry) {
        existingHistory = [newHistoryEntry, ...existingHistory].slice(0, 10); // Keep last 10 changes
      }

      // Only send the fields that can be updated
      const updateData = {
        name: editedAsset.name,
        room: editedAsset.room,
        building: editedAsset.building,
        floor: editedAsset.floor,
        status: editedAsset.status,
        notes: editedAsset.notes,
        description: editedAsset.description,
        user: editedAsset.user,
        actual_user: editedAsset.actual_user,
        management_location: editedAsset.management_location,
        company_name: editedAsset.company_name,
        invoice_number: editedAsset.invoice_number,
        installation_location: editedAsset.installation_location,
        parent_asset_id: editedAsset.parent_asset_id,
        change_history: JSON.stringify(existingHistory),
      };

      console.log('Sending update:', updateData);
      console.log('Changed fields:', changedFields);

      if (changedFields.length === 0) {
        showNotification("No changes to save 保存する変更はありません", "info 情報");
        return;
      }

      const confirmed = await confirm({
        title: "Save changes 変更を保存する?",
        message: "Do you want to save your changes to this asset このアセットへの変更を保存しますか？?",
        confirmText: "Save 保存",
        cancelText: "Cancel キャンセル",
      });
      if (!confirmed) return;

      setSaving(true);

      const response = await axios.put(`${API_BASE_URL}/assets/${assetId}`, updateData);
      console.log('Update response:', response.data);

      // Update local change history for display (show up to 10 items)
      setChangeHistory(existingHistory.slice(0, 10));

      setAsset(response.data);
      setEditedAsset(response.data);
      setIsEditing(false);
      showNotification(`Asset updated successfully アセットが正常に更新されました(${changedFields.length} field(s) changed) フィールドが変更されました`, "success 成功");
    } catch (err) {
      console.error("Error updating asset:", err);
      const errorMessage = err.response?.data?.error || "Failed to update asset アセットの更新に失敗しました";
      showNotification(errorMessage, "error エラー");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    if (isEditing) {
      const confirmed = await confirm({
        title: "Discard Changes 変更の破棄?",
        message: "You have unsaved changes. Are you sure you want to discard them 保存されていない変更があります。破棄してもよろしいですか?",
        confirmText: "Discard 破棄",
        cancelText: "Keep Editing 編集を続ける",
        confirmVariant: "danger 危険",
      });
      if (!confirmed) return;
    }
    setEditedAsset({ ...asset });
    setIsEditing(false);
  };

  // Handle browser back/forward button with confirmation for unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditing) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handlePopState = async (e) => {
      if (isEditing) {
        e.preventDefault();

        const confirmed = await confirm({
          title: "Discard Changes 変更の破棄?",
          message: "You have unsaved changes. Are you sure you want to leave 変更が保存されていません。終了してもよろしいですか？?",
          confirmText: "Leave 離れる",
          cancelText: "Stay 滞在する",
          confirmVariant: "danger 危険",
        });

        if (confirmed) {
          setIsEditing(false);
          window.removeEventListener('popstate', handlePopState);
          navigate(-1);
        } else {
          window.history.pushState(null, '', window.location.pathname);
        }
      }
    };

    if (isEditing) {
      window.history.pushState(null, '', window.location.pathname);
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('popstate', handlePopState);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isEditing, confirm, navigate]);

  // Handle Inventory Complete
  const handleInventoryComplete = async () => {
    try {
      const confirmed = await confirm({
        title: "Inventory complete 在庫完了?",
        message: "Mark inventory as complete for this asset? この資産の在庫を完了としてマークする",
        confirmText: "Confirm 確認する",
        cancelText: "Cancel キャンセル",
      });
      if (!confirmed) return;

      setSaving(true);
      const updateData = {
        inventory_status: 'completed 完成した',
        inventory_date: new Date().toISOString()
      };
      console.log('Updating inventory for asset:', assetId, updateData);
      const response = await axios.put(`${API_BASE_URL}/assets/${assetId}`, updateData);
      console.log('Inventory update response:', response.data);
      setInventoryStatus('completed 完成した');
      setAsset({ ...asset, inventory_status: 'completed 完成した', inventory_date: new Date().toISOString() });
      showNotification("✅ Inventory completed 在庫完了!", "success 成功");
    } catch (err) {
      console.error("Error updating inventory:", err);
      const errorMessage = err.response?.data?.error || "Failed to update inventory";
      showNotification(errorMessage, "error エラー");
    } finally {
      setSaving(false);
    }
  };

  // Handle Undo Inventory
  const handleUndoInventory = async () => {
    try {
      const confirmed = await confirm({
        title: "Undo inventory インベントリを元に戻す?",
        message: "Set inventory status back to pending 在庫ステータスを保留に戻す?",
        confirmText: "Undo 元に戻す",
        cancelText: "Cancel キャンセル",
        confirmVariant: "danger 危険",
      });
      if (!confirmed) return;

      setSaving(true);
      const updateData = {
        inventory_status: 'pending 保留中',
        inventory_date: null
      };
      console.log('Undoing inventory for asset:', assetId, updateData);
      const response = await axios.put(`${API_BASE_URL}/assets/${assetId}`, updateData);
      console.log('Undo inventory response:', response.data);
      setInventoryStatus('pending 保留中');
      setAsset({ ...asset, inventory_status: 'pending 保留中', inventory_date: null });
      showNotification("↩️ Inventory status reset 在庫状況リセット", "info 情報");
    } catch (err) {
      console.error("Error undoing inventory 在庫を元に戻す際にエラーが発生しました:", err);
      const errorMessage = err.response?.data?.error || "Failed to undo inventory 在庫を元に戻すことができませんでした";
      showNotification(errorMessage, "error エラー");
    } finally {
      setSaving(false);
    }
  };

  // Handle PDF Print
  const handlePrintPDF = () => {
    // IDENTIFY PHOTOS BY TYPE (Main, Close-up, QR)
    // The backend saves filenames with type indicators (e.g., -full-, -closeup-, -qr-)
    // We prioritize the most recent photo of each type.

    let mainPhoto = null;
    let closeupPhoto = null;
    let qrPhoto = null;

    // Get all URLs, reverse to prioritize newest uploads
    let allUrls = [];
    if (asset.image_urls && Array.isArray(asset.image_urls)) {
      allUrls = [...asset.image_urls].reverse();
    } else if (asset.image_url) {
      allUrls = [asset.image_url];
      if (asset.image_url1) allUrls.push(asset.image_url1);
    }

    // Categorize images based on URL pattern
    allUrls.forEach(url => {
      if (!url) return;
      const lowerUrl = url.toLowerCase();

      if (lowerUrl.includes('-full-')) {
        if (!mainPhoto) mainPhoto = url;
      } else if (lowerUrl.includes('-closeup-')) {
        if (!closeupPhoto) closeupPhoto = url;
      } else if (lowerUrl.includes('-qr-')) {
        if (!qrPhoto) qrPhoto = url;
      }
    });

    // Fallback: If no Main photo found with explicit type, use the very first available image
    // (provided it's not already assigned to closeup or qr)
    if (!mainPhoto && allUrls.length > 0) {
      const fallback = allUrls.find(u => u !== closeupPhoto && u !== qrPhoto);
      if (fallback) mainPhoto = fallback;
    }

    // Define the specific 3 images to show
    const selectedPhotos = [
      { label: 'Main Photo (全体)', url: mainPhoto },
      { label: 'Close-up Photo (アップ)', url: closeupPhoto },
      { label: 'QR Code Photo (QR)', url: qrPhoto }
    ].filter(item => item.url);

    const photosHtml = selectedPhotos.length > 0
      ? `
        <div class="photos-section">
          <h2>📷 Asset Photos (Selected) アセット写真（選択済み）</h2>
          <div class="photos-grid">
            ${selectedPhotos.map((item, idx) => `
              <div class="photo-item">
                <img src="${item.url}" alt="${item.label}" onerror="this.style.display='none'" />
                <div class="photo-label">${item.label}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `
      : '<div class="no-photos"><p>No photos available for this asset</p></div>';

    const printContent = `
      <html>
      <head>
        <title>Asset: ${toFullWidth(asset.name)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 900px; margin: 0 auto; color: #333; font-size: 12px; }
          h1 { color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 0; font-size: 22px; }
          h2 { color: #4f46e5; font-size: 14px; margin-top: 20px; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
          .section { margin-bottom: 8px; }
          .label { font-weight: bold; color: #666; font-size: 10px; text-transform: uppercase; margin-bottom: 2px; }
          .value { font-size: 12px; color: #333; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .grid-4 { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 10px; }
          .header-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
          .asset-id { font-size: 20px; font-weight: bold; font-family: monospace; color: #4f46e5; }
          .status-badge { 
            display: inline-block; 
            padding: 3px 10px; 
            border-radius: 15px; 
            font-size: 10px; 
            font-weight: bold;
          }
          .status-completed { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .card { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; margin-bottom: 10px; }
          .card-indigo { background: #eef2ff; border: 1px solid #c7d2fe; }
          .card-green { background: #f0fdf4; border: 1px solid #bbf7d0; }
          .card-amber { background: #fffbeb; border: 1px solid #fde68a; }
          .card-orange { background: #fff7ed; border: 1px solid #fed7aa; }
          .photos-section { margin-top: 20px; page-break-before: auto; }
          .photos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-top: 10px; }
          .photo-item { text-align: center; }
          .photo-item img { 
            max-width: 100%; 
            max-height: 250px; 
            border: 1px solid #e5e7eb; 
            border-radius: 6px;
            object-fit: contain;
          }
          .photo-label { font-size: 10px; color: #666; margin-top: 5px; }
          .no-photos { background: #f3f4f6; padding: 15px; text-align: center; color: #6b7280; border-radius: 6px; margin-top: 10px; }
          .notes-box { background: #fef3c7; border: 1px solid #fcd34d; border-radius: 6px; padding: 10px; margin-top: 10px; }
          .footer { margin-top: 30px; font-size: 9px; color: #999; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          .qr-section { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
          .qr-code { width: 60px; height: 60px; border: 1px solid #c7d2fe; border-radius: 6px; background: white; }
          .field-box { background: white; border-radius: 4px; padding: 6px 8px; border: 1px solid #e5e7eb; }
          @media print {
            body { padding: 15px; }
            .photos-section { page-break-inside: avoid; }
            .photo-item { page-break-inside: avoid; }
            .card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header-info">
          <h1>📋 Asset Report / 資産レポート</h1>
          <div class="asset-id">${String(asset.id)}</div>
        </div>

        <!-- Primary Information / 基本情報 -->
        <h2>📦 基本情報 (Primary Information)</h2>
        <div class="card card-indigo">
          <div class="grid">
            <div class="section">
              <div class="label">資産番号 (Asset Number)</div>
              <div class="value" style="font-size: 16px; font-weight: bold; font-family: monospace;">${String(asset.id)}</div>
            </div>
            <div class="section">
              <div class="label">品名 (Product Name)</div>
              <div class="value" style="font-size: 14px; font-weight: bold;">${toFullWidth(asset.name) || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">管理箇所 (Management Location)</div>
              <div class="value">${asset.management_location || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">使用者名（和光）(User Name - Wako)</div>
              <div class="value">${asset.user || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">建屋 (Building)</div>
              <div class="value">${asset.building || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">設置場所 (Installation Location)</div>
              <div class="value">${asset.installation_location || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">詳細場所 / Room (Detailed Location)</div>
              <div class="value">${asset.room || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Floor</div>
              <div class="value">${asset.floor || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">設置状況 (Installation Status)</div>
              <div class="value">${asset.status || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Inventory Status 在庫状況</div>
              <div class="value">
                <span class="status-badge ${asset.inventory_status === 'completed 完成した' ? 'status-completed ステータス完了' : 'status-pending ステータス保留中'}">
                  ${asset.inventory_status === 'completed 完成した' ? '✓ Completed 完了しました' : '○ Pending 保留中'}
                </span>
              </div>
            </div>
          </div>
          ${asset.qr_code || asset.qr_code_url ? `
          <div class="qr-section">
            <div class="qr-code">
              ${asset.qr_code_url ? `<img src="${asset.qr_code_url}" alt="QR" style="width:100%;height:100%;object-fit:contain;" />` : ''}
            </div>
            <div>
              <div class="label">QR コード (QR Code)</div>
              <div class="value" style="font-family: monospace; font-size: 10px;">${asset.qr_code || 'N/A'}</div>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Current Year Data / 今年度データ -->
        <h2>📅 今年度データ (Current Year Data)</h2>
        <div class="card card-green">
          <div class="grid">
            <div class="section">
              <div class="label">建屋 (Building)</div>
              <div class="value">${toFullWidth(asset.building) || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">設置場所 (Installation Location)</div>
              <div class="value">${asset.installation_location || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">詳細場所 (Detailed Location)</div>
              <div class="value">${asset.room || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">設置状況 (Installation Status)</div>
              <div class="value">${asset.status || 'N/A'}</div>
            </div>
          </div>
          <div class="section" style="margin-top: 10px;">
            <div class="label">コメント (Comment)</div>
            <div class="value">${asset.notes || 'No comments'}</div>
          </div>
          <div class="grid" style="margin-top: 10px;">
            <div class="section">
              <div class="label">資産ラベル再発行 (Asset Label Reissue)</div>
              <div class="value">${asset.label_reissue || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">再発行理由 (Reissue Reason)</div>
              <div class="value">${asset.reissue_reason || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Last Year Data / 昨年度データ -->
        <h2>📆 昨年度データ (Last Year Data)</h2>
        <div class="card card-amber">
          <div class="grid">
            <div class="section">
              <div class="label">【昨年】調查者 (Last Year Investigator)</div>
              <div class="value">${asset.last_year_investigator || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">【昨年】建屋 (Last Year Building)</div>
              <div class="value">${asset.last_year_building || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">【昨年】設置場所 (Last Year Installation)</div>
              <div class="value">${asset.last_year_installation_location || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">【昨年】詳細場所 (Last Year Detailed Location)</div>
              <div class="value">${asset.last_year_detailed_location || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">【昨年】設置状況 (Last Year Installation Status)</div>
              <div class="value">${asset.last_year_installation_status || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">【昨年】コメント (Last Year Comment)</div>
              <div class="value">${asset.last_year_comment || 'N/A'}</div>
            </div>
          </div>
        </div>

        <!-- Additional Details -->
        <h2>📝 Additional Information / 追加情報</h2>
        <div class="card">
          <div class="grid">
            <div class="section">
              <div class="label">会社名 (Company Name)</div>
              <div class="value">${asset.company_name || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">伝票番号 (Invoice Number)</div>
              <div class="value">${asset.invoice_number || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">実使用者名 (Actual User)</div>
              <div class="value">${asset.actual_user || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Parent Asset ID</div>
              <div class="value">${asset.parent_asset_id || 'None'}</div>
            </div>
            <div class="section">
              <div class="label">Condition</div>
              <div class="value">${asset.condition || 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Type</div>
              <div class="value">${asset.type || 'N/A'}</div>
            </div>
          </div>
          ${asset.description ? `
          <div class="section" style="margin-top: 10px;">
            <div class="label">Description</div>
            <div class="value">${asset.description}</div>
          </div>
          ` : ''}
        </div>

        <!-- Dates -->
        <h2>🕐 Timestamps / 日時情報</h2>
        <div class="card">
          <div class="grid-3">
            <div class="section">
              <div class="label">Created Date 作成日</div>
              <div class="value">${asset.created_at ? new Date(asset.created_at).toLocaleString('ja-JP') : 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Last Updated</div>
              <div class="value">${asset.last_updated ? new Date(asset.last_updated).toLocaleString('ja-JP') : 'N/A'}</div>
            </div>
            <div class="section">
              <div class="label">Inventory Completed 在庫完了</div>
              <div class="value">${asset.inventory_completed_at ? new Date(asset.inventory_completed_at).toLocaleString('ja-JP') : 'Not yet'}</div>
            </div>
          </div>
        </div>

        ${photosHtml}

        <div class="footer">
          <p>Generated 生成された: ${new Date().toLocaleString('ja-JP')} | SPring-8 Asset Management System 資産管理システム</p>
          <p>Asset ID アセットID: ${String(asset.id)} | Document for official use only 公式使用のみの文書</p>
        </div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '', 'width=900,height=700');
    printWindow.document.write(printContent);
    printWindow.document.close();
    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  const handlePrintPDF_New = () => {
    printAssetPDF(asset);
  };

  // Download format state
  const [downloadFormat, setDownloadFormat] = useState('text');
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);

  const handleDownloadData = (format = 'text') => {
    const data = {
      assetNumber: String(asset.id),
      invoiceNumber: asset.invoice_number || "To be configured 設定対象",
      managementLocation: asset.management_location || "To be configured 設定対象",
      productName: toFullWidth(asset.name),
      companyName: asset.company_name || "To be configured 設定対象",
      qrCode: asset.qr_code || "To be generated 生成される",
      userName: asset.user || "To be configured 設定対象",
      actualUserName: asset.actual_user || "To be configured 設定対象",
      installationLocation: asset.installation_location || `${toFullWidth(asset.building)} ${asset.floor} Room ${asset.room}`,
      parentAssetId: asset.parent_asset_id || "None",
      building: toFullWidth(asset.building),
      floor: asset.floor,
      room: asset.room,
      status: asset.status,
      condition: asset.condition || "N/A",
      description: asset.description || "N/A",
      notes: asset.notes || "N/A",
      lastUpdated: asset.last_updated,
      createdAt: asset.created_at,
      coordinates: asset.lat && asset.lon ? `${asset.lat}, ${asset.lon}` : "N/A"
    };

    let blob, filename, mimeType;

    if (format === 'excel') {
      // CSV format for Excel compatibility
      const headers = Object.keys(data);
      const values = Object.values(data).map(v => `"${String(v).replace(/"/g, '""')}"`);
      const csvContent = headers.join(',') + '\\n' + values.join(',');
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      filename = `asset-${asset.id}-${new Date().toISOString().split('T')[0]}.csv`;
      mimeType = 'text/csv';
    } else if (format === 'text') {
      // Formatted text file
      const textContent = `
================================================================================
ASSET DETAILS REPORT
================================================================================
Generated: ${new Date().toLocaleString()}

BASIC INFORMATION
-----------------
Asset Number:        ${data.assetNumber}
Product Name:        ${data.productName}
Invoice Number:      ${data.invoiceNumber}
Company Name:        ${data.companyName}

LOCATION
--------
Building:            ${data.building}
Floor:               ${data.floor}
Room:                ${data.room}
Installation:        ${data.installationLocation}
GPS Coordinates:     ${data.coordinates}

USER INFORMATION
----------------
Registered User:     ${data.userName}
Actual User:         ${data.actualUserName}
Management Location: ${data.managementLocation}
Parent Asset ID:     ${data.parentAssetId}

STATUS
------
Status:              ${data.status}
Condition:           ${data.condition}

ADDITIONAL NOTES
----------------
Description:         ${data.description}
Notes:               ${data.notes}

TIMESTAMPS
----------
Created:             ${data.createdAt || 'N/A'}
Last Updated:        ${data.lastUpdated || 'N/A'}

================================================================================
`;
      blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
      filename = `asset-${asset.id}-${new Date().toISOString().split('T')[0]}.txt`;
      mimeType = 'text/plain';
    } else {
      // JSON format (original)
      blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      filename = `asset-${asset.id}-${new Date().toISOString().split('T')[0]}.json`;
      mimeType = 'application/json';
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadOptions(false);
    showNotification(`Asset data downloaded as アセットデータを次のようにダウンロード ${format.toUpperCase()}`, "success 成功");
  };

  // Handle Photo Delete
  const handleDeleteImage = async (imageUrl) => {
    if (!imageUrl) return;

    try {
      setDeleting(true);

      const response = await axios.delete(`${API_BASE_URL}/assets/${assetId}/delete-image`, {
        data: { imageUrl }
      });

      showNotification("🗑️ Image deleted successfully 画像は正常に削除されました", "success 成功");

      // Reset to first image after deletion
      setSelectedImageIndex(0);

      // Refresh asset to get updated images
      fetchAssetDetails();
    } catch (err) {
      console.error("Error deleting image:", err);
      const errorMessage = err.response?.data?.error || "Failed to delete image";
      showNotification(errorMessage, "error エラー");
    } finally {
      setDeleting(false);
    }
  };

  const requestDeleteImage = async (imageUrl) => {
    if (!imageUrl) return;
    if (deleting) return;

    const confirmed = await confirm({
      title: "Delete photo 写真を削除?",
      message: "Are you sure you want to delete this photo? This action cannot be undone この写真を削除してもよろしいですか？この操作は元に戻せません.",
      confirmText: "Delete 消去",
      cancelText: "Cancel キャンセル",
      confirmVariant: "danger 危険",
      body: (
        <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
          <img
            src={imageUrl}
            alt="To delete"
            className="w-full h-32 object-contain"
          />
        </div>
      ),
    });

    if (!confirmed) return;
    await handleDeleteImage(imageUrl);
  };

  // Handle Photo Upload with type selection
  const handlePhotoUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('image', file); // Server expects 'image' field name
      formData.append('photoType', selectedPhotoType); // Send photo type to server

      // Upload to server
      const response = await axios.post(`${API_BASE_URL}/assets/${assetId}/upload-image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const uploadTime = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      showNotification(`📸 ${photoTypes.find(t => t.id === selectedPhotoType)?.label || 'Photo 写真'} uploaded at にアップロードされました ${uploadTime}`, "success 成功");
      setShowPhotoUpload(false);

      // Refresh asset to get new image
      fetchAssetDetails();
    } catch (err) {
      console.error("Error uploading photo:", err);
      const errorMessage = err.response?.data?.error || "Failed to upload photo";
      showNotification(errorMessage, "error エラー");
    } finally {
      setUploading(false);
    }
  };

  // Start camera stream
  const startCamera = async () => {
    setCameraError(null);
    setCapturedImage(null);

    try {
      // Stop any existing stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      // Request camera access with specified facing mode
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraStream(stream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setShowCamera(true);
    } catch (err) {
      console.error("Camera error:", err);
      if (err.name === 'NotAllowedError') {
        setCameraError('カメラへのアクセスが拒否されました。ブラウザの設定でカメラを許可してください。\n(Camera access denied. Please allow camera access in browser settings.)');
      } else if (err.name === 'NotFoundError') {
        setCameraError('カメラが見つかりません。\n(No camera found on this device.)');
      } else {
        setCameraError(`カメラエラー: ${err.message}\n(Camera error: ${err.message})`);
      }
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
    setCapturedImage(null);
    setCameraError(null);
  };

  // Switch between front and back camera
  const switchCamera = async () => {
    const newMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(newMode);

    // Restart camera with new facing mode
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error switching camera:", err);
    }
  };

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
  };

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null);
  };

  // Upload captured photo
  const uploadCapturedPhoto = async () => {
    if (!capturedImage) return;

    try {
      setUploading(true);

      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Create file from blob
      const file = new File([blob], `camera-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });

      // Upload using FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('photoType', selectedPhotoType);

      await axios.post(`${API_BASE_URL}/assets/${assetId}/upload-image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const uploadTime = new Date().toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });

      showNotification(`📸 ${photoTypes.find(t => t.id === selectedPhotoType)?.label || 'Photo'} captured at ${uploadTime}`, "success");

      // Close camera and refresh
      stopCamera();
      setShowPhotoUpload(false);
      fetchAssetDetails();
    } catch (err) {
      console.error("Error uploading captured photo:", err);
      showNotification("Failed to upload photo 写真のアップロードに失敗しました", "error エラー");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-lg font-semibold">Loading asset details アセットの詳細をロードしています...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md border border-gray-100">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Asset Not Found アセットが見つかりません</h2>
          <p className="text-gray-600 mb-6">The asset you're looking for doesn't exist 探している資産は存在しません.</p>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg"
          >
            <ArrowLeft className="w-5 h-5" />
            Go Back 戻る
          </button>
        </div>
      </div>
    );
  }

  const placeholderImages = [
    'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=1200&h=800&fit=crop',
  ];
  // Use image_urls array if available, fallback to single image_url
  const assetImages = asset.image_urls && asset.image_urls.length > 0
    ? asset.image_urls
    : (asset.image_url ? [asset.image_url] : []);
  const displayImages = assetImages.length > 0 ? assetImages : placeholderImages;
  const placeholderImage = placeholderImages[0];

  const nextImage = () => setSelectedImageIndex((prev) => (prev + 1) % displayImages.length);
  const prevImage = () => setSelectedImageIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {ConfirmDialogElement}
      {/* Notification */}
      {notification && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
        >
          <div className={`px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2 ${notification.type === "success"
            ? "bg-gradient-to-r from-green-500 to-emerald-500"
            : notification.type === "error"
              ? "bg-gradient-to-r from-red-500 to-pink-500"
              : "bg-gradient-to-r from-blue-500 to-indigo-500"
            } text-white font-semibold min-w-[280px] justify-center`}>
            {notification.message}
          </div>
        </motion.div>
      )}

      {/* Image Zoom Modal with full carousel */}
      {showImageZoom && (
        <div
          className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4"
          onClick={() => setShowImageZoom(false)}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full transition-all z-10"
            onClick={() => setShowImageZoom(false)}
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Delete button for current image */}
          {assetImages.includes(displayImages[selectedImageIndex]) && (
            <button
              className="absolute top-4 left-4 p-2 bg-red-500/80 hover:bg-red-600 rounded-full transition-all z-10 flex items-center gap-2"
              onClick={(e) => {
                e.stopPropagation();
                requestDeleteImage(displayImages[selectedImageIndex]);
              }}
              title="Delete this image この画像を削除"
            >
              <Trash2 className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Main image area */}
          <div className="relative flex-1 max-w-5xl w-full flex items-center justify-center">
            <img
              src={displayImages[selectedImageIndex]}
              alt={asset?.name}
              className="max-w-full max-h-[70vh] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                >
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-4 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-all"
                >
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip at bottom - shows ALL images */}
          {displayImages.length > 1 && (
            <div
              className="mt-4 flex gap-2 overflow-x-auto max-w-full pb-2 px-4"
              onClick={(e) => e.stopPropagation()}
            >
              {displayImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  className={`w-16 h-16 rounded-lg border-2 transition-all overflow-hidden flex-shrink-0 ${selectedImageIndex === idx
                    ? "border-white ring-2 ring-indigo-400"
                    : "border-white/30 hover:border-white/60"
                    }`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.src = placeholderImage}
                  />
                </button>
              ))}
            </div>
          )}

          {/* Image counter */}
          <div className="mt-2 bg-black/50 px-4 py-2 rounded-lg text-white text-sm">
            {selectedImageIndex + 1} / {displayImages.length}
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && !showCamera && (
        <div
          className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4"
          onClick={() => setShowPhotoUpload(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                写真のアップロード (Upload Photo)
              </h3>
              <button
                onClick={() => setShowPhotoUpload(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-all"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 mb-2">写真の種類を選択 (Select Photo Type):</p>
              <div className="grid grid-cols-3 gap-2">
                {photoTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setSelectedPhotoType(type.id)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${selectedPhotoType === type.id
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      {type.id === 'full' && <Image className="w-5 h-5" />}
                      {type.id === 'closeup' && <Camera className="w-5 h-5" />}
                      {type.id === 'qr' && <Barcode className="w-5 h-5" />}
                      <span className="text-sm font-medium">{type.label.split(' ')[0]}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {/* Two options: Camera and Gallery */}
              <div className="grid grid-cols-2 gap-3">
                {/* Camera Option - Opens live camera */}
                <button
                  onClick={startCamera}
                  disabled={uploading}
                  className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-indigo-300 rounded-lg cursor-pointer hover:bg-indigo-50 hover:border-indigo-400 transition-all bg-indigo-50/50 disabled:opacity-50"
                >
                  <div className="flex flex-col items-center gap-2 text-indigo-600">
                    <Camera className="w-8 h-8" />
                    <span className="text-sm font-medium">カメラで撮影</span>
                    <span className="text-sm text-indigo-400">Take Photo 写真を撮る</span>
                  </div>
                </button>

                {/* Gallery Option - Opens file picker */}
                <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-all">
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    <Image className="w-8 h-8" />
                    <span className="text-sm font-medium">ギャラリーから</span>
                    <span className="text-sm text-gray-400">From Gallery ギャラリーから</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {cameraError && (
                <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                  <p className="whitespace-pre-line">{cameraError}</p>
                </div>
              )}

              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">📸 撮影日時は自動記録されます</p>
                <p className="text-blue-600">Photo timestamp will be recorded automatically 写真のタイムスタンプは自動的に記録されます</p>
              </div>

              {uploading && (
                <div className="flex items-center justify-center gap-2 text-indigo-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm font-medium">Uploading アップロード中...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Live Camera Modal */}
      {showCamera && (
        <div className="fixed inset-0 bg-black z-[10000] flex flex-col">
          {/* Hidden canvas for capturing */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera header */}
          <div className="flex items-center justify-between p-4 bg-black/50 text-white">
            <button
              onClick={stopCamera}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
            >
              <X className="w-6 h-6" />
            </button>
            <span className="font-medium">
              {photoTypes.find(t => t.id === selectedPhotoType)?.label || 'Photo'}
            </span>
            <button
              onClick={switchCamera}
              className="p-2 hover:bg-white/20 rounded-full transition-all"
              title="Switch Camera"
            >
              <RefreshCw className="w-6 h-6" />
            </button>
          </div>

          {/* Camera view or captured image */}
          <div className="flex-1 flex items-center justify-center bg-black overflow-hidden">
            {!capturedImage ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-w-full max-h-full object-contain"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
            ) : (
              <img
                src={capturedImage}
                alt="Captured"
                className="max-w-full max-h-full object-contain"
                style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              />
            )}
          </div>

          {/* Camera controls */}
          <div className="p-6 bg-black/50 flex items-center justify-center gap-6">
            {!capturedImage ? (
              /* Capture button */
              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white border-4 border-gray-300 hover:border-indigo-400 transition-all flex items-center justify-center shadow-lg"
              >
                <div className="w-16 h-16 rounded-full bg-white border-2 border-gray-200" />
              </button>
            ) : (
              /* After capture: Retake or Use */
              <>
                <button
                  onClick={retakePhoto}
                  disabled={uploading}
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RotateCcw className="w-5 h-5" />
                  撮り直す (Retake)
                </button>
                <button
                  onClick={uploadCapturedPhoto}
                  disabled={uploading}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                  {uploading ? 'Uploading...' : '使用する (Use)'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">Back 戻る</span>
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Asset Details 資産の詳細</h1>
                <p className="text-sm text-gray-600 mt-0.5">{toFullWidth(asset.building)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  {inventoryStatus === 'completed' ? (
                    <button
                      onClick={handleUndoInventory}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span className="hidden sm:inline">Undo Inventory インベントリを元に戻す</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleInventoryComplete}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span className="hidden sm:inline">{saving ? 'Updating 更新中...' : 'Inventory Complete 在庫完了'}</span>
                    </button>
                  )}
                  <button
                    onClick={handlePrintPDF_New}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    <span className="hidden sm:inline">Print PDF PDFを印刷する</span>
                  </button>
                  {/* Download button with format dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-all shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span className="hidden sm:inline">Download ダウンロード</span>
                    </button>
                    {showDownloadMenu && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                        <button
                          onClick={() => { handleDownloadData('text'); setShowDownloadMenu(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          テキスト (.txt)
                        </button>
                        <button
                          onClick={() => { handleDownloadData('excel'); setShowDownloadMenu(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                        >
                          <Layers className="w-4 h-4" />
                          Excel (.csv)
                        </button>
                        <button
                          onClick={() => { handleDownloadData('json'); setShowDownloadMenu(false); }}
                          className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2"
                        >
                          <Package className="w-4 h-4" />
                          JSON
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                    <span className="hidden sm:inline">Cancel キャンセル</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-sm disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="hidden sm:inline">Saving 保存...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span className="hidden sm:inline">Save 保存</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all shadow-sm"
                >
                  <Edit className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit 編集</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>
      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="grid grid-cols-1 gap-3">
          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-3">
              {/* LEFT: Image + Location (col-span-4) */}
              <div className="col-span-12 lg:col-span-4 space-y-2">
                {/* Amazon-Style Image Gallery */}
                <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden p-2">
                  <div className="flex gap-2">
                    {/* LEFT: Thumbnails (Amazon style) - Limited to 3 visible */}
                    {displayImages.length >= 1 && (
                      <div className="flex flex-col gap-2 w-16">
                        {displayImages.slice(0, 3).map((img, idx) => (
                          <div key={idx} className="relative group">
                            <button
                              onClick={() => setSelectedImageIndex(idx)}
                              className={`w-14 h-14 rounded border-2 transition-all overflow-hidden flex-shrink-0 ${selectedImageIndex === idx
                                ? "border-indigo-600 ring-2 ring-indigo-200"
                                : "border-gray-200 hover:border-gray-400"
                                }`}
                            >
                              <img
                                src={img}
                                alt=""
                                className="w-full h-full object-cover"
                                onError={(e) => e.target.src = placeholderImage}
                              />
                            </button>
                            {/* Delete button on hover */}
                            {assetImages.includes(img) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  requestDeleteImage(img);
                                }}
                                className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                title="Delete image"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        ))}
                        {/* Show "+X more" button if more than 3 images */}
                        {displayImages.length > 3 && (
                          <button
                            onClick={() => setShowImageZoom(true)}
                            className="w-14 h-14 rounded border-2 border-dashed border-gray-300 hover:border-indigo-400 bg-gray-50 hover:bg-indigo-50 flex items-center justify-center transition-all"
                            title="View all images"
                          >
                            <span className="text-sm font-bold text-gray-600 hover:text-indigo-600">
                              +{displayImages.length - 3}
                            </span>
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className="flex-1 relative aspect-video rounded overflow-hidden bg-gray-100 cursor-zoom-in group"
                      onClick={() => setShowImageZoom(true)}
                    >
                      <img
                        src={displayImages[selectedImageIndex]}
                        alt={toFullWidth(asset.name)}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => e.target.src = placeholderImage}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <span className="bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                          Click to zoom クリックしてズーム
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setShowPhotoUpload(true)}
                      className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-base font-medium transition-all"
                    >
                      <Camera className="w-4 h-4" />
                      写真を追加 (Add Photo)
                    </button>
                  </div>
                </div>

                {/* Compact Location */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-2">
                  <div className="flex items-center gap-1 mb-2">
                    <MapPin className="w-3 h-3 text-indigo-600" />
                    <p className="text-sm font-bold text-gray-700">Location 位置</p>
                  </div>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Building 建物:</span>
                      <span className="font-semibold text-gray-900">{toFullWidth(asset.building) || ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Floor 床:</span>
                      <span className="font-semibold text-gray-900">{asset.floor || ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Room 部屋:</span>
                      <span className="font-semibold text-gray-900">{asset.room || ''}</span>
                    </div>
                  </div>
                </div>

                {/* QR Code - Below Images, Bigger */}
                <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm font-bold text-gray-700">QRコード (QR Code)</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-24 bg-white rounded-lg border-2 border-gray-300 flex items-center justify-center flex-shrink-0 shadow-sm">
                      {asset.qr_code_url ? (
                        <img src={asset.qr_code_url} alt="QR" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Barcode className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 mb-1">Scan to view asset スキャンしてアセットを表示</p>
                      <p className="text-sm text-gray-700 font-mono break-all">{asset.qr_code || asset.id}</p>
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-2">
                  <div className="flex items-center gap-1 mb-2">
                    <Clock className="w-3 h-3 text-yellow-600" />
                    <p className="text-sm font-bold text-yellow-800">Recent Changes (変更履歴)</p>
                    {changeHistory.length > 0 && (
                      <span className="text-[9px] bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded-full ml-1">
                        {changeHistory.length}件
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {changeHistory.length === 0 ? (
                      <>
                        <div className="bg-white rounded p-1.5 border border-yellow-100 opacity-60">
                          <p className="text-[9px] text-gray-400 mb-0.5">No change #1 変化なし #1</p>
                          <p className="text-sm text-gray-500 italic">Changes will appear here after edits 編集後、変更内容がここに表示されます</p>
                        </div>
                        <div className="bg-white rounded p-1.5 border border-yellow-100 opacity-40">
                          <p className="text-[9px] text-gray-400 mb-0.5">No change #2 変化なし #2</p>
                          <p className="text-sm text-gray-500 italic">History will appear here ここに履歴が表示されます</p>
                        </div>
                        <div className="bg-white rounded p-1.5 border border-yellow-100 opacity-30">
                          <p className="text-[9px] text-gray-400 mb-0.5">No change #3 変化なし #3</p>
                          <p className="text-sm text-gray-500 italic">History will appear here ここに履歴が表示されます</p>
                        </div>
                      </>
                    ) : (
                      changeHistory.map((change, i) => {
                        const dateStr = new Date(change.date).toLocaleString('ja-JP', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        return (
                          <div
                            key={i}
                            className={`bg-white rounded p-1.5 border border-yellow-100 ${i >= 3 ? 'opacity-70' : i === 1 ? 'opacity-90' : i === 2 ? 'opacity-80' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-0.5">
                              <p className="text-sm text-gray-500">{dateStr}</p>
                              {i === 0 && (
                                <span className="text-[8px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-semibold">Latest 最新</span>
                              )}
                              {i > 0 && (
                                <span className="text-[8px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">#{i + 1}</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 line-clamp-2">
                              <span className="font-medium text-indigo-600">{change.user}</span>: {change.changes}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT: All Information (col-span-8) */}
              <div className="col-span-12 lg:col-span-8">
                <div className="space-y-3">

                  {/* Section 1: Primary Required Fields */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-4 h-4 text-indigo-600" />
                      <h3 className="text-base font-bold text-gray-900">基本情報 (Primary Information)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 資産番号 */}
                      <div className="bg-indigo-50 rounded p-2 border border-indigo-200">
                        <p className="text-sm font-bold text-indigo-700 mb-0.5">資産番号 (Asset Number)</p>
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900 font-mono truncate">{asset.id || ''}</p>
                          <button
                            type="button"
                            onClick={copyAssetNumber}
                            className="p-1.5 rounded-lg bg-white/70 hover:bg-white border border-indigo-200 text-indigo-700 transition-all flex-shrink-0"
                            title="Copy asset number"
                            aria-label="Copy asset number"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* 管理箇所 */}
                      <div className="bg-orange-50 rounded p-2 border border-orange-200">
                        <p className="text-sm font-bold text-orange-700 mb-0.5">管理箇所 (Management Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.management_location || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, management_location: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.management_location || ''}</p>
                        )}
                      </div>

                      {/* 品名 */}
                      <div className="bg-green-50 rounded p-2 border border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-0.5">品名 (Product Name)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.name || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, name: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{toFullWidth(asset.name) || ''}</p>
                        )}
                      </div>

                      {/* 使用者名（和光） */}
                      <div className="bg-purple-50 rounded p-2 border border-purple-200">
                        <p className="text-sm font-bold text-purple-700 mb-0.5">使用者名（和光）(User Name - Wako)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.user || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, user: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.user || ''}</p>
                        )}
                      </div>

                      {/* 建屋 */}
                      <div className="bg-blue-50 rounded p-2 border border-blue-200">
                        <p className="text-sm font-bold text-blue-700 mb-0.5">建屋 (Building)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.building || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, building: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{toFullWidth(asset.building) || ''}</p>
                        )}
                      </div>

                      {/* 設置場所 */}
                      <div className="bg-cyan-50 rounded p-2 border border-cyan-200">
                        <p className="text-sm font-bold text-cyan-700 mb-0.5">設置場所 (Installation Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.installation_location || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, installation_location: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.installation_location || ''}</p>
                        )}
                      </div>

                      {/* 詳細場所 */}
                      <div className="bg-teal-50 rounded p-2 border border-teal-200">
                        <p className="text-sm font-bold text-teal-700 mb-0.5">詳細場所 (Detailed Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.room || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, room: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.room || ''}</p>
                        )}
                      </div>

                      {/* 設置状況 */}
                      <div className="bg-pink-50 rounded p-2 border border-pink-200">
                        <p className="text-sm font-bold text-pink-700 mb-0.5">設置状況 (Installation Status)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.status || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, status: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.status || ''}</p>
                        )}
                      </div>
                    </div>

                    {/* QR コード */}
                    <div className="mt-2 bg-indigo-50 rounded p-2 border border-indigo-200">
                      <p className="text-sm font-bold text-indigo-700 mb-1">QR コード (QR Code)</p>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-16 bg-white rounded border border-indigo-300 flex items-center justify-center flex-shrink-0">
                          {asset.qr_code_url ? (
                            <img src={asset.qr_code_url} alt="QR Code" className="w-full h-full object-contain p-1" />
                          ) : (
                            <Barcode className="w-10 h-10 text-gray-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 mb-0.5">Scan to view asset スキャンしてアセットを表示</p>
                          <p className="text-[9px] text-gray-500 font-mono">{asset.qr_code || ''}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Section 2: Current Year Data */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4 text-green-600" />
                      <h3 className="text-lg font-bold text-gray-900">今年度データ (Current Year Data)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 建屋 */}
                      <div className="bg-green-50 rounded p-2 border border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-0.5">建屋 (Building)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.building || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, building: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{toFullWidth(asset.building) || ''}</p>
                        )}
                      </div>

                      {/* 設置場所 */}
                      <div className="bg-green-50 rounded p-2 border border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-0.5">設置場所 (Installation Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.installation_location || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, installation_location: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.installation_location || ''}</p>
                        )}
                      </div>

                      {/* 詳細場所 */}
                      <div className="bg-green-50 rounded p-2 border border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-0.5">詳細場所 (Detailed Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.room || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, room: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.room || ''}</p>
                        )}
                      </div>

                      {/* 設置状況 */}
                      <div className="bg-green-50 rounded p-2 border border-green-200">
                        <p className="text-sm font-bold text-green-700 mb-0.5">設置状況 (Installation Status)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.status || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, status: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.status || ''}</p>
                        )}
                      </div>
                    </div>

                    {/* コメント */}
                    <div className="mt-2 bg-green-50 rounded p-2 border border-green-200">
                      <p className="text-sm font-bold text-green-700 mb-0.5">コメント (Comment)</p>
                      {isEditing ? (
                        <textarea
                          value={editedAsset.notes || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, notes: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{asset.notes || ''}</p>
                      )}
                    </div>

                    {/* 資産ラベル再発行 */}
                    <div className="mt-2 bg-green-50 rounded p-2 border border-green-200">
                      <p className="text-sm font-bold text-green-700 mb-0.5">資産ラベル再発行 (Asset Label Reissue)</p>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editedAsset.label_reissue || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, label_reissue: e.target.value })}
                          className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                        />
                      ) : (
                        <p className="text-sm font-semibold text-gray-900">{asset.label_reissue || ''}</p>
                      )}
                    </div>

                    {/* 再発行理由 */}
                    <div className="mt-2 bg-green-50 rounded p-2 border border-green-200">
                      <p className="text-sm font-bold text-green-700 mb-0.5">再発行理由 (Reissue Reason)</p>
                      {isEditing ? (
                        <textarea
                          value={editedAsset.reissue_reason || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, reissue_reason: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-green-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{asset.reissue_reason || ''}</p>
                      )}
                    </div>
                  </div>

                  {/* Section 3: Last Year Data */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h3 className="text-sm font-bold text-gray-900">昨年度データ (Last Year Data)</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {/* 【昨年】調查者 */}
                      <div className="bg-amber-50 rounded p-2 border border-amber-200">
                        <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】調查者 (Last Year Investigator)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.last_year_investigator || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, last_year_investigator: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.last_year_investigator || ''}</p>
                        )}
                      </div>

                      {/* 【昨年】建屋 */}
                      <div className="bg-amber-50 rounded p-2 border border-amber-200">
                        <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】建屋 (Last Year Building)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.last_year_building || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, last_year_building: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.last_year_building || ''}</p>
                        )}
                      </div>

                      {/* 【昨年】設置場所 */}
                      <div className="bg-amber-50 rounded p-2 border border-amber-200">
                        <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】設置場所 (Last Year Installation Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.last_year_installation_location || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, last_year_installation_location: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.last_year_installation_location || ''}</p>
                        )}
                      </div>

                      {/* 【昨年】詳細場所 */}
                      <div className="bg-amber-50 rounded p-2 border border-amber-200">
                        <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】詳細場所 (Last Year Detailed Location)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.last_year_detailed_location || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, last_year_detailed_location: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.last_year_detailed_location || ''}</p>
                        )}
                      </div>

                      {/* 【昨年】設置状況 */}
                      <div className="bg-amber-50 rounded p-2 border border-amber-200">
                        <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】設置状況 (Last Year Installation Status)</p>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editedAsset.last_year_installation_status || ""}
                            onChange={(e) => setEditedAsset({ ...editedAsset, last_year_installation_status: e.target.value })}
                            className="w-full text-sm font-semibold border border-gray-300 rounded px-1 py-0.5"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-900">{asset.last_year_installation_status || ''}</p>
                        )}
                      </div>
                    </div>

                    {/* 【昨年】コメント */}
                    <div className="mt-2 bg-amber-50 rounded p-2 border border-amber-200">
                      <p className="text-sm font-bold text-amber-700 mb-0.5">【昨年】コメント (Last Year Comment)</p>
                      {isEditing ? (
                        <textarea
                          value={editedAsset.last_year_comment || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, last_year_comment: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-amber-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{asset.last_year_comment || ''}</p>
                      )}
                    </div>
                  </div>
                  {/* Section 4: Additional Remarks (At Bottom) */}
                  <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
                    <div className="flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4 text-slate-600" />
                      <h3 className="text-sm font-bold text-gray-900">備考 (Remarks)</h3>
                    </div>

                    {/* 備考（設置場所） */}
                    <div className="bg-slate-50 rounded p-2 border border-slate-200 mb-2">
                      <p className="text-sm font-bold text-slate-700 mb-0.5">備考（設置場所）(Remarks - Installation Location)</p>
                      {isEditing ? (
                        <textarea
                          value={editedAsset.remarks_installation_location || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, remarks_installation_location: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-slate-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{asset.remarks_installation_location || ''}</p>
                      )}
                    </div>

                    {/* 備考（修理/貸出等） */}
                    <div className="bg-slate-50 rounded p-2 border border-slate-200">
                      <p className="text-sm font-bold text-slate-700 mb-0.5">備考（修理/貸出等）(Remarks - Repair/Loan etc.)</p>
                      {isEditing ? (
                        <textarea
                          value={editedAsset.remarks_repair_loan || ""}
                          onChange={(e) => setEditedAsset({ ...editedAsset, remarks_repair_loan: e.target.value })}
                          rows={2}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-slate-500 resize-none"
                        />
                      ) : (
                        <p className="text-sm text-gray-700">{asset.remarks_repair_loan || ''}</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Reusable Components
function InfoField({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2 rounded-lg bg-${color}-100`}>
        <Icon className={`w-4 h-4 text-${color}-600`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-sm font-semibold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function DetailCard({ icon: Icon, label, value, placeholder, bgColor, borderColor, iconColor, editable, onChange }) {
  return (
    <div className={`${bgColor} rounded-lg p-2 border ${borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-4 h-4 ${iconColor}`} />
        <p className="text-sm font-semibold text-gray-700 uppercase">{label}</p>
      </div>
      {editable ? (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm font-semibold text-gray-900 border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500"
        />
      ) : (
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      )}
    </div>
  );
}