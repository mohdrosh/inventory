// server/index.js - PRODUCTION READY with Supabase Assets
// TYPE FIELD REMOVED FROM ALL API RESPONSES + SINGLE ASSET ENDPOINT ADDED
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const app = express();
const PORT = process.env.PORT || 5000;

// Supabase Configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('🔍 Environment Check:');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ Loaded' : '❌ Missing');
console.log('SUPABASE_ANON_KEY:', supabaseKey ? '✅ Loaded' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Missing Supabase credentials!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test Supabase connection
(async () => {
  try {
    const { data, error } = await supabase.from('assets').select('count').limit(1);
    if (error) {
      console.log('⚠️ Supabase assets table:', error.message);
    } else {
      console.log('✅ Connected to Supabase successfully');
    }
  } catch (err) {
    console.log('⚠️ Could not verify Supabase connection:', err.message);
  }
})();

app.use(express.json());
app.use(cors({
  origin: ["http://localhost:3000",
           "https://spring8inventorymanagement.vercel.app"],
  credentials: true
}));
app.options("*", cors());

// -------- Frontend (React Build) --------
const clientBuildPath = path.join(__dirname, "../client/build");

if (require("fs").existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  console.log("✅ Serving React frontend from build folder");
} else {
  console.log("⚙️ React build not found — backend only mode");
}

// -------- Multer for Image Uploads --------
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// In-memory session storage
const activeSessions = new Map();
const generateToken = () => crypto.randomBytes(32).toString("hex");

// ============================================
// AUTHENTICATION ROUTES
// ============================================

app.post("/api/auth/login", async (req, res) => {
  try {
    const { userId, password } = req.body;

    if (!userId || !password) {
      return res.status(400).json({ error: "User ID and password are required" });
    }

    const { data: users, error } = await supabase
      .from("users")
      .select("*")
      .eq("user_id", userId)
      .eq("password", password)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ error: "Database error" });
    }

    if (!users || users.length === 0) {
      return res.status(401).json({ error: "Invalid user ID or password" });
    }

    const user = users[0];
    const token = generateToken();

    activeSessions.set(token, {
      userId: user.user_id,
      name: user.name,
      role: user.role,
      loginTime: new Date().toISOString(),
    });

    console.log(`✅ User logged in: ${user.name} (${user.user_id})`);

    res.json({
      success: true,
      token,
      user: {
        userId: user.user_id,
        name: user.name,
        role: user.role,
        email: user.email
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token && activeSessions.has(token)) {
      const session = activeSessions.get(token);
      console.log(`👋 User logged out: ${session.name}`);
      activeSessions.delete(token);
    }
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

app.get("/api/auth/verify", (req, res) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (!token || !activeSessions.has(token)) {
      return res.status(401).json({ valid: false, error: "Invalid token" });
    }
    res.json({ valid: true, user: activeSessions.get(token) });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ valid: false, error: "Verification failed" });
  }
});

// ============================================
// ASSET ROUTES - USING SUPABASE (TYPE REMOVED)
// ============================================

// Get all assets from Supabase
app.get("/api/assets", async (req, res) => {
  try {
    const { building, floor } = req.query;

    let query = supabase.from("assets").select("*");

    if (building) {
      query = query.ilike("building", `%${building}%`);
    }
    if (floor) {
      query = query.ilike("floor", floor);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error("Error fetching assets:", error);
      return res.status(500).json({ error: "Failed to load assets" });
    }

    // Transform to camelCase for frontend - TYPE FIELD REMOVED
    const transformedAssets = assets.map(asset => {
      // Build image_urls array from all available sources
      let imageUrls = [];
      try {
        if (asset.image_urls && Array.isArray(asset.image_urls) && asset.image_urls.length > 0) {
          imageUrls = asset.image_urls;
        } else if (asset.image_urls && typeof asset.image_urls === 'string') {
          imageUrls = JSON.parse(asset.image_urls);
        } else {
          if (asset.image_url) imageUrls.push(asset.image_url);
          if (asset.image_url1) imageUrls.push(asset.image_url1);
        }
      } catch (e) {
        if (asset.image_url) imageUrls.push(asset.image_url);
        if (asset.image_url1) imageUrls.push(asset.image_url1);
      }

      return {
        id: String(asset.id),
        name: asset.name,
        room: asset.room,
        building: asset.building,
        floor: asset.floor,
        lat: asset.lat,
        lon: asset.lon,
        latitude: asset.lat,
        longitude: asset.lon,
        status: asset.status,
        notes: asset.notes,
        description: asset.description,
        image_url: asset.image_url,
        image_url1: asset.image_url1,
        image_urls: imageUrls,
        user: asset.user,
        actual_user: asset.actual_user,
        inventory_status: asset.inventory_status || 'pending',
        inventory_date: asset.inventory_date,
        management_location: asset.management_location,
        company_name: asset.company_name,
        invoice_number: asset.invoice_number,
        installation_location: asset.installation_location,
        parent_asset_id: asset.parent_asset_id,
        qr_code: asset.qr_code,
        qr_code_url: asset.qr_code_url,
        change_history: asset.change_history,
        
        // ✨ NEW: Add manual_position and location_confirmed
        manual_position: asset.manual_position,
        location_confirmed: asset.location_confirmed,
        location_confirmed_at: asset.location_confirmed_at,
        
        last_updated: asset.last_updated,
        created_at: asset.created_at,
      };
    });

    res.json(transformedAssets);
  } catch (err) {
    console.error("Error reading assets:", err);
    res.status(500).json({ error: "Failed to load assets" });
  }
});

// ✨ NEW: Get single asset by ID from Supabase
app.get("/api/assets/:id", async (req, res) => {
  try {
    const assetId = req.params.id;

    const { data: asset, error } = await supabase
      .from("assets")
      .select("*")
      .eq("id", assetId)
      .single();

    if (error) {
      console.error("Error fetching asset:", error);
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: "Asset not found" });
      }
      return res.status(500).json({ error: "Failed to load asset" });
    }

    if (!asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Build image_urls array from all available sources
    let imageUrls = [];
    try {
      if (asset.image_urls && Array.isArray(asset.image_urls) && asset.image_urls.length > 0) {
        imageUrls = asset.image_urls;
      } else if (asset.image_urls && typeof asset.image_urls === 'string') {
        imageUrls = JSON.parse(asset.image_urls);
      } else {
        // Build from image_url and image_url1 if image_urls is empty
        if (asset.image_url) imageUrls.push(asset.image_url);
        if (asset.image_url1) imageUrls.push(asset.image_url1);
      }
    } catch (e) {
      // Fallback: build from individual fields
      if (asset.image_url) imageUrls.push(asset.image_url);
      if (asset.image_url1) imageUrls.push(asset.image_url1);
    }

    // Transform to camelCase for frontend - TYPE FIELD REMOVED
    const transformedAsset = {
      id: String(asset.id), // Ensure ID is string to preserve leading zeros
      name: asset.name,
      room: asset.room,
      building: asset.building,
      floor: asset.floor,
      lat: asset.lat,
      lon: asset.lon,
      status: asset.status,
      notes: asset.notes,
      description: asset.description,
      image_url: asset.image_url,
      image_url1: asset.image_url1,
      image_urls: imageUrls,
      user: asset.user,
      actual_user: asset.actual_user,
      inventory_status: asset.inventory_status || 'pending',
      inventory_date: asset.inventory_date,
      management_location: asset.management_location,
      company_name: asset.company_name,
      invoice_number: asset.invoice_number,
      installation_location: asset.installation_location,
      parent_asset_id: asset.parent_asset_id,
      qr_code: asset.qr_code,
      qr_code_url: asset.qr_code_url,
      change_history: asset.change_history,
      last_updated: asset.last_updated,
      created_at: asset.created_at,
    };

    console.log(`✅ Fetched asset ${assetId}`);
    res.json(transformedAsset);
  } catch (err) {
    console.error("Error reading asset:", err);
    res.status(500).json({ error: "Failed to load asset" });
  }
});

// Update asset in Supabase
app.put("/api/assets/:id", async (req, res) => {
  try {
    const assetId = req.params.id;
    const updates = req.body;

    // Transform camelCase to snake_case - TYPE FIELD REMOVED, CONDITION REMOVED
    const dbUpdates = {
      ...(updates.name && { name: updates.name }),
      ...(updates.room !== undefined && { room: updates.room }),
      ...(updates.building && { building: updates.building }),
      ...(updates.floor && { floor: updates.floor }),
      ...(updates.lat !== undefined && { lat: updates.lat }),
      ...(updates.lon !== undefined && { lon: updates.lon }),
      ...(updates.status && { status: updates.status }),
      ...(updates.notes !== undefined && { notes: updates.notes }),
      ...(updates.inventory_status !== undefined && { inventory_status: updates.inventory_status }),
      ...(updates.inventory_date !== undefined && { inventory_date: updates.inventory_date }),
      ...(updates.description !== undefined && { description: updates.description }),
      ...(updates.user !== undefined && { user: updates.user }),
      ...(updates.actual_user !== undefined && { actual_user: updates.actual_user }),
      ...(updates.management_location !== undefined && { management_location: updates.management_location }),
      ...(updates.company_name !== undefined && { company_name: updates.company_name }),
      ...(updates.invoice_number !== undefined && { invoice_number: updates.invoice_number }),
      ...(updates.installation_location !== undefined && { installation_location: updates.installation_location }),
      ...(updates.parent_asset_id !== undefined && { parent_asset_id: updates.parent_asset_id }),
      ...(updates.change_history !== undefined && { change_history: updates.change_history }),
      
      // ✨ NEW: Add support for manual_position and location_confirmed
      ...(updates.manual_position !== undefined && { manual_position: updates.manual_position }),
      ...(updates.location_confirmed !== undefined && { location_confirmed: updates.location_confirmed }),
      ...(updates.location_confirmed_at !== undefined && { location_confirmed_at: updates.location_confirmed_at }),
      
      last_updated: new Date().toISOString(),
    };

    console.log(`📝 Updating asset ${assetId} with:`, dbUpdates);

    const { data, error } = await supabase
      .from("assets")
      .update(dbUpdates)
      .eq("id", assetId)
      .select()
      .single();

    if (error) {
      console.error("Error updating asset:", error);
      return res.status(500).json({ error: "Failed to update asset" });
    }

    if (!data) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Transform back to camelCase - TYPE FIELD REMOVED, CONDITION REMOVED
    const transformedAsset = {
      id: String(data.id),
      name: data.name,
      room: data.room,
      building: data.building,
      floor: data.floor,
      lat: data.lat,
      lon: data.lon,
      latitude: data.lat,   // Alias for GPS
      longitude: data.lon,  // Alias for GPS
      status: data.status,
      notes: data.notes,
      description: data.description,
      image_url: data.image_url,
      user: data.user,
      actual_user: data.actual_user,
      inventory_status: data.inventory_status || 'pending',
      inventory_date: data.inventory_date,
      management_location: data.management_location,
      company_name: data.company_name,
      invoice_number: data.invoice_number,
      installation_location: data.installation_location,
      parent_asset_id: data.parent_asset_id,
      qr_code: data.qr_code,
      qr_code_url: data.qr_code_url,
      change_history: data.change_history,
      
      // ✨ NEW: Return manual_position and location_confirmed
      manual_position: data.manual_position,
      location_confirmed: data.location_confirmed,
      location_confirmed_at: data.location_confirmed_at,
      
      last_updated: data.last_updated,
      created_at: data.created_at,
    };

    console.log(`✅ Asset ${assetId} updated in Supabase`);
    res.json(transformedAsset);
  } catch (err) {
    console.error("Error updating asset:", err);
    res.status(500).json({ error: "Failed to update asset" });
  }
});

// ===== GPS POSITIONING ENDPOINTS =====

// Update single asset GPS coordinates (for mobile tracking)
app.put("/api/assets/:id/gps", async (req, res) => {
  try {
    const assetId = req.params.id;
    const { latitude, longitude, accuracy } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "Latitude and longitude are required" });
    }

    const { data, error } = await supabase
      .from("assets")
      .update({
        lat: latitude,
        lon: longitude,
        gps_accuracy: accuracy,
        gps_updated_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      })
      .eq("id", assetId)
      .select("id, lat, lon")
      .single();

    if (error) {
      console.error("Error updating GPS:", error);
      return res.status(500).json({ error: "Failed to update GPS coordinates" });
    }

    console.log(`📍 GPS updated for asset ${assetId}: ${latitude}, ${longitude}`);
    res.json({
      success: true,
      assetId,
      latitude: data.lat,
      longitude: data.lon,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error("Error updating GPS:", err);
    res.status(500).json({ error: "Failed to update GPS coordinates" });
  }
});

// Bulk update GPS coordinates (for batch tracking devices)
app.post("/api/assets/gps/bulk", async (req, res) => {
  try {
    const { positions } = req.body;

    if (!positions || !Array.isArray(positions)) {
      return res.status(400).json({ error: "Positions array is required" });
    }

    const results = {
      updated: [],
      failed: []
    };

    for (const pos of positions) {
      const { assetId, latitude, longitude, accuracy } = pos;

      if (!assetId || latitude === undefined || longitude === undefined) {
        results.failed.push({ assetId, error: "Missing required fields" });
        continue;
      }

      const { error } = await supabase
        .from("assets")
        .update({
          lat: latitude,
          lon: longitude,
          gps_accuracy: accuracy,
          gps_updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
        .eq("id", assetId);

      if (error) {
        results.failed.push({ assetId, error: error.message });
      } else {
        results.updated.push(assetId);
      }
    }

    console.log(`📍 Bulk GPS update: ${results.updated.length} updated, ${results.failed.length} failed`);
    res.json(results);
  } catch (err) {
    console.error("Error in bulk GPS update:", err);
    res.status(500).json({ error: "Failed to update GPS coordinates" });
  }
});

// Upload image to Supabase Storage
app.post("/api/assets/:id/upload-image", upload.single("image"), async (req, res) => {
  try {
    const assetId = req.params.id;
    const photoType = req.body.photoType || 'full'; // Get photo type from request (full, closeup, qr)

    console.log(`📸 Uploading ${photoType} photo for asset ${assetId}`);

    if (!req.file) {
      return res.status(400).json({ error: "No image uploaded" });
    }

    // Check if asset exists and get current images
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("id, image_url, image_url1, image_urls")
      .eq("id", assetId)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Generate unique filename with photo type
    const fileExt = path.extname(req.file.originalname);
    const fileName = `asset-${assetId}-${photoType}-${Date.now()}${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("asset-images")
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return res.status(500).json({ error: "Failed to upload image: " + uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("asset-images")
      .getPublicUrl(fileName);

    const imageUrl = urlData.publicUrl;

    // Get existing image_urls array or create new one
    let existingUrls = [];
    try {
      console.log('Current asset.image_urls:', asset.image_urls, 'Type:', typeof asset.image_urls);
      console.log('Current asset.image_url:', asset.image_url);
      console.log('Current asset.image_url1:', asset.image_url1);

      if (asset.image_urls && Array.isArray(asset.image_urls) && asset.image_urls.length > 0) {
        existingUrls = asset.image_urls;
      } else if (asset.image_urls && typeof asset.image_urls === 'string') {
        const parsed = JSON.parse(asset.image_urls);
        if (Array.isArray(parsed) && parsed.length > 0) {
          existingUrls = parsed;
        }
      }

      // If image_urls is still empty, build from image_url and image_url1
      if (existingUrls.length === 0) {
        if (asset.image_url) existingUrls.push(asset.image_url);
        if (asset.image_url1) existingUrls.push(asset.image_url1);
      }

      // Ensure existingUrls is always an array
      if (!Array.isArray(existingUrls)) {
        existingUrls = [];
      }
    } catch (e) {
      console.error('Error parsing image_urls:', e);
      // Fallback: build from individual fields
      if (asset.image_url) existingUrls.push(asset.image_url);
      if (asset.image_url1) existingUrls.push(asset.image_url1);
    }

    console.log('Existing URLs before append:', existingUrls);

    // Append new image URL to array
    const updatedUrls = [...existingUrls, imageUrl];

    console.log('Updated URLs after append:', updatedUrls);

    // Determine the main image_url based on photo type
    // If uploading "full" (overall) photo, it becomes the main image_url
    let mainImageUrl = asset.image_url;
    if (photoType === 'full') {
      mainImageUrl = imageUrl; // Overall photo becomes the main display image
      console.log('📌 Setting full photo as main image_url:', mainImageUrl);
    } else if (!mainImageUrl) {
      // If no main image exists yet, use the first available
      mainImageUrl = updatedUrls[0];
    }

    // Update asset with new image URLs
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        image_url: mainImageUrl, // Main photo for asset listings
        image_urls: updatedUrls,
        last_updated: new Date().toISOString()
      })
      .eq("id", assetId);

    if (updateError) {
      console.error("Error updating asset with image URL:", updateError);
      return res.status(500).json({ error: "Failed to update asset" });
    }

    console.log(`✅ ${photoType} image uploaded for asset ${assetId}: ${imageUrl} (Total: ${updatedUrls.length} images)`);

    res.json({ success: true, imageUrl, imageUrls: updatedUrls, mainImageUrl, photoType });
  } catch (err) {
    console.error("Error uploading image:", err);
    res.status(500).json({ error: "Failed to upload image" });
  }
});

// Delete image from asset
app.delete("/api/assets/:id/delete-image", async (req, res) => {
  try {
    const assetId = req.params.id;
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: "No image URL provided" });
    }

    console.log(`🗑️ Deleting image from asset ${assetId}: ${imageUrl}`);

    // Get current asset
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("id, image_url, image_url1, image_urls")
      .eq("id", assetId)
      .single();

    if (fetchError || !asset) {
      return res.status(404).json({ error: "Asset not found" });
    }

    // Get current image_urls array
    let currentUrls = [];
    if (asset.image_urls && Array.isArray(asset.image_urls)) {
      currentUrls = [...asset.image_urls];
    } else if (asset.image_urls && typeof asset.image_urls === 'string') {
      try {
        currentUrls = JSON.parse(asset.image_urls);
      } catch (e) {
        currentUrls = [];
      }
    }

    // Remove the image from the array
    const updatedUrls = currentUrls.filter(url => url !== imageUrl);

    // Determine new main image_url
    let newMainImageUrl = asset.image_url;
    if (asset.image_url === imageUrl) {
      // The deleted image was the main one, pick next available
      newMainImageUrl = updatedUrls.length > 0 ? updatedUrls[0] : null;
    }

    // Try to delete from Supabase Storage
    try {
      // Extract filename from URL
      const urlParts = imageUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];

      if (fileName && fileName.startsWith('asset-')) {
        const { error: deleteError } = await supabase.storage
          .from("asset-images")
          .remove([fileName]);

        if (deleteError) {
          console.warn("Warning: Could not delete from storage:", deleteError.message);
        } else {
          console.log(`✅ Deleted ${fileName} from storage`);
        }
      }
    } catch (storageErr) {
      console.warn("Warning: Storage deletion failed:", storageErr.message);
    }

    // Update asset in database
    const { error: updateError } = await supabase
      .from("assets")
      .update({
        image_url: newMainImageUrl,
        image_urls: updatedUrls,
        last_updated: new Date().toISOString()
      })
      .eq("id", assetId);

    if (updateError) {
      console.error("Error updating asset:", updateError);
      return res.status(500).json({ error: "Failed to update asset" });
    }

    console.log(`✅ Image deleted from asset ${assetId}. Remaining: ${updatedUrls.length} images`);

    res.json({
      success: true,
      imageUrls: updatedUrls,
      mainImageUrl: newMainImageUrl,
      deletedUrl: imageUrl
    });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

// -------- Real-Time GPS Tracking Endpoints --------

// Update single asset GPS location (for mobile tracking)
app.post("/api/assets/:id/gps", async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude, accuracy, timestamp } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: "latitude and longitude are required" });
    }

    console.log(`📍 GPS update for ${id}: lat=${latitude}, lon=${longitude}`);

    const { error } = await supabase
      .from('assets')
      .update({
        lat: latitude,
        lon: longitude
      })
      .eq('id', id);

    if (error) {
      console.error(`❌ GPS update failed for ${id}:`, error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ GPS updated for asset ${id}`);
    res.json({ success: true, assetId: id, latitude, longitude });
  } catch (err) {
    console.error("Error updating GPS:", err);
    res.status(500).json({ error: "Failed to update GPS coordinates" });
  }
});

// Bulk GPS update (for multiple assets or batch updates)
app.post("/api/assets/bulk-gps-update", async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({ error: "updates array is required" });
    }

    console.log(`📍 Bulk GPS update: ${updates.length} assets`);

    const results = { success: 0, failed: 0, errors: [] };

    for (const update of updates) {
      const { id, latitude, longitude } = update;

      if (!id || latitude === undefined || longitude === undefined) {
        results.failed++;
        results.errors.push({ id, error: "Missing required fields" });
        continue;
      }

      const { error } = await supabase
        .from('assets')
        .update({ lat: latitude, lon: longitude })
        .eq('id', id);

      if (error) {
        results.failed++;
        results.errors.push({ id, error: error.message });
      } else {
        results.success++;
      }
    }

    console.log(`✅ Bulk GPS update: ${results.success} success, ${results.failed} failed`);
    res.json(results);
  } catch (err) {
    console.error("Error in bulk GPS update:", err);
    res.status(500).json({ error: "Failed to update GPS coordinates" });
  }
});

// Get assets with recent GPS updates (for tracking dashboard)
app.get("/api/assets/gps-tracked", async (req, res) => {
  try {
    const { building, floor } = req.query;

    let query = supabase
      .from('assets')
      .select('id, name, building, floor, room, lat, lon')
      .not('lat', 'is', null)
      .not('lon', 'is', null);

    if (building) query = query.eq('building', building);
    if (floor) query = query.eq('floor', floor);

    const { data, error } = await query;

    if (error) throw error;

    const assets = data.map(a => ({
      id: a.id,
      name: a.name,
      building: a.building,
      floor: a.floor,
      room: a.room,
      latitude: a.lat,
      longitude: a.lon
    }));

    res.json(assets);
  } catch (err) {
    console.error("Error fetching GPS-tracked assets:", err);
    res.status(500).json({ error: "Failed to fetch GPS-tracked assets" });
  }
});

// ============================================
// SIMPLIFIED BUILDING ENDPOINTS
// Add this BEFORE the "// Health check" line in server/index.js
// ============================================

// ============================================
// BUILDINGS ENDPOINTS (SIMPLIFIED)
// ============================================

// GET all buildings with images
// GET all buildings with images
app.get("/api/buildings", async (req, res) => {
  try {
    const { data: buildings, error } = await supabase
      .from("buildings")
      .select(`
        *,
        images:building_images(
          id,
          image_url,
          is_primary
        )
      `)
      .eq("building_images.is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching buildings:", error);
      return res.status(500).json({ error: "Failed to fetch buildings" });
    }

    // Transform to add primary_image_url
    const transformedBuildings = (buildings || []).map(building => {
      const primaryImage = building.images?.find(img => img.is_primary);
      return {
        ...building,
        primary_image_url: primaryImage?.image_url || building.images?.[0]?.image_url || null
      };
    });

    console.log(`✅ Fetched ${transformedBuildings.length} buildings with images`);
    res.json(transformedBuildings);
  } catch (err) {
    console.error("Error reading buildings:", err);
    res.status(500).json({ error: "Failed to load buildings" });
  }
});

// GET single building with all images
app.get("/api/buildings/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Get building
    const { data: building, error: buildingError } = await supabase
      .from("buildings")
      .select("*")
      .eq("id", id)
      .single();

    if (buildingError || !building) {
      return res.status(404).json({ error: "Building not found" });
    }

    // Get images
    const { data: images, error: imagesError } = await supabase
      .from("building_images")
      .select("id, image_url, caption, display_order, is_primary")
      .eq("building_id", id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("display_order");

    building.images = images || [];

    console.log(`✅ Fetched building ${id} with ${building.images.length} images`);
    res.json(building);
  } catch (err) {
    console.error("Error reading building:", err);
    res.status(500).json({ error: "Failed to load building" });
  }
});

// GET building by name
app.get("/api/buildings/by-name/:name", async (req, res) => {
  try {
    const buildingName = decodeURIComponent(req.params.name);

    const { data: building, error } = await supabase
      .from("buildings")
      .select("*")
      .ilike("name", buildingName)
      .single();

    if (error || !building) {
      return res.status(404).json({ error: "Building not found" });
    }

    // Get images
    const { data: images } = await supabase
      .from("building_images")
      .select("id, image_url, caption, display_order, is_primary")
      .eq("building_id", building.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("display_order");

    building.images = images || [];

    console.log(`✅ Fetched building "${buildingName}"`);
    res.json(building);
  } catch (err) {
    console.error("Error reading building:", err);
    res.status(500).json({ error: "Failed to load building" });
  }
});

// POST sync buildings from assets
app.post("/api/buildings/sync", async (req, res) => {
  try {
    await supabase.rpc("sync_all_buildings");

    const { data: buildings } = await supabase
      .from("buildings")
      .select("id", { count: 'exact', head: true });

    console.log(`✅ Buildings synced`);
    res.json({
      message: "Buildings synced successfully",
      total_buildings: buildings?.length || 0
    });
  } catch (err) {
    console.error("Error syncing buildings:", err);
    res.status(500).json({ error: "Failed to sync buildings" });
  }
});

// ============================================
// BUILDING IMAGES ENDPOINTS (SIMPLIFIED)
// ============================================

// GET all images for a building
app.get("/api/buildings/:buildingId/images", async (req, res) => {
  try {
    const { buildingId } = req.params;

    const { data: images, error } = await supabase
      .from("building_images")
      .select("id, image_url, caption, display_order, is_primary, uploaded_at")
      .eq("building_id", buildingId)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("display_order");

    if (error) {
      console.error("Error fetching images:", error);
      return res.status(500).json({ error: "Failed to fetch images" });
    }

    console.log(`✅ Fetched ${images?.length || 0} images for building ${buildingId}`);
    res.json(images || []);
  } catch (err) {
    console.error("Error reading images:", err);
    res.status(500).json({ error: "Failed to load images" });
  }
});

// POST add image to building
app.post("/api/buildings/:buildingId/images", async (req, res) => {
  try {
    const { buildingId } = req.params;
    const { image_url, caption, is_primary, display_order } = req.body;

    if (!image_url) {
      return res.status(400).json({ error: "Image URL is required" });
    }

    // Verify building exists
    const { data: building } = await supabase
      .from("buildings")
      .select("id")
      .eq("id", buildingId)
      .single();

    if (!building) {
      return res.status(404).json({ error: "Building not found" });
    }

    // Insert image
    const { data: newImage, error } = await supabase
      .from("building_images")
      .insert({
        building_id: buildingId,
        image_url,
        caption,
        is_primary: is_primary || false,
        display_order: display_order || 0
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding image:", error);
      return res.status(500).json({ error: "Failed to add image" });
    }

    console.log(`✅ Added image to building ${buildingId}`);
    res.status(201).json(newImage);
  } catch (err) {
    console.error("Error adding image:", err);
    res.status(500).json({ error: "Failed to add image" });
  }
});

// PUT update building image
app.put("/api/buildings/:buildingId/images/:imageId", async (req, res) => {
  try {
    const { buildingId, imageId } = req.params;
    const { image_url, caption, is_primary, display_order } = req.body;

    const updateData = {};
    if (image_url !== undefined) updateData.image_url = image_url;
    if (caption !== undefined) updateData.caption = caption;
    if (is_primary !== undefined) updateData.is_primary = is_primary;
    if (display_order !== undefined) updateData.display_order = display_order;

    const { data: updatedImage, error } = await supabase
      .from("building_images")
      .update(updateData)
      .eq("id", imageId)
      .eq("building_id", buildingId)
      .select()
      .single();

    if (error || !updatedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    console.log(`✅ Updated image ${imageId}`);
    res.json(updatedImage);
  } catch (err) {
    console.error("Error updating image:", err);
    res.status(500).json({ error: "Failed to update image" });
  }
});

// DELETE building image
app.delete("/api/buildings/:buildingId/images/:imageId", async (req, res) => {
  try {
    const { buildingId, imageId } = req.params;

    const { data: updatedImage, error } = await supabase
      .from("building_images")
      .update({ is_active: false })
      .eq("id", imageId)
      .eq("building_id", buildingId)
      .select()
      .single();

    if (error || !updatedImage) {
      return res.status(404).json({ error: "Image not found" });
    }

    console.log(`✅ Deleted image ${imageId}`);
    res.json({ message: "Image deleted", image: updatedImage });
  } catch (err) {
    console.error("Error deleting image:", err);
    res.status(500).json({ error: "Failed to delete image" });
  }
});

console.log("✅ Building endpoints loaded");

// ============================================
// END OF BUILDING ENDPOINTS
// ============================================

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    database: "supabase",
    sessions: activeSessions.size
  });
});

// ============================================
// USER NOTIFICATIONS ROUTES
// ============================================

// Get user's read notification IDs
app.get("/api/notifications/read/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const { data, error } = await supabase
      .from("user_notifications")
      .select("notification_key")
      .eq("user_id", userId)
      .eq("is_read", true);

    if (error) {
      // If table doesn't exist, return empty array
      if (error.code === '42P01') {
        return res.json({ readIds: [] });
      }
      console.error("Error fetching notifications:", error);
      return res.status(500).json({ error: "Failed to fetch notifications" });
    }

    const readIds = data ? data.map(item => item.notification_key) : [];
    res.json({ readIds });
  } catch (err) {
    console.error("Error in get notifications:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark notification as read
app.post("/api/notifications/read", async (req, res) => {
  try {
    const { userId, notificationId } = req.body;
    
    if (!userId || !notificationId) {
      return res.status(400).json({ error: "User ID and notification ID are required" });
    }

    // Upsert - insert or update if exists
    const { data, error } = await supabase
      .from("user_notifications")
      .upsert({
        user_id: userId,
        notification_key: notificationId,
        is_read: true,
        read_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,notification_key'
      });

    if (error) {
      console.error("Error marking notification as read:", error);
      return res.status(500).json({ error: "Failed to mark notification as read" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Error in mark as read:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Mark all notifications as read for a user
app.post("/api/notifications/read-all", async (req, res) => {
  try {
    const { userId, notificationIds } = req.body;
    
    if (!userId || !notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({ error: "User ID and notification IDs array are required" });
    }

    // Insert all notification IDs as read
    const records = notificationIds.map(notifId => ({
      user_id: userId,
      notification_key: notifId,
      is_read: true,
      read_at: new Date().toISOString()
    }));

    const { data, error } = await supabase
      .from("user_notifications")
      .upsert(records, {
        onConflict: 'user_id,notification_key'
      });

    if (error) {
      console.error("Error marking all as read:", error);
      return res.status(500).json({ error: "Failed to mark all as read" });
    }

    res.json({ success: true, count: notificationIds.length });
  } catch (err) {
    console.error("Error in mark all as read:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// Serve React app for non-API routes
/*app.use((req, res) => {
  if (!req.path.startsWith('/api')) {
    if (require("fs").existsSync(clientBuildPath)) {
      res.sendFile(path.join(clientBuildPath, "index.html"));
    } else {
      res.status(404).json({ error: "Frontend not built yet" });
    }
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});*/

// static frontend
app.use(express.static(clientBuildPath));

// SPA fallback (GET ONLY)
app.get("*", (req, res) => {
  if (!req.path.startsWith("/api")) {
    res.sendFile(path.join(clientBuildPath, "index.html"));
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Authentication enabled`);
  console.log(`📊 Data Source: Supabase (persistent)`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});