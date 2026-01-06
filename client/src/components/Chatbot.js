import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Loader2, Bot, User, Volume2, VolumeX, Trash2 } from 'lucide-react';
import { motion, AnimatePresence, useDragControls, useMotionValue } from 'framer-motion';
import { GoogleGenAI, Chat, GenerateContentResponse, Type } from '@google/genai';

// Helper component for rendering individual asset cards
const AssetCard = ({ asset, onNavigate }) => (
  <div className="bg-white rounded-lg p-3 border border-gray-200 text-sm shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between mb-2">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{asset.name}</p>
        <p className="text-xs text-gray-500 font-mono">ID: {asset.id}</p>
      </div>

    </div>
    <div className="space-y-1 mb-2">
      <p className="text-xs text-gray-600">
        <span className="font-medium">🏢 Building 建物:</span> {asset.building}
      </p>
      <p className="text-xs text-gray-600">
        <span className="font-medium">📍 Floor 床:</span> {asset.floor}
        <span className="mx-1">•</span>
        <span className="font-medium">🚪 Room 部屋:</span> {asset.room}
      </p>
    </div>
    {asset.type && <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Type タイプ:</span> {asset.type}</p>}
    {asset.condition && <p className="text-xs text-gray-600 mb-1"><span className="font-medium">Condition 状態:</span> {asset.condition}</p>}
    {asset.description && <p className="text-xs text-gray-600 mt-2 pt-2 border-t border-gray-200 italic">"{asset.description.substring(0, 100)}{asset.description.length > 100 ? '...' : ''}"</p>}
    {asset.notes && <p className="text-xs text-blue-600 mt-1 bg-blue-50 p-2 rounded">📝 {asset.notes}</p>}
    {onNavigate && (
      <button
        onClick={() => onNavigate(asset.building, asset.floor, asset.room, asset.id)}
        className="mt-3 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-3 rounded-lg text-xs font-medium hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
      >
        <span>🎯 View on Dashboard ダッシュボードで見る</span>
      </button>
    )}
  </div>
);

export default function AIAssistant({ assets, onNavigate }) {
  const dragControls = useDragControls();
  const dragConstraintsRef = useRef(null);
  const floatingRef = useRef(null);
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  // Load persisted state from localStorage
  const [isOpen, setIsOpen] = useState(() => {
    const saved = localStorage.getItem('chatbot_isOpen');
    return saved ? JSON.parse(saved) : false;
  });

  const initialMessage = {
    id: 1,
    type: 'bot',
    text: 'Hello! I\'m your SPring-8 Inventory Assistant. 👋\nこんにちは！SPring-8在庫管理アシスタントです。👋\n\nI support both English and Japanese!\n英語と日本語の両方に対応しています！\n\nExamples / 例：\n• "Find asset 82022030094" / 「資産82022030094を探して」\n• "Show me printers" / 「プリンターを見せて」\n• "Assets in room 208" / 「208号室の資産」\n\nHow can I help you today? / 今日はどうお手伝いしましょうか？',
    timestamp: new Date()
  };

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatbot_messages');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Convert timestamp strings back to Date objects
        return parsed.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch (e) {
        return [initialMessage];
      }
    }
    return [initialMessage];
  });

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    const saved = localStorage.getItem('chatbot_voiceEnabled');
    return saved ? JSON.parse(saved) : true;
  });
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem('chatbot_language');
    return saved || 'en-US';
  });

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null); // Using 'any' for SpeechRecognition to support webkit prefix
  const synthesisRef = useRef(null);
  const chatRef = useRef(null);

  // Load persisted position (drag offset) from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('chatbot_position');
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved);
      const x = typeof parsed?.x === 'number' ? parsed.x : 0;
      const y = typeof parsed?.y === 'number' ? parsed.y : 0;
      dragX.set(x);
      dragY.set(y);
    } catch {
      // ignore
    }
  }, [dragX, dragY]);

  const persistPosition = useCallback(() => {
    localStorage.setItem(
      'chatbot_position',
      JSON.stringify({ x: dragX.get(), y: dragY.get() })
    );
  }, [dragX, dragY]);

  // Keep the floating widget inside the viewport (prevents the header from getting stuck off-screen)
  useEffect(() => {
    const clampIntoViewport = () => {
      if (!floatingRef.current) return;

      const rect = floatingRef.current.getBoundingClientRect();
      const padding = 8;

      let dx = 0;
      let dy = 0;

      if (rect.left < padding) dx = padding - rect.left;
      else if (rect.right > window.innerWidth - padding) dx = (window.innerWidth - padding) - rect.right;

      if (rect.top < padding) dy = padding - rect.top;
      else if (rect.bottom > window.innerHeight - padding) dy = (window.innerHeight - padding) - rect.bottom;

      if (dx !== 0) dragX.set(dragX.get() + dx);
      if (dy !== 0) dragY.set(dragY.get() + dy);
      if (dx !== 0 || dy !== 0) persistPosition();
    };

    const rafId = window.requestAnimationFrame(clampIntoViewport);
    window.addEventListener('resize', clampIntoViewport);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', clampIntoViewport);
    };
  }, [dragX, dragY, persistPosition]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('chatbot_messages', JSON.stringify(messages));
  }, [messages]);

  // Persist isOpen state
  useEffect(() => {
    localStorage.setItem('chatbot_isOpen', JSON.stringify(isOpen));
  }, [isOpen]);

  // Persist voiceEnabled state
  useEffect(() => {
    localStorage.setItem('chatbot_voiceEnabled', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  // Persist language state
  useEffect(() => {
    localStorage.setItem('chatbot_language', language);
  }, [language]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // FIX: Cast window to `any` to access non-standard SpeechRecognition APIs without TypeScript errors.
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language; // Dynamic language support

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
        // Automatically send after voice input
        setTimeout(() => handleSend(transcript), 100);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => setIsListening(false);
    }

    synthesisRef.current = window.speechSynthesis;

    return () => {
      recognitionRef.current?.stop();
      synthesisRef.current?.cancel();
    };
  }, [language]);

  // Create lightweight asset index for fast lookups (computed once when assets change)
  const assetIndex = React.useMemo(() => {
    if (!assets || assets.length === 0) return null;

    const buildings = [...new Set(assets.map(a => a.building).filter(Boolean))];
    const floors = [...new Set(assets.map(a => a.floor).filter(Boolean))];
    const rooms = [...new Set(assets.map(a => a.room).filter(Boolean))];
    const verifiedCount = assets.filter(a => a.inventory_status === 'completed').length;

    // Build lookup maps for O(1) access
    const byBuilding = {};
    const byFloor = {};
    const byRoom = {};

    buildings.forEach(b => { byBuilding[b] = assets.filter(a => a.building === b).length; });
    floors.forEach(f => { byFloor[f] = assets.filter(a => a.floor === f).length; });
    rooms.forEach(r => { byRoom[r] = assets.filter(a => a.room === r).length; });

    return {
      total: assets.length,
      verified: verifiedCount,
      unverified: assets.length - verifiedCount,
      buildings,
      floors,
      rooms,
      byBuilding,
      byFloor,
      byRoom
    };
  }, [assets]);

  useEffect(() => {
    if (assets.length > 0 && !chatRef.current && assetIndex) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.REACT_APP_API_KEY });

        // OPTIMIZED: Send only summary statistics, NOT full asset data
        // Update system instruction to request plain text
        const systemInstruction = `You are a friendly AI assistant for SPring-8 inventory management.
You support English and Japanese. Respond in the user's language.
Your response must be JSON with 'responseText' (string) and 'asset_ids' (array, usually empty).

INVENTORY SUMMARY (use these exact numbers):
- Total assets: ${assetIndex.total}
- Verified: ${assetIndex.verified}
- Unverified: ${assetIndex.unverified}
- Buildings (${assetIndex.buildings.length}): ${assetIndex.buildings.map(b => `${b} (${assetIndex.byBuilding[b]})`).join(', ')}
- Floors: ${assetIndex.floors.join(', ')}
- Rooms: ${assetIndex.rooms.length} total

IMPORTANT: The system handles asset lookups locally. You only provide conversational responses.
- For "find/show/locate" queries: Say you'll show the results, return empty asset_ids (system handles it)
- For counting questions: Use the exact numbers above
- For greetings/help: Respond conversationally
- Keep responses brief and helpful
- Do NOT use markdown formatting (no **bold**, *italics*, etc). Use plain text only.`;

        chatRef.current = ai.chats.create({
          model: 'gemini-2.5-flash',
          history: [
            { role: "user", parts: [{ text: systemInstruction }] },
            { role: "model", parts: [{ text: "Ready to help with SPring-8 inventory queries." }] }
          ]
        });
      } catch (error) {
        console.error("Failed to initialize Gemini AI:", error);
        addMessage('bot', "I'm sorry, I'm having trouble connecting. Please check the API configuration.");
      }
    }
  }, [assets, assetIndex]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      synthesisRef.current?.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  const speak = (text) => {
    if (!voiceEnabled || !synthesisRef.current) return;
    synthesisRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);

    // Detect if text contains Japanese characters
    const hasJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf\u3400-\u4dbf]/.test(text);
    utterance.lang = hasJapanese ? 'ja-JP' : 'en-US';

    // Try to find appropriate voice
    const voices = synthesisRef.current.getVoices();
    const preferredVoice = voices.find(voice => voice.lang.startsWith(hasJapanese ? 'ja' : 'en'));
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    synthesisRef.current?.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      const errorMsg = language === 'ja-JP'
        ? '申し訳ございません。お使いのブラウザは音声認識に対応していません。'
        : 'Sorry, speech recognition is not supported in your browser.';
      addMessage('bot', errorMsg);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking();
      setInput('');
      recognitionRef.current.lang = language; // Set language before starting
      recognitionRef.current.start();
    }
    setIsListening(!isListening);
  };

  const addMessage = (type, text, assetsToList = []) => {
    const newMessage = { id: Date.now(), type, text, assets: assetsToList, timestamp: new Date() };
    setMessages(prev => [...prev, newMessage]);
    if (type === 'bot' && voiceEnabled) {
      speak(text);
    }
  };

  // Helper function to find best matching building name (handles typos)
  const findBestBuildingMatch = (searchTerm) => {
    if (!searchTerm) return null;

    const searchLower = searchTerm.toLowerCase().trim();
    const allBuildings = [...new Set(assets.map(a => a.building))];

    // Try exact match first
    const exactMatch = allBuildings.find(b => b.toLowerCase() === searchLower);
    if (exactMatch) return exactMatch;

    // Try partial match (e.g., "high" matches "High Throughput Building")
    const partialMatch = allBuildings.find(b => b.toLowerCase().includes(searchLower));
    if (partialMatch) return partialMatch;

    // Try fuzzy match by splitting into words and checking if most words match
    const searchWords = searchLower.split(/\s+/).filter(w => w.length > 2);
    if (searchWords.length > 0) {
      for (const building of allBuildings) {
        const buildingLower = building.toLowerCase();
        const matchedWords = searchWords.filter(word => buildingLower.includes(word));
        // If at least 60% of words match, consider it a match
        if (matchedWords.length / searchWords.length >= 0.6) {
          return building;
        }
      }
    }

    return null;
  };

  // Helper function to perform accurate counting in JavaScript
  const performAccurateCount = (query) => {
    const lowerQuery = query.toLowerCase();

    // Check if it's a counting question
    const isCountingQuestion = /how many|count|total number|number of/i.test(query);
    if (!isCountingQuestion) return null;

    let count = 0;
    let description = '';

    // Verified/Unverified assets (check this early as it's a common query)
    // Japanese: 確認済み (verified), 未確認 (unverified), 完了 (completed), 未完了 (incomplete)
    if (/verified|unverified|確認済み|未確認|完了|未完了|checked|unchecked|inventoried|not inventoried/i.test(query)) {
      const isUnverified = /unverified|未確認|未完了|unchecked|not verified|not inventoried|pending/i.test(query);
      const isVerified = /\bverified\b|確認済み|完了|checked|inventoried/i.test(query) && !isUnverified;

      if (isVerified) {
        count = assets.filter(a => a.inventory_status === 'completed').length;
        description = `verified (completed) assets`;
      } else if (isUnverified) {
        count = assets.filter(a => a.inventory_status !== 'completed').length;
        description = `unverified (pending) assets`;
      }
    }
    // Total assets
    else if (/total|all assets|in total|entire inventory/i.test(query) && !/building|floor|room/i.test(query)) {
      count = assets.length;
      description = `total assets in the inventory`;
    }
    // COUNT OF BUILDINGS/FLOORS/ROOMS - check these BEFORE "assets in location" patterns
    // Count of buildings (e.g., "how many buildings", "how many buildings we have")
    else if (/\bbuildings?\b/i.test(query) && !/(?:in|at|of)\s+(?:the\s+)?[\w\s]+\s+building/i.test(query) && !/assets?\s+in/i.test(query)) {
      const buildings = new Set(assets.map(a => a.building).filter(Boolean));
      count = buildings.size;
      description = `buildings in the system`;
    }
    // Count of floors (e.g., "how many floors", "how many floors we have")
    else if (/\bfloors?\b/i.test(query) && !/(\d+)(?:f|st|nd|rd|th)?\s*floor/i.test(query) && !/assets?\s+(?:on|in)/i.test(query)) {
      const buildingMatch = query.match(/(?:in|of|at)\s+(?:the\s+)?(.+?)\s+building/i);
      if (buildingMatch) {
        const building = buildingMatch[1].trim();
        const matchedBuilding = findBestBuildingMatch(building);
        if (matchedBuilding) {
          const floors = new Set(
            assets
              .filter(a => a.building === matchedBuilding)
              .map(a => a.floor)
              .filter(Boolean)
          );
          count = floors.size;
          description = `floors in ${matchedBuilding}`;
        }
      } else {
        const floors = new Set(assets.map(a => a.floor).filter(Boolean));
        count = floors.size;
        description = `floors in the system`;
      }
    }
    // Count of rooms (e.g., "how many rooms", "how many rooms we have")
    else if (/\brooms?\b/i.test(query) && !/room\s+\w+/i.test(query) && !/assets?\s+in/i.test(query)) {
      const buildingMatch = query.match(/(?:in|of|at)\s+(?:the\s+)?(.+?)\s+building/i);
      if (buildingMatch) {
        const building = buildingMatch[1].trim();
        const matchedBuilding = findBestBuildingMatch(building);
        if (matchedBuilding) {
          const rooms = new Set(
            assets
              .filter(a => a.building === matchedBuilding)
              .map(a => a.room)
              .filter(Boolean)
          );
          count = rooms.size;
          description = `rooms in ${matchedBuilding}`;
        }
      } else {
        const rooms = new Set(assets.map(a => a.room).filter(Boolean));
        count = rooms.size;
        description = `rooms in the system`;
      }
    }
    // ASSETS IN LOCATION patterns (check these AFTER the counting patterns above)
    // Assets in specific floor AND building (most specific - check first)
    else if (/floor/i.test(query) && /building/i.test(query)) {
      const floorMatch = query.match(/(\d+)(?:f|st|nd|rd|th)?(?:\s+floor)?/i);
      const buildingMatch = query.match(/(?:in|of|at)\s+(?:the\s+)?(.+?)\s+building/i);

      if (floorMatch && buildingMatch) {
        const floor = floorMatch[1].toUpperCase() + 'F';
        const buildingSearchTerm = buildingMatch[1].trim();
        const matchedBuilding = findBestBuildingMatch(buildingSearchTerm);

        if (matchedBuilding) {
          count = assets.filter(a =>
            String(a.floor).toUpperCase() === floor &&
            a.building === matchedBuilding
          ).length;
          description = `assets on floor ${floor} of ${matchedBuilding}`;
        }
      }
    }
    // Assets in specific room AND building/floor
    else if (/room/i.test(query) && (/building/i.test(query) || /floor/i.test(query))) {
      const roomMatch = query.match(/room\s+(\w+)/i);
      const buildingMatch = query.match(/(?:in|of|at)\s+(?:the\s+)?(.+?)\s+building/i);

      if (roomMatch) {
        const room = roomMatch[1];
        let filtered = assets.filter(a => String(a.room).toLowerCase() === room.toLowerCase());

        if (buildingMatch) {
          const buildingSearchTerm = buildingMatch[1].trim();
          const matchedBuilding = findBestBuildingMatch(buildingSearchTerm);
          if (matchedBuilding) {
            filtered = filtered.filter(a => a.building === matchedBuilding);
            count = filtered.length;
            description = `assets in room ${room} of ${matchedBuilding}`;
          }
        } else {
          count = filtered.length;
          description = `assets in room ${room}`;
        }
      }
    }
    // Assets in specific floor only
    else if (/floor/i.test(query)) {
      const floorMatch = query.match(/(\d+)(?:f|st|nd|rd|th)?(?:\s+floor)?/i);
      if (floorMatch) {
        const floor = floorMatch[1].toUpperCase() + 'F';
        count = assets.filter(a => String(a.floor).toUpperCase() === floor).length;
        description = `assets on floor ${floor}`;
      }
    }
    // Assets in specific building only
    else if (/building/i.test(query)) {
      const buildingMatch = query.match(/(?:in|at)\s+(?:the\s+)?(.+?)\s+building/i);
      if (buildingMatch) {
        const buildingSearchTerm = buildingMatch[1].trim();
        const matchedBuilding = findBestBuildingMatch(buildingSearchTerm);

        if (matchedBuilding) {
          count = assets.filter(a => a.building === matchedBuilding).length;
          description = `assets in ${matchedBuilding}`;
        }
      }
    }
    // Assets in specific room only
    else if (/\broom\s+\w+/i.test(query)) {
      const roomMatch = query.match(/room\s+(\w+)/i);
      if (roomMatch) {
        const room = roomMatch[1];
        count = assets.filter(a => String(a.room).toLowerCase() === room.toLowerCase()).length;
        description = `assets in room ${room}`;
      }
    }
    // Assets by type/category - EXPANDED (check this before other generic patterns)
    else if (/printer|computer|phone|iphone|monitor|laptop|keyboard|mouse|tablet|pc|desktop|screen/i.test(query)) {
      // Extract the type from the query
      const typeMatch = query.match(/(printer|computer|phone|iphone|monitor|laptop|keyboard|mouse|tablet|pc|desktop|screen)s?/i);
      if (typeMatch) {
        const type = typeMatch[1].toLowerCase();

        const matchingAssets = assets.filter(a => {
          const searchText = [
            a.name,
            a.type,
            a.description,
            a.category,
            a.model,
            a.manufacturer
          ].filter(Boolean).join(' ').toLowerCase();

          let searchTerms = [type];

          if (type === 'printer') {
            searchTerms = ['printer', 'print', 'ﾌﾟﾘﾝﾀｰ', 'プリンタ', 'プリンター'];
          } else if (type === 'computer' || type === 'pc') {
            searchTerms = ['computer', 'pc', 'desktop', 'workstation', 'ｺﾝﾋﾟｭｰﾀ', 'コンピュータ', 'パソコン', 'ﾊﾟｿｺﾝ'];
          } else if (type === 'phone' || type === 'iphone') {
            searchTerms = ['phone', 'iphone', 'mobile', 'smartphone', 'ｽﾏﾎ', 'スマホ', '電話', 'ﾃﾞﾝﾜ'];
          } else if (type === 'monitor' || type === 'screen') {
            searchTerms = ['monitor', 'display', 'screen', 'ﾓﾆﾀｰ', 'モニター', 'ディスプレイ', 'ﾃﾞｨｽﾌﾟﾚｲ'];
          } else if (type === 'laptop') {
            searchTerms = ['laptop', 'notebook', 'ﾉｰﾄpc', 'ノートPC', 'ノートパソコン', 'ﾉｰﾄﾊﾟｿｺﾝ'];
          }

          return searchTerms.some(term => searchText.includes(term));
        });

        count = matchingAssets.length;
        description = `${type}${type.endsWith('s') ? '' : 's'}`;
      }
    }

    return description ? { count, description } : null;
  };

  // OPTIMIZED: Handle most queries locally without AI - instant response
  const handleLocalQuery = (query) => {
    const lowerQuery = query.toLowerCase().trim();
    // Detect if query contains Japanese characters (Hiragana, Katakana, Kanji)
    const isJapanese = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(query);

    // Greetings
    if (/^(hi|hello|hey|good morning|good afternoon|good evening|こんにちは|おはよう|こんばんは)[\s!.,]*$/i.test(query)) {
      return {
        text: isJapanese
          ? "こんにちは！👋 在庫管理について何かお手伝いできますか？"
          : "Hello! 👋 How can I help you with the inventory today?",
        assets: []
      };
    }

    // Help queries
    if (/^(help|what can you do|\?|ヘルプ)[\s!.,]*$/i.test(query)) {
      return {
        text: isJapanese
          ? "以下のことができます：\n• 資産の検索: 「資産 82022030094」\n• 部屋の検索: 「208号室の資産」\n• カウント: 「資産はいくつ？」\n• ステータス: 「確認済みの資産を見せて」"
          : "I can help you:\n• Find assets: \"Find 82022030094\"\n• Search rooms: \"Assets in room 208\"\n• Count: \"How many assets?\"\n• Status: \"Show verified assets\"",
        assets: []
      };
    }

    // Thanks
    if (/^(thanks|thank you|ありがとう)[\s!.,]*$/i.test(query)) {
      return {
        text: isJapanese ? "どういたしまして！😊" : "You're welcome! 😊",
        assets: []
      };
    }

    // Direct asset ID lookup
    const idMatch = query.match(/(\d{8,})/);
    if (idMatch) {
      const searchId = idMatch[1];
      const found = assets.filter(a => String(a.id).includes(searchId));
      if (found.length > 0) {
        return {
          text: isJapanese
            ? `ID「${searchId}」に一致する資産が${found.length}件見つかりました：`
            : `Found ${found.length} asset(s) matching "${searchId}":`,
          assets: found
        };
      }
      return {
        text: isJapanese
          ? `ID「${searchId}」の資産は見つかりませんでした。`
          : `No asset found with ID "${searchId}".`,
        assets: []
      };
    }

    // Room search: "room 208", "assets in room 208", etc.
    const roomMatch = query.match(/(?:room|部屋)\s*(\d{2,4})/i) || query.match(/(\d{3})\s*(?:号室|号)?/);
    if (roomMatch) {
      const room = roomMatch[1];
      const found = assets.filter(a => String(a.room) === room || String(a.room) === room + '号室');
      if (found.length > 0) {
        const displayAssets = found.slice(0, 30);
        const moreText = found.length > 30 ? (isJapanese ? `\n(${found.length}件中30件を表示)` : `\n(Showing 30 of ${found.length})`) : '';
        return {
          text: isJapanese
            ? `${room}号室で${found.length}件の資産が見つかりました：${moreText}`
            : `Found ${found.length} asset(s) in room ${room}:${moreText}`,
          assets: displayAssets
        };
      }
      return {
        text: isJapanese
          ? `${room}号室には資産が見つかりませんでした。`
          : `No assets found in room ${room}.`,
        assets: []
      };
    }

    // Floor search: "2F", "floor 2", "2nd floor"
    const floorMatch = query.match(/(\d+)\s*[fF](?:\s|$|oor)?/i) || query.match(/floor\s*(\d+)/i);
    if (floorMatch) {
      const floorNum = floorMatch[1];
      const floor = floorNum + 'F';
      const found = assets.filter(a => String(a.floor).toUpperCase() === floor.toUpperCase());
      if (found.length > 0) {
        const displayAssets = found.slice(0, 30);
        const moreText = found.length > 30 ? (isJapanese ? `\n(${found.length}件中30件を表示)` : `\n(Showing 30 of ${found.length})`) : '';
        return {
          text: isJapanese
            ? `${floor}で${found.length}件の資産が見つかりました：${moreText}`
            : `Found ${found.length} asset(s) on floor ${floor}:${moreText}`,
          assets: displayAssets
        };
      }
      return {
        text: isJapanese
          ? `${floor}には資産が見つかりませんでした。`
          : `No assets found on floor ${floor}.`,
        assets: []
      };
    }

    // Verified/Unverified assets
    if (/verified|unverified|checked|unchecked|確認済|未確認/i.test(query) && /show|find|list|display|見せて/i.test(query)) {
      const isUnverified = /unverified|unchecked|not verified|未確認/i.test(query);
      const filtered = isUnverified
        ? assets.filter(a => a.inventory_status !== 'completed')
        : assets.filter(a => a.inventory_status === 'completed');
      const status = isUnverified ? (isJapanese ? '未確認' : 'unverified') : (isJapanese ? '確認済み' : 'verified');
      const displayAssets = filtered.slice(0, 30);
      const moreText = filtered.length > 30 ? (isJapanese ? `\n(${filtered.length}件中30件を表示)` : `\n(Showing 30 of ${filtered.length})`) : '';
      return {
        text: isJapanese
          ? `${filtered.length}件の${status}資産が見つかりました：${moreText}`
          : `Found ${filtered.length} ${status} asset(s):${moreText}`,
        assets: displayAssets
      };
    }

    // "Show all assets"
    if (/^(show|list|display|view)\s*(all)?\s*(assets?)?[\s!.,]*$/i.test(query)) {
      const displayAssets = assets.slice(0, 30);
      return {
        text: isJapanese
          ? `合計: ${assets.length}件の資産。最初の30件を表示します：`
          : `Total: ${assets.length} assets. Showing first 30:`,
        assets: displayAssets
      };
    }

    // Counting questions - handle locally for accuracy
    const countResult = performAccurateCount(query);
    if (countResult) {
      const text = isJapanese
        ? `${countResult.description}は ${countResult.count} 件あります。`
        : `There are ${countResult.count} ${countResult.description}.`;
      return { text, assets: [] };
    }

    return null; // Complex query - let AI handle it
  };

  const handleSend = async (messageToSend) => {
    const userMessage = (messageToSend || input).trim();
    if (!userMessage || isLoading) return;

    setInput('');
    addMessage('user', userMessage);
    setIsLoading(true);

    // OPTIMIZED: Try local handling first - instant response
    const localResult = handleLocalQuery(userMessage);
    if (localResult) {
      addMessage('bot', localResult.text, localResult.assets);
      setIsLoading(false);
      return;
    }

    // Fall back to AI only for complex queries
    if (!chatRef.current) {
      addMessage('bot', 'The AI is initializing. Please try again in a moment.');
      setIsLoading(false);
      return;
    }

    try {
      const response = await chatRef.current.sendMessage({
        message: userMessage,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              responseText: { type: Type.STRING },
              asset_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        }
      });

      let aiResponse;
      try {
        aiResponse = JSON.parse(response.text);
      } catch (e) {
        console.error("Error parsing AI JSON response:", e);
        console.error("Raw response:", response.text);
        addMessage('bot', "I apologize, I received an unexpected response. Please try rephrasing your question.");
        setIsLoading(false);
        return;
      }

      const foundAssets = aiResponse.asset_ids && aiResponse.asset_ids.length > 0
        ? assets.filter(asset => {
          const assetIdStr = String(asset.id);
          return aiResponse.asset_ids.some(id => String(id) === assetIdStr);
        })
        : [];

      addMessage('bot', aiResponse.responseText, foundAssets);

    } catch (error) {
      console.error('Error sending message to Gemini:', error);
      addMessage('bot', 'I\'m sorry, I encountered an error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Drag bounds */}
      <div ref={dragConstraintsRef} className="fixed inset-0 pointer-events-none" />

      <motion.div
        ref={floatingRef}
        className="fixed bottom-6 right-6 z-50"
        drag
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        dragConstraints={dragConstraintsRef}
        onDragEnd={persistPosition}
        style={{ x: dragX, y: dragY }}
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              onPointerDown={(e) => dragControls.start(e)}
              className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-blue-500/50 transition-all hover:scale-110 cursor-grab-black cursor-grabbing-black"
              aria-label="Open AI Assistant"
            >
              <MessageCircle className="w-8 h-8" />
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
                className="absolute inset-0 bg-blue-400 rounded-full opacity-30"
              />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 200 }}
              className="w-[400px] h-[600px] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200"
            >
              <header
                onPointerDown={(e) => dragControls.start(e)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 flex items-center justify-between text-white flex-shrink-0 cursor-grab-black cursor-grabbing-black"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div title="Drag to move">
                    <h3 className="font-bold">AI Assistant AIアシスタント</h3>
                    <p className="text-blue-100 text-xs">SPring-8 Inventory 在庫</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setLanguage(language === 'en-US' ? 'ja-JP' : 'en-US')}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="px-2 py-1 hover:bg-white/20 rounded-lg transition-colors text-xs font-semibold"
                    title="Switch language / 言語を切り替え"
                  >
                    {language === 'en-US' ? '🇺🇸 EN' : '🇯🇵 JP'}
                  </button>
                  <button
                    onClick={() => setVoiceEnabled(!voiceEnabled)}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    title={voiceEnabled ? 'Disable voice' : 'Enable voice'}
                  >
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => {
                      const initialMsg = {
                        id: 1,
                        type: 'bot',
                        text: 'Hello! I\'m your SPring-8 Inventory Assistant. 👋\nこんにちは！SPring-8在庫管理アシスタントです。👋\n\nI support both English and Japanese!\n英語と日本語の両方に対応しています！\n\nExamples / 例：\n• "Find asset 82022030094" / 「資産82022030094を探して」\n• "Show me printers" / 「プリンターを見せて」\n• "Assets in room 208" / 「208号室の資産」\n\nHow can I help you today? / 今日はどうお手伝いしましょうか？',
                        timestamp: new Date()
                      };
                      setMessages([initialMsg]);
                      stopSpeaking();
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    title="Clear chat history / チャット履歴をクリア"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => { setIsOpen(false); stopSpeaking(); }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    aria-label="Close chat"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'bot' && <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500"><Bot className="w-5 h-5 text-white" /></div>}
                    <div className={`flex flex-col max-w-[85%] ${message.type === 'user' ? 'items-end' : 'items-start'}`}>
                      <div className={`rounded-2xl p-3 text-sm ${message.type === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none'}`}>
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      </div>
                      {message.assets && message.assets.length > 0 && (
                        <div className="mt-2 space-y-2 w-full">
                          {message.assets.map((asset) => <AssetCard key={asset.id} asset={asset} onNavigate={onNavigate} />)}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-1.5 px-1">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    {message.type === 'user' && <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600"><User className="w-5 h-5 text-white" /></div>}
                  </motion.div>
                ))}
                {isLoading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                    <div className="flex gap-2 items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-500 to-blue-500"><Bot className="w-5 h-5 text-white" /></div>
                      <div className="flex gap-2 items-center bg-white rounded-2xl p-3 border border-gray-200">
                        <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                        <span className="text-sm text-gray-600">Thinking 考え...</span>
                      </div>
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </main>

              <footer
                onPointerDown={(e) => dragControls.start(e)}
                className="p-4 border-t border-gray-200 bg-white flex-shrink-0 cursor-grab-black cursor-grabbing-black"
                title="Drag to move"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onKeyPress={handleKeyPress}
                    placeholder={isListening ? (language === 'ja-JP' ? '聞いています...' : 'Listening...') : (language === 'ja-JP' ? 'メッセージを入力...' : 'Type your message...')}
                    disabled={isLoading || isListening}
                    className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:bg-gray-100 transition-shadow"
                  />
                  <button
                    onClick={toggleListening}
                    disabled={isLoading}
                    onPointerDown={(e) => e.stopPropagation()}
                    className={`p-3 rounded-full transition-all flex-shrink-0 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
                    title={isListening ? 'Stop listening' : 'Start voice input'}
                  >
                    {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isLoading}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all flex-shrink-0"
                    aria-label="Send message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
                {isSpeaking && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                    <Volume2 className="w-4 h-4 animate-pulse text-blue-600" />
                    <span>Speaking 話し中...</span>
                    <button
                      onClick={stopSpeaking}
                      onPointerDown={(e) => e.stopPropagation()}
                      className="ml-auto text-red-600 hover:text-red-700 font-medium"
                    >
                      Stop 停止
                    </button>
                  </div>
                )}
              </footer>
            </motion.div>
          )}
        </AnimatePresence >
      </motion.div >
    </>
  );
}
