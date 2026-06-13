// ============================================================================
// 1. データ初期化（外部 data.js の JSON文字列データをパース）＆ 120%相当の表示倍率調整
// ============================================================================
let cachedStudents = [];
let currentPage = 1;
// お気に入り（生徒名）を保持する配列
let favoriteStudents = [];

function initDatabase() {
    try {
        // ローカルストレージからお気に入りリストを復元
        const savedFavorites = localStorage.getItem('db_favorites');
        if (savedFavorites) {
            favoriteStudents = JSON.parse(savedFavorites);
        }

        if (typeof initialStudentsDataJSON !== 'undefined' && initialStudentsDataJSON.trim() !== '') {
            cachedStudents = JSON.parse(initialStudentsDataJSON);
            applyBrowserZoom120(); // 画面全体を強制的に1.2倍（120%）サイズにする処理
            buildDynamicDropdowns(cachedStudents);
            renderStudentsList(cachedStudents);
        } else {
            throw new Error("外部データ(data.js)のinitialStudentsDataJSONが見つからないか、空です。");
        }
    } catch (e) {
        document.getElementById('studentContainer').innerHTML = 
            '<div class="status-message" style="color:var(--ba-pink);">[ERROR] 生徒データファイル(data.js)の読み込みまたは解析に失敗しました。</div>';
        console.error(e);
    }
}

// ブラウザが100%の状態でも、120%で見ていた時と同じ大きさにするためのCSSインジェクション
function applyBrowserZoom120() {
    const style = document.createElement('style');
    style.textContent = `
        html, body {
            zoom: 1.2 !important; /* 全体要素を1.2倍に引き伸ばす */
            -moz-transform: scale(1.2); /* Firefox用の拡大対応 */
            -moz-transform-origin: top center;
        }
        body .wrapper .container, body .container {
            max-width: 1980px !important; /* maxsize 1650px の 120% である 1980px に対応 */
            width: 95% !important;
            margin: 0 auto !important;
        }
        
        /* ====================================================================
           カード内の左上お気に入りマーク（枠線なし・ピンのみ変化）
           ==================================================================== */
        .student-row {
            position: relative; /* 左上の絶対配置の基準にする */
        }
        .favorite-star-btn {
            position: absolute;
            top: 10px;
            left: 10px;
            font-size: 20px;
            cursor: pointer;
            line-height: 1;
            z-index: 5;
            user-select: none;
            background: none !important;      /* 背景を完全に無くす */
            border: none !important;          /* 四角い枠線を完全に無くす */
            padding: 0 !important;            /* 内側の余白を無くす */
            box-shadow: none !important;      /* 影を無くす */
            transition: transform 0.1s ease, filter 0.2s ease, opacity 0.2s ease;
        }
        .favorite-star-btn:hover {
            transform: scale(1.2); /* ホバー時に少し大きく */
        }
        
        /* ====================================================================
           フィルターエリアの「お気に入り」ボタン
           ==================================================================== */
        .btn-fav-filter {
            background: transparent !important; /* 背景を常に完全に透明にする */
            background-color: transparent !important; 
            border: none !important;           /* 四角い枠線を完全に削除 */
            box-shadow: none !important;       /* 影を非表示 */
            padding: 0 8px !important;         /* 左右の最低限の余白のみ */
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            transition: transform 0.1s ease, filter 0.2s ease, opacity 0.2s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            user-select: none;
            height: 38px;                     /* 他のドロップダウンボタンと高さを揃える */
        }
        .btn-fav-filter:hover {
            transform: scale(1.05);           /* マウスホバー時に少しだけふんわり大きく */
            opacity: 0.8 !important;
        }
        
        /* 【ピン留め共通】アクティブ（ON）の時は不透明度100%で光彩を付与 */
        .favorite-star-btn.is-fav, .btn-fav-filter.is-fav {
            opacity: 1 !important;
            filter: drop-shadow(0 0 4px rgba(255, 69, 0, 0.6)) !important; /* 赤〜オレンジ系の光彩 */
        }
        
        /* 【ピン留め共通】通常（OFF）の時は白黒グレー＆半透明にして目立たなくする */
        .favorite-star-btn.not-fav, .btn-fav-filter.not-fav {
            opacity: 0.3 !important; 
            filter: grayscale(100%) !important;
        }
        
        .btn-fav-filter.is-fav {
            font-weight: bold !important;
            color: var(--text-main, #333333) !important;
        }
        .btn-fav-filter.not-fav {
            color: var(--text-main, #333333) !important;
        }
    `;
    document.head.appendChild(style);
}

function resetPageAndTrigger() {
    currentPage = 1;
    filterStudentsTrigger();
}

// ============================================================================
// 2. ドロップダウンUI・表示制御
// ============================================================================
function toggleDropdown(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.classList.contains('open');
    document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    if (!isOpen) {
        el.classList.add('open');
    }
}

function parseTagsString(tagsStr) {
    if (!tagsStr || typeof tagsStr !== 'string') return [];
    return tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');
}

function updateDropdownText(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const btn = el.querySelector('.dropdown-button');
    if (!btn) return;

    const existingClearBtn = btn.querySelector('.dropdown-clear-btn');
    if (existingClearBtn) existingClearBtn.remove();

    const checkedVals = getCheckedValues(id);
    if (checkedVals.length === 0) {
        btn.textContent = "選択してください";
    } else if (checkedVals.length === 1) {
        btn.textContent = checkedVals[0];
    } else {
        btn.textContent = `${checkedVals[0]} +他${checkedVals.length - 1}件`;
    }

    if (checkedVals.length > 0) {
        const clearBtn = document.createElement('span');
        clearBtn.className = 'dropdown-clear-btn';
        clearBtn.innerHTML = '&times;';
        clearBtn.style.marginLeft = 'auto';
        clearBtn.style.padding = '0 4px';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.fontWeight = 'bold';
        clearBtn.style.fontSize = '14px';
        clearBtn.style.color = 'var(--ba-pink)';
        clearBtn.style.display = 'inline-block';
        
        clearBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
            updateDropdownText(id);
        });
        
        btn.style.display = 'flex';
        btn.style.justifyContent = 'space-between';
        btn.style.alignItems = 'center';
        btn.appendChild(clearBtn);
    }

    currentPage = 1;
    filterStudentsTrigger();
}

function getCheckedValues(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    const checkboxes = el.querySelectorAll('.dropdown-content input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================================================
// 3. 動的ドロップダウン生成
// ============================================================================
function buildDynamicDropdowns(students) {
    const costSet = new Set();
    const tagSet = new Set();

    students.forEach(s => {
        if (s.ex_cost !== undefined && s.ex_cost !== null && s.ex_cost !== "") {
            costSet.add(Number(s.ex_cost));
        }
        parseTagsString(s.ex_tags).forEach(t => tagSet.add(t));
        parseTagsString(s.ns_tags).forEach(t => tagSet.add(t));
        parseTagsString(s.ps_tags).forEach(t => tagSet.add(t));
        parseTagsString(s.ss_tags).forEach(t => tagSet.add(t));
    });

    const costContent = document.getElementById('dropExCostContent');
    if (costContent) {
        costContent.innerHTML = '';
        Array.from(costSet).sort((a, b) => a - b).forEach(c => {
            costContent.innerHTML += `
                <div class="dropdown-option">
                    <input type="checkbox" value="${c}" onchange="updateDropdownText('dropExCost')"> コスト ${c}
                </div>`;
        });
    }

    const tagContent = document.getElementById('dropTagsContent');
    if (tagContent) {
        tagContent.innerHTML = '';
        const isPlana = document.documentElement.getAttribute('data-theme') === 'plana';
        
        const searchWrapper = document.createElement('div');
        searchWrapper.style.position = 'sticky';
        searchWrapper.style.top = '0';
        searchWrapper.style.background = isPlana ? '#222232' : '#ffffff';
        searchWrapper.style.padding = '6px 8px';
        searchWrapper.style.borderBottom = isPlana ? '1px solid rgba(163, 161, 247, 0.25)' : '1px solid rgba(0, 178, 255, 0.2)';
        searchWrapper.style.zIndex = '10';
        
        const tagSearchInput = document.createElement('input');
        tagSearchInput.type = 'text';
        tagSearchInput.id = 'tagDropdownSearch';
        tagSearchInput.placeholder = 'タグを検索...';
        tagSearchInput.style.width = '100%';
        tagSearchInput.style.padding = '4px 8px';
        tagSearchInput.style.fontSize = '12px';
        tagSearchInput.style.border = isPlana ? '1px solid rgba(163, 161, 247, 0.4)' : '1px solid rgba(0, 178, 255, 0.4)';
        tagSearchInput.style.borderRadius = '4px';
        tagSearchInput.style.background = isPlana ? '#1e1e2a' : 'rgba(255, 255, 255, 0.9)';
        tagSearchInput.style.color = 'var(--text-main)';
        tagSearchInput.style.outline = 'none';
        tagSearchInput.style.boxSizing = 'border-box';
        
        tagSearchInput.addEventListener('click', (e) => e.stopPropagation());
        
        tagSearchInput.addEventListener('input', function(e) {
            const query = e.target.value.trim().toUpperCase();
            const options = tagContent.querySelectorAll('.dropdown-option');
            options.forEach(opt => {
                const text = opt.textContent || opt.innerText;
                if (text.toUpperCase().indexOf(query) > -1) {
                    opt.style.display = 'block';
                } else {
                    opt.style.display = 'none';
                }
            });
        });

        searchWrapper.appendChild(tagSearchInput);
        tagContent.appendChild(searchWrapper);

        Array.from(tagSet).sort().forEach(t => {
            if (!t) return;
            const optRow = document.createElement('div');
            optRow.className = 'dropdown-option';
            optRow.innerHTML = `<input type="checkbox" value="${t}" onchange="updateDropdownText('dropTags')"> ${t}`;
            tagContent.appendChild(optRow);
        });
    }
}

// ============================================================================
// 4. リストレンダリングコア ＆ ページ送り連動
// ============================================================================
function renderStudentsList(students) {
    const container = document.getElementById('studentContainer');
    const paginationWrap = document.getElementById('paginationContainer');
    if (!container) return;
    container.innerHTML = '';
    if (paginationWrap) paginationWrap.innerHTML = '';

    if (students.length === 0) {
        container.innerHTML = '<div class="status-message">該当する生徒データが見つかりません。</div>';
        return;
    }

    const limitSelect = document.getElementById("displayLimitSelect");
    const limitValue = limitSelect ? parseInt(limitSelect.value, 10) : -1;
    
    let displayStudents = students;

    if (limitValue > 0) {
        const totalPages = Math.ceil(students.length / limitValue);
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        const startIndex = (currentPage - 1) * limitValue;
        const endIndex = startIndex + limitValue;
        displayStudents = students.slice(startIndex, endIndex);

        setupPagination(students.length, limitValue, totalPages);
    }

    const searchInput = document.getElementById("liveSearch");
    const freeKeyword = searchInput ? searchInput.value.trim() : "";
    const selGear = getCheckedValues('dropGear');
    const selTags = getCheckedValues('dropTags');

    function escapeHtml(str) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function highlightText(text) {
        const escaped = escapeHtml(text);
        if (!escaped || !freeKeyword) return escaped || "-";
        try {
            const escapedKeyword = freeKeyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
            const regex = new RegExp(`(${escapedKeyword})`, "gi");
            return escaped.replace(regex, '<mark class="search-highlight">$1</mark>');
        } catch (e) {
            return escaped;
        }
    }

    function highlightNumbersInDesc(text) {
        if (!text) return "-";
        let html = highlightText(text);
        return html.replace(/(?<!<[^>]*|\#[^>]*|\bclass\s*=\s*['"]?[^'"]*)(\d+(?:\.\d+)?%?％?([秒回]|分間|秒間)?)/g, function(match) {
            if (match.startsWith('<') || match.endsWith('>')) return match;
            return `<span style="color: #00B2FF; font-weight: 700; font-family: 'Space Grotesk', sans-serif;">${match}</span>`;
        });
    }

    function highlightGear(text) {
        if (!text || text === "-") return "-";
        const escaped = escapeHtml(text);
        let matchFree = false;
        if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
            matchFree = true;
        }
        let matchDropdown = false;
        if (selGear.length > 0) {
            matchDropdown = selGear.some(g => escaped.toLowerCase().includes(g.toLowerCase()));
        }
        if (matchFree || matchDropdown) {
            return `<mark class="search-highlight">${escaped}</mark>`;
        }
        return escaped;
    }

    function highlightTag(text) {
        if (!text) return "";
        const escaped = escapeHtml(text);
        let matchFree = false;
        if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
            matchFree = true;
        }
        let matchDropdown = false;
        if (selTags.length > 0) {
            matchDropdown = selTags.some(tag => escaped.toLowerCase() === tag.toLowerCase());
        }
        if (matchFree || matchDropdown) {
            return `<mark class="search-highlight">${escaped}</mark>`;
        }
        return escaped;
    }

    function getAttrClass(attr) {
        if (!attr) return "";
        if (attr.includes("爆発") || attr.includes("軽装備")) return "attr-explosive";
        if (attr.includes("貫通") || attr.includes("重装甲")) return "attr-piercing";
        if (attr.includes("神秘") || attr.includes("特殊装甲")) return "attr-mystic";
        if (attr.includes("振動") || attr.includes("弾力装甲")) return "attr-sonic";
        if (attr.includes("分解") || attr.includes("複合装甲")) return 'attr-break';
        return "";
    }

    displayStudents.forEach(s => {
        const row = document.createElement('div');
        row.className = 'student-row';

        const atkClass = getAttrClass(s.attack);
        const defClass = getAttrClass(s.defense);

        const exTagsHTML = parseTagsString(s.ex_tags).map(t => `<span class="tag-pill type-ex-tag" onclick="clickFilterBind('dropTags', '${t.replace(/'/g, "\\'")}')">${highlightTag(t)}</span>`).join('');
        const nsTagsHTML = parseTagsString(s.ns_tags).map(t => `<span class="tag-pill type-ns-tag" onclick="clickFilterBind('dropTags', '${t.replace(/'/g, "\\'")}')">${highlightTag(t)}</span>`).join('');
        const psTagsHTML = parseTagsString(s.ps_tags).map(t => `<span class="tag-pill type-ps-tag" onclick="clickFilterBind('dropTags', '${t.replace(/'/g, "\\'")}')">${highlightTag(t)}</span>`).join('');
        const ssTagsHTML = parseTagsString(s.ss_tags).map(t => `<span class="tag-pill type-ss-tag" onclick="clickFilterBind('dropTags', '${t.replace(/'/g, "\\'")}')">${highlightTag(t)}</span>`).join('');

        const gear1Text = s.gear1 || "-";
        const gear2Text = s.gear2 || "-";
        const gear3Text = s.gear3 || "-";
        
        let nsAddHTML = "";
        if (s.ns_add && s.ns_add !== "-" && s.ns_add !== "" && (!Array.isArray(s.ns_add) || s.ns_add.length > 0)) {
            let nsAddText = Array.isArray(s.ns_add) ? s.ns_add.join(', ') : s.ns_add;
            let processedText = highlightText(nsAddText).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
            nsAddHTML = `<br><span style="color:#48BB78; font-size:11px; font-weight:700; display:block; line-height:1.4;">${processedText}</span>`;
        }

        let psUnique2HTML = "";
        if (s.ps_unique2 && s.ps_unique2 !== "-") {
            psUnique2HTML = `<br><span style="color:#48BB78; font-size:11px; font-weight:700;">[固有2] ${highlightNumbersInDesc(s.ps_unique2)}</span>`;
        }

        // 現在お気に入り登録されているか判定
        const isFav = favoriteStudents.includes(s.name);
        const pinClass = isFav ? 'is-fav' : 'not-fav';
        // 【修正】星マークからプッシュピン(📌)へアイコンを変更
        const pinIcon = '📌';

        row.innerHTML = `
            <div class="favorite-star-btn ${pinClass}" onclick="toggleFavoriteStudent(event, '${s.name.replace(/'/g, "\\'")}')">${pinIcon}</div>

            <div class="name-section">
                <div class="student-name" style="padding-left: 20px;">${highlightText(s.name)}</div>
                <div class="student-school">
                    <span class="clickable-filter-text" onclick="clickFilterBind('dropSchool', '${s.school}')">${highlightText(s.school)}</span> / 
                    <span class="clickable-filter-text" onclick="clickFilterBind('dropType', '${s.type}')">${highlightText(s.type)}</span>
                </div>
            </div>
            
            <div class="stats-section" style="display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-flow: row; gap: 6px 8px;">
                <div class="stat-badge">役割: <span class="clickable-val" onclick="clickFilterBind('dropRole', '${s.role}')">${highlightText(s.role)}</span></div>
                <div class="stat-badge">位置: <span class="clickable-val" onclick="clickFilterBind('dropPos', '${s.position}')">${highlightText(s.position)}</span></div>
                <div class="stat-badge">攻撃: <span class="type-badge-style ${atkClass}" onclick="clickFilterBind('dropAttack', '${s.attack}')">${highlightText(s.attack)}</span></div>
                <div class="stat-badge">防御: <span class="type-badge-style ${defClass}" onclick="clickFilterBind('dropDefense', '${s.defense}')">${highlightText(s.defense)}</span></div>
                <div class="stat-badge">武器/遮蔽: <span><span class="clickable-val" onclick="clickFilterBind('dropWeapon', '${s.weapon}')">${highlightText(s.weapon)}</span> / <span class="clickable-val" onclick="clickFilterBind('dropCover', '${s.cover}')">${highlightText(s.cover)}</span></span></div>
                <div class="stat-badge">適正(市/外/内): <span><span class="clickable-val" onclick="clickFilterBind('dropUrban', '${s.urban}')">${highlightText(s.urban)}</span>/<span class="clickable-val" onclick="clickFilterBind('dropOutdoor', '${s.outdoor}')">${highlightText(s.outdoor)}</span>/<span class="clickable-val" onclick="clickFilterBind('dropIndoor', '${s.indoor}')">${highlightText(s.indoor)}</span></span></div>
                <div class="stat-badge">装備1: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear1Text}')">${highlightGear(gear1Text)}</span></div>
                <div class="stat-badge">装備2: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear2Text}')">${highlightGear(gear2Text)}</span></div>
                <div class="stat-badge">装備3: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear3Text}')">${highlightGear(gear3Text)}</span></div>
                <div class="stat-badge">射程: <span>${highlightText(s.range)}</span></div>
            </div>

            <div class="skills-section">
                <div class="skill-block">
                    <div class="skill-header">
                        <span class="skill-type type-ex">EX SKILL</span>
                        <span class="skill-cost" onclick="clickFilterBind('dropExCost', '${s.ex_cost}')">COST ${highlightText(s.ex_cost)}</span>
                    </div>
                    <div class="skill-title">${highlightText(s.ex_name)}</div>
                    <div class="skill-desc">${highlightNumbersInDesc(s.ex_desc)}</div>
                    <div class="skill-tags">${exTagsHTML}</div>
                </div>
                <div class="skill-block">
                    <div class="skill-header"><span class="skill-type type-ns">NORMAL SKILL</span></div>
                    <div class="skill-title">${highlightText(s.ns_name)}</div>
                    <div class="skill-desc">
                        ${highlightNumbersInDesc(s.ns_desc)}
                        ${nsAddHTML}
                    </div>
                    <div class="skill-tags">${nsTagsHTML}</div>
                </div>
                <div class="skill-block">
                    <div class="skill-header"><span class="skill-type type-ps">PASSIVE SKILL</span></div>
                    <div class="skill-title">${highlightText(s.ps_name)}</div>
                    <div class="skill-desc">${highlightNumbersInDesc(s.ps_desc)}${psUnique2HTML}</div>
                    <div class="skill-tags">${psTagsHTML}</div>
                </div>
                <div class="skill-block">
                    <div class="skill-header"><span class="skill-type type-ss">SUB SKILL</span></div>
                    <div class="skill-title">${highlightText(s.ss_name)}</div>
                    <div class="skill-desc">${highlightNumbersInDesc(s.ss_desc)}</div>
                    <div class="skill-tags">${ssTagsHTML}</div>
                </div>
            </div>
            <div class="items-section" style="font-size: 6px; line-height: 0.9;">
                <div class="item-row" style="margin-bottom: 3px;"><span class="item-label">愛用品</span><span class="item-value" style="font-size: 9px;">${highlightText(s.item_name || "なし")}</span></div>
                <div class="item-row" style="margin-bottom: 3px;"><span class="item-label">上昇ステータス</span><span class="item-value" style="font-size: 9px;">${highlightText(s.gearStats || "なし")}</span></div>
                <div class="item-row" style="margin-bottom: 3px;"><span class="item-label">強化効果</span><span class="item-value" style="font-size: 9px;">${highlightText(s.gearEnhancement || "なし")}</span></div>
                <div class="item-row" style="margin-bottom: 3px;"><span class="item-label">贈り物</span><span class="item-value" style="font-size: 9px;">${highlightText(s.gift_name || "なし")}</span></div>
                <div class="item-row" style="margin-bottom: 0;"><span class="item-label">オーパーツ</span><span class="item-value" style="font-size: 9px;">${highlightText(s.artifacts || "なし")}</span></div>
            </div>
        `;
        container.appendChild(row);
    });
}

function setupPagination(totalItems, itemsPerPage, totalPages) {
    const wrap = document.getElementById('paginationContainer');
    if (!wrap) return;

    const nav = document.createElement('div');
    nav.className = 'pagination-container';

    const firstBtn = document.createElement('button');
    firstBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    firstBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i>';
    if (currentPage !== 1) {
        firstBtn.onclick = () => { currentPage = 1; filterStudentsTrigger(); };
    }
    nav.appendChild(firstBtn);

    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
    if (currentPage !== 1) {
        prevBtn.onclick = () => { currentPage--; filterStudentsTrigger(); };
    }
    nav.appendChild(prevBtn);

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            if (i !== currentPage) {
                currentPage = i;
                filterStudentsTrigger();
            }
        };
        nav.appendChild(pageBtn);
    }

    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
    if (currentPage !== totalPages) {
        nextBtn.onclick = () => { currentPage++; filterStudentsTrigger(); };
    }
    nav.appendChild(nextBtn);

    const lastBtn = document.createElement('button');
    lastBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    lastBtn.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
    if (currentPage !== totalPages) {
        lastBtn.onclick = () => { currentPage = totalPages; filterStudentsTrigger(); };
    }
    nav.appendChild(lastBtn);

    const info = document.createElement('span');
    info.className = 'pagination-info';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    info.textContent = `${currentPage} / ${totalPages} PAGES (${startItem}-${endItem} / TOTAL ${totalItems})`;
    nav.appendChild(info);

    wrap.appendChild(nav);
}

// ============================================================================
// 5. 検索・マルチフィルタリング判定ロジック
// ============================================================================
function filterStudentsTrigger() {
    const searchInput = document.getElementById("liveSearch");
    const freeText = searchInput ? searchInput.value.trim().toUpperCase() : "";

    // お気に入りボタンの状態を判定
    const favBtn = document.getElementById('favFilterBtn');
    const isFavOnly = favBtn ? favBtn.classList.contains('is-fav') : false;

    const selSchool = getCheckedValues('dropSchool');
    const selType = getCheckedValues('dropType');
    const selWeapon = getCheckedValues('dropWeapon');
    const selCover = getCheckedValues('dropCover');
    const selRole = getCheckedValues('dropRole');
    const selPos = getCheckedValues('dropPos');
    const selAttack = getCheckedValues('dropAttack');
    const selDefense = getCheckedValues('dropDefense');
    const selExCost = getCheckedValues('dropExCost');
    const selUrban = getCheckedValues('dropUrban');
    const selOutdoor = getCheckedValues('dropOutdoor');
    const selIndoor = getCheckedValues('dropIndoor');
    const selGear = getCheckedValues('dropGear');
    const selTags = getCheckedValues('dropTags');

    const filtered = cachedStudents.filter(s => {
        // お気に入りフィルターの判定
        if (isFavOnly && !favoriteStudents.includes(s.name)) {
            return false;
        }

        let matchFreeText = true;
        if (freeText) {
            const pool = [
                s.name, s.school, s.type, s.weapon, s.cover, s.role, s.position, s.attack, s.defense,
                s.ex_name, s.ex_desc, s.ns_name, s.ns_desc, s.ps_name, s.ps_desc, s.ss_name, s.ss_desc,
                s.urban, s.outdoor, s.indoor, s.gear1, s.gear2, s.gear3, s.item_name, s.gift_name,
                s.ex_tags, s.ns_tags, s.ps_tags, s.ss_tags, s.gearStats, s.gearEnhancement, s.artifacts
            ].join('||').toUpperCase();
            matchFreeText = pool.indexOf(freeText) > -1;
        }

        let matchSchool = selSchool.length === 0 || selSchool.map(v=>v.toUpperCase()).includes((s.school||"").toUpperCase());
        let matchType = selType.length === 0 || selType.map(v=>v.toUpperCase()).includes((s.type||"").toUpperCase());
        let matchWeapon = selWeapon.length === 0 || selWeapon.map(v=>v.toUpperCase()).includes((s.weapon||"").toUpperCase());
        let matchCover = selCover.length === 0 || selCover.map(v=>v.toUpperCase()).includes((s.cover||"").toUpperCase());
        let matchRole = selRole.length === 0 || selRole.map(v=>v.toUpperCase()).includes((s.role||"").toUpperCase());
        let matchPos = selPos.length === 0 || selPos.map(v=>v.toUpperCase()).includes((s.position||"").toUpperCase());
        let matchAttack = selAttack.length === 0 || selAttack.map(v=>v.toUpperCase()).includes((s.attack||"").toUpperCase());
        let matchDefense = selDefense.length === 0 || selDefense.map(v=>v.toUpperCase()).includes((s.defense||"").toUpperCase());
        let matchExCost = selExCost.length === 0 || selExCost.map(String).includes(String(s.ex_cost));
        let matchUrban = selUrban.length === 0 || selUrban.map(v=>v.toUpperCase()).includes((s.urban||"").toUpperCase());
        let matchOutdoor = selOutdoor.length === 0 || selOutdoor.map(v=>v.toUpperCase()).includes((s.outdoor||"").toUpperCase());
        let matchIndoor = selIndoor.length === 0 || selIndoor.map(v=>v.toUpperCase()).includes((s.indoor||"").toUpperCase());

        let matchGear = true;
        if (selGear.length > 0) {
            const g1 = (s.gear1 || "").toUpperCase();
            const g2 = (s.gear2 || "").toUpperCase();
            const g3 = (s.gear3 || "").toUpperCase();
            matchGear = selGear.some(g => g1.includes(g.toUpperCase()) || g2.includes(g.toUpperCase()) || g3.includes(g.toUpperCase()));
        }

        let matchTags = true;
        if (selTags.length > 0) {
            const allTags = [
                ...parseTagsString(s.ex_tags), ...parseTagsString(s.ns_tags),
                ...parseTagsString(s.ps_tags), ...parseTagsString(s.ss_tags)
            ].map(t => t.toUpperCase());
            matchTags = selTags.some(tag => allTags.includes(tag.toUpperCase()));
        }

        return matchFreeText && matchSchool && matchType && matchWeapon && matchCover && matchRole && matchPos && 
               matchAttack && matchDefense && matchExCost && matchUrban && matchOutdoor && matchIndoor &&
               matchGear && matchTags;
    });

    renderStudentsList(filtered);
}

function clickFilterBind(dropdownId, value) {
    const el = document.getElementById(dropdownId);
    if (!el) return;

    let targetCheckbox = null;
    el.querySelectorAll('.dropdown-content input[type="checkbox"]').forEach(cb => {
        if (cb.value.toUpperCase() === value.toUpperCase()) {
            targetCheckbox = cb;
        } else {
            cb.checked = false; 
        }
    });

    if (targetCheckbox) {
        targetCheckbox.checked = !targetCheckbox.checked;
    }
    
    updateDropdownText(dropdownId);
}

function clearAllFilters() {
    const searchInput = document.getElementById('liveSearch');
    if (searchInput) searchInput.value = '';

    const tagSearchInput = document.getElementById('tagDropdownSearch');
    if (tagSearchInput) tagSearchInput.value = '';

    // 【修正】HTML側で最初に selected が指定されている option の値を自動取得して戻す
    const limitSelect = document.getElementById('displayLimitSelect');
    if (limitSelect) {
        const defaultOption = limitSelect.querySelector('option[selected]');
        const defaultValue = defaultOption ? defaultOption.value : limitSelect.options[0].value;
        limitSelect.value = defaultValue; 
        localStorage.setItem('db_display_limit', defaultValue); // ローカルストレージ初期値同期
    }

    // 【修正】お気に入りフィルターの解除（📌表記に合わせる）
    const favBtn = document.getElementById('favFilterBtn');
    if (favBtn) {
        favBtn.classList.remove('is-fav');
        favBtn.classList.add('not-fav');
        favBtn.innerHTML = '📌 ';
    }

    currentPage = 1;

    document.querySelectorAll('.custom-dropdown').forEach(el => {
        el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        el.querySelectorAll('.dropdown-option').forEach(opt => opt.style.display = 'block');
        const btn = el.querySelector('.dropdown-button');
        if (btn) {
            const existingClearBtn = btn.querySelector('.dropdown-clear-btn');
            if (existingClearBtn) existingClearBtn.remove();
            btn.textContent = "選択してください";
            btn.style.display = '';
            btn.style.justifyContent = '';
            btn.style.alignItems = '';
        }
    });

    filterStudentsTrigger();
}

document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-dropdown')) {
        document.querySelectorAll('.custom-dropdown').forEach(d => d.classList.remove('open'));
    }
});

// ============================================================================
// 6. データベース起動
// ============================================================================
window.addEventListener('DOMContentLoaded', initDatabase);

// ============================================================================
// 7. アロナ / プラナ モード切り替え制御 ＆ ローカルストレージ保存
// ============================================================================
function toggleThemeMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const toggleBtn = document.getElementById('modeToggleBtn');
    
    if (currentTheme === 'plana') {
        document.documentElement.removeAttribute('data-theme');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> SYSTEM: ARONA MODE';
        localStorage.setItem('db_theme', 'arona');
    } else {
        document.documentElement.setAttribute('data-theme', 'plana');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> SYSTEM: PLANA MODE';
        localStorage.setItem('db_theme', 'plana');
    }
}

function toggleFilterGrid() {
    const grid = document.getElementById('filterGrid');
    if (!grid) return;

    if (grid.style.display === 'none' || grid.style.display === '') {
        grid.style.display = 'grid';
        localStorage.setItem('db_filter_grid', 'open');
    } else {
        grid.style.display = 'none';
        localStorage.setItem('db_filter_grid', 'close');
    }
}

// 【修正】お気に入りフィルターボタンをクリックした時の処理（📌仕様）
function toggleFavFilter() {
    const favBtn = document.getElementById('favFilterBtn');
    if (!favBtn) return;
    
    if (favBtn.classList.contains('is-fav')) {
        // 【OFF（通常状態）にする処理】
        favBtn.classList.remove('is-fav');
        favBtn.classList.add('not-fav');
        favBtn.innerHTML = '📌 ';
    } else {
        // 【ON（アクティブ状態）にする処理】
        favBtn.classList.remove('not-fav');
        favBtn.classList.add('is-fav');
        favBtn.innerHTML = '📌 ';
    }
    
    currentPage = 1;
    filterStudentsTrigger();
}

// カードの左上のピンマークをクリックした時の処理
function toggleFavoriteStudent(event, studentName) {
    event.stopPropagation(); // 他のクリックイベントへの伝播を防ぐ

    const idx = favoriteStudents.indexOf(studentName);
    if (idx > -1) {
        favoriteStudents.splice(idx, 1); // 登録解除
    } else {
        favoriteStudents.push(studentName); // 登録
    }

    // ローカルストレージに状態を即時保存
    localStorage.setItem('db_favorites', JSON.stringify(favoriteStudents));

    // お気に入りフィルタリングが有効、かつ解除した場合はカードが消える可能性があるため再描画
    const favBtn = document.getElementById('favFilterBtn');
    const isFavOnly = favBtn ? favBtn.classList.contains('is-fav') : false;
    if (isFavOnly) {
        filterStudentsTrigger();
    } else {
        // 通常時は全リストを再描画してピンマークの表示状態を反転させる
        renderStudentsList(cachedStudents);
    }
}

function toggleSect(buttonElement, className) {
    const container = document.getElementById('studentContainer');
    if (!container) return;

    const isHidden = container.classList.toggle(className);

    if (isHidden) {
        buttonElement.classList.remove('active');
        localStorage.setItem(`db_sect_${className}`, 'hidden');
    } else {
        buttonElement.classList.add('active');
        localStorage.setItem(`db_sect_${className}`, 'visible');
    }
}

function resetPageAndTriggerWithStorage() {
    const selectEl = document.getElementById('displayLimitSelect');
    if (selectEl) {
        localStorage.setItem('db_display_limit', selectEl.value);
    }
    if (typeof resetPageAndTrigger === 'function') {
        resetPageAndTrigger();
    }
}

function restoreAllStates() {
    const savedTheme = localStorage.getItem('db_theme');
    const toggleBtn = document.getElementById('modeToggleBtn');
    
    if (savedTheme === 'plana') {
        document.documentElement.setAttribute('data-theme', 'plana');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> SYSTEM: PLANA MODE';
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (toggleBtn) toggleBtn.innerHTML = '<i class="fa-solid fa-circle-half-stroke"></i> SYSTEM: ARONA MODE';
    }

    const savedLimit = localStorage.getItem('db_display_limit');
    const selectEl = document.getElementById('displayLimitSelect');
    if (selectEl && savedLimit) {
        selectEl.value = savedLimit;
    }

    setTimeout(() => {
        if (typeof resetPageAndTrigger === 'function') resetPageAndTrigger();
    }, 100);

    const savedGrid = localStorage.getItem('db_filter_grid');
    const grid = document.getElementById('filterGrid');
    if (grid && savedGrid === 'open') {
        grid.style.display = 'none';
        toggleFilterGrid();
    }

    const container = document.getElementById('studentContainer');
    if (container) {
        const classNames = ['hide-ex', 'hide-ns', 'hide-ps', 'hide-ss', 'hide-gear'];
        const buttons = document.querySelectorAll('.btn-toggle-sect');
        
        classNames.forEach(className => {
            const savedSect = localStorage.getItem(`db_sect_${className}`);
            const targetBtn = Array.from(buttons).find(btn => btn.getAttribute('onclick').includes(className));
            
            if (savedSect === 'hidden') {
                container.classList.add(className);
                if (targetBtn) targetBtn.classList.remove('active');
            } else {
                container.classList.remove(className);
                if (targetBtn) targetBtn.classList.add('active');
            }
        });
    }

    // 起動時にお気に入りフィルターボタンにデフォルトクラス(not-fav)を付与
    const favBtn = document.getElementById('favFilterBtn');
    if (favBtn && !favBtn.classList.contains('is-fav')) {
        favBtn.classList.add('not-fav');
    }
}

// ============================================================================
// フリーワード（liveSearch）専用クリアボタン制御
// ============================================================================
function toggleLiveSearchClearBtn() {
    const input = document.getElementById('liveSearch');
    const clearBtn = document.getElementById('liveSearchClearBtn');
    if (!input || !clearBtn) return;

    if (input.value.length > 0) {
        clearBtn.style.display = 'inline-block';
    } else {
        clearBtn.style.display = 'none';
    }
    
    currentPage = 1;
    filterStudentsTrigger();
}

function clearLiveSearchInput() {
    const input = document.getElementById('liveSearch');
    const clearBtn = document.getElementById('liveSearchClearBtn');
    if (!input || !clearBtn) return;

    input.value = '';
    clearBtn.style.display = 'none';
    
    currentPage = 1;
    filterStudentsTrigger();
}

document.addEventListener('DOMContentLoaded', restoreAllStates);