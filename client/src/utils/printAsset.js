export const printAssetPDF = (asset) => {
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
        { label: 'Main (全体)', url: mainPhoto },
        { label: 'Close-up (アップ)', url: closeupPhoto },
        { label: 'QR Code', url: qrPhoto }
    ].filter(item => item.url);

    const photosHtml = selectedPhotos.length > 0
        ? `
      <div class="photos-section">
        <div class="section-title">📷 Photos</div>
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
        : '';

    const printContent = `
    <html>
    <head>
      <title>Asset: ${asset.name}</title>
      <style>
        @page { size: A4; margin: 10mm; }
        * { box-sizing: border-box; }
        body { 
          font-family: "Helvetica Neue", Arial, sans-serif; 
          padding: 0; 
          margin: 0 auto; 
          color: #111; 
          font-size: 9px; 
          line-height: 1.2;
          max-width: 100%;
        }
        h1 { 
          color: #333; 
          border-bottom: 2px solid #333; 
          padding-bottom: 2px; 
          margin: 0 0 10px 0; 
          font-size: 16px; 
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title { 
          background: #f3f4f6;
          color: #111; 
          font-size: 10px; 
          font-weight: bold;
          padding: 2px 5px;
          margin-bottom: 5px; 
          border-left: 3px solid #6366f1;
        }
        .container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .row {
          display: flex;
          gap: 10px;
        }
        .col-half { flex: 1; }
        .card { 
          border: 1px solid #ddd; 
          border-radius: 4px; 
          padding: 6px; 
          height: 100%;
        }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px 10px; }
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4px 10px; }
        
        .field { margin-bottom: 3px; }
        .label { 
          font-weight: bold; 
          color: #555; 
          font-size: 7px; 
          text-transform: uppercase; 
        }
        .value { 
          font-size: 9px; 
          color: #000; 
          font-weight: 500;
          word-break: break-all;
        }
        .value.large { font-size: 11px; font-weight: bold; }
        
        .photos-section { margin-top: 5px; }
        .photos-grid { 
          display: grid; 
          grid-template-columns: repeat(3, 1fr); 
          gap: 10px; 
        }
        .photo-item { 
          text-align: center; 
          border: 1px solid #eee;
          padding: 2px;
          border-radius: 4px;
        }
        .photo-item img { 
          max-width: 100%; 
          height: 140px; 
          object-fit: contain;
        }
        .photo-label { font-size: 8px; color: #555; margin-top: 2px; }
        
        .footer { 
          margin-top: 10px; 
          font-size: 7px; 
          color: #999; 
          text-align: center; 
          border-top: 1px solid #eee; 
          padding-top: 4px; 
        }
        .qr-display {
          position: absolute;
          top: 0;
          right: 0;
          width: 50px;
          height: 50px;
        }
        .status-badge {
          display: inline-block;
          padding: 1px 6px;
          border-radius: 10px;
          font-size: 8px;
          border: 1px solid #ccc;
        }
      </style>
    </head>
    <body>
      <div style="position: relative;">
        <h1>
          <span>📋 Asset Report</span>
          <span style="font-family: monospace; font-size: 14px; margin-right: 60px;">${String(asset.id)}</span>
        </h1>
        ${asset.qr_code_url ? `<img src="${asset.qr_code_url}" class="qr-display" alt="QR" />` : ''}
      </div>

      <div class="container">
        <!-- Primary Info -->
        <div class="card">
          <div class="section-title">📦 Primary Information 一次情報</div>
          <div class="grid-4">
            <div class="field">
              <div class="label">Asset Number 資産番号</div>
              <div class="value large">${String(asset.id)}</div>
            </div>
            <div class="field">
              <div class="label">Product Name 製品名</div>
              <div class="value large">${asset.name || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Management Location 管理場所</div>
              <div class="value">${asset.management_location || '-'}</div>
            </div>
            <div class="field">
              <div class="label">User ユーザー</div>
              <div class="value">${asset.user || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Building 建物</div>
              <div class="value">${asset.building || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Installation Location 設置場所</div>
              <div class="value">${asset.installation_location || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Detailed Location (Room) 詳細な場所（部屋）</div>
              <div class="value">${asset.room || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Floor 床</div>
              <div class="value">${asset.floor || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Install Status インストールステータス</div>
              <div class="value">${asset.status || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Inventory Status 在庫状況</div>
              <div class="value">
                <span class="status-badge" style="background: ${asset.inventory_status === 'completed' ? '#d1fae5' : '#fef3c7'}">
                  ${asset.inventory_status === 'completed' ? 'COMPLETED' : 'PENDING'}
                </span>
              </div>
            </div>
             <div class="field">
              <div class="label">QR Code Value QRコード値</div>
              <div class="value" style="font-family: monospace;">${asset.qr_code || '-'}</div>
            </div>
          </div>
        </div>

        <div class="row">
          <!-- Current Year Data -->
          <div class="col-half card">
            <div class="section-title">📅 Current Year Data 今年のデータ</div>
            <div class="grid-2">
              <div class="field">
                <div class="label">Building</div>
                <div class="value">${asset.building || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Install Location 設置場所</div>
                <div class="value">${asset.installation_location || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Detail Location 詳細な場所</div>
                <div class="value">${asset.room || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Install Status インストールステータス</div>
                <div class="value">${asset.status || '-'}</div>
              </div>
            </div>
            <div class="field" style="margin-top: 4px;">
              <div class="label">Comment コメント</div>
              <div class="value">${asset.notes || '-'}</div>
            </div>
            <div class="grid-2" style="margin-top: 2px;">
               <div class="field">
                <div class="label">Label Reissue レーベルの再発</div>
                <div class="value">${asset.label_reissue || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Reissue Reason 再発行理由</div>
                <div class="value">${asset.reissue_reason || '-'}</div>
              </div>
            </div>
          </div>

          <!-- Last Year Data -->
          <div class="col-half card">
            <div class="section-title">📆 Last Year Data 昨年のデータ</div>
            <div class="grid-2">
              <div class="field">
                <div class="label">Investigator 捜査官</div>
                <div class="value">${asset.last_year_investigator || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Building 建物</div>
                <div class="value">${asset.last_year_building || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Install Location 設置場所</div>
                <div class="value">${asset.last_year_installation_location || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Detail Location 詳細な場所</div>
                <div class="value">${asset.last_year_detailed_location || '-'}</div>
              </div>
              <div class="field">
                <div class="label">Install Status インストールステータス</div>
                <div class="value">${asset.last_year_installation_status || '-'}</div>
              </div>
            </div>
            <div class="field" style="margin-top: 4px;">
              <div class="label">Comment コメント</div>
              <div class="value">${asset.last_year_comment || '-'}</div>
            </div>
          </div>
        </div>

        <!-- Additional Info -->
        <div class="card">
          <div class="section-title">📝 Additional Info 追加情報</div>
          <div class="grid-4">
            <div class="field">
              <div class="label">Company Name 会社名</div>
              <div class="value">${asset.company_name || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Invoice Number 請求書番号</div>
              <div class="value">${asset.invoice_number || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Actual User 実際のユーザー</div>
              <div class="value">${asset.actual_user || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Parent ID 親ID</div>
              <div class="value">${asset.parent_asset_id || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Condition</div>
              <div class="value">${asset.condition || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Type タイプ</div>
              <div class="value">${asset.type || '-'}</div>
            </div>
            <div class="field">
              <div class="label">Last Updated 最終更新日</div>
              <div class="value">${asset.last_updated ? new Date(asset.last_updated).toLocaleDateString() : '-'}</div>
            </div>
            <div class="field">
              <div class="label">Inv. Completed</div>
              <div class="value">${asset.inventory_completed_at ? new Date(asset.inventory_completed_at).toLocaleDateString() : '-'}</div>
            </div>
          </div>
           ${asset.description ? `
          <div class="field" style="margin-top: 4px;">
            <div class="label">Description 説明</div>
            <div class="value">${asset.description}</div>
          </div>
          ` : ''}
        </div>

        ${photosHtml}
      </div>

      <div class="footer">
        Generated 生成された: ${new Date().toLocaleString('ja-JP')} | Asset ID アセットID: ${String(asset.id)}
      </div>
    </body>
    </html>
  `;
    const printWindow = window.open('', '', 'width=800,height=1000');
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
