// ============================================================================
// 1. データ初期化（外部 data.js の JSON文字列データをパース）＆ 120%相当の表示倍率調整
// ============================================================================
let cachedStudents = [];
let currentPage = 1;
// お気に入り（生徒名）を保持する配列
let favoriteStudents = [];

// ============================================================================
// 1. データ初期化 ＆ 検索エリア完全固定 ＆ 両モード背景色同期・透過防止（確定版）
// ============================================================================
function initDatabase() {
    try {
        // ローカルストレージからお気に入りリストを復元
        const savedFavorites = localStorage.getItem('db_favorites');
        if (savedFavorites) {
            favoriteStudents = JSON.parse(savedFavorites);
        }

        if (typeof initialStudentsDataJSON !== 'undefined' && initialStudentsDataJSON.trim() !== '') {
            cachedStudents = JSON.parse(initialStudentsDataJSON);
            applyBrowserZoom120(); // 画面全体を強制的に1.2倍サイズにする処理
            buildDynamicDropdowns(cachedStudents);
            renderStudentsList(cachedStudents);

// 🌟【新設・アイコン付き】タイトルと同じ高さの右端にヘルプボタンを追加する処理
            const titleSection = document.querySelector('.title-section') || document.querySelector('header');
            if (titleSection) {
                // タイトルセクションのフレックス配置を最適化
                titleSection.style.display = 'flex';
                titleSection.style.justifyContent = 'space-between';
                titleSection.style.alignItems = 'center';
                titleSection.style.position = 'relative';

                // 重複防止チェック
                if (!document.getElementById('headerHelpBtn')) {
                    const helpBtn = document.createElement('button');
                    helpBtn.id = 'headerHelpBtn';
                    
                    // Font Awesome の fa-circle-question クラスを流し込み
                    helpBtn.innerHTML = '<i class="fa-regular fa-circle-question" style="margin-right: 6px; font-size: 14px;"></i>ヘルプ';
                    
                    // デザイン崩れを防ぐためのスタイリング
                    helpBtn.style.display = 'inline-flex';
                    helpBtn.style.alignItems = 'center';
                    helpBtn.style.padding = '6px 14px';
                    helpBtn.style.fontSize = '13px';
                    helpBtn.style.fontWeight = 'bold';
                    helpBtn.style.cursor = 'pointer';
                    helpBtn.style.border = '1px solid var(--ba-blue, #00B2FF)';
                    helpBtn.style.borderRadius = '4px';
                    
                    // 🌟【通常時の配色変更】透明ではなく、テーマカラーを15%の濃さでうっすら敷きます
                    helpBtn.style.background = 'rgba(0, 178, 255, 0.15)'; 
                    helpBtn.style.color = 'var(--ba-blue, #00B2FF)';
                    helpBtn.style.transition = 'all 0.2s ease';
                    helpBtn.style.marginLeft = 'auto'; // 確実に右端へ寄せる

                    // 🌟ホバー時の視覚エフェクト（100%の濃さになり、文字が白に反転します）
                    helpBtn.onmouseover = () => {
                        helpBtn.style.background = 'var(--ba-blue, #00B2FF)';
                        helpBtn.style.color = '#ffffff';
                    };
                    // 🌟マウスが離れたら、再び15%の少し濃いめの薄さに戻します
                    helpBtn.onmouseout = () => {
                        helpBtn.style.background = 'rgba(0, 178, 255, 0.15)';
                        helpBtn.style.color = 'var(--ba-blue, #00B2FF)';
                    };

                    // クリック時に別タブで manual.html を開く
                    helpBtn.onclick = () => {
                        window.open('manual.html', '_blank');
                    };

                    titleSection.appendChild(helpBtn);
                }
            }

            // 🌟【確定版】右端見切れ対策 ＆ 上部2段固定用の基本CSS
            const style = document.createElement('style');
            style.textContent = `
                header, .title-section, .mode-toggle-area {
                    position: static !important;
                }
                .control-panel {
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 9999 !important;
                    opacity: 1 !important;
                    backdrop-filter: none !important; /* 🌟 既存の半透明ぼかし処理を強制解除 */
                    padding-top: 10px !important;
                    padding-bottom: 5px !important;
                    padding-right: 25px !important; 
                    box-sizing: border-box !important;
                }
                #filterGrid, .filter-grid {
                    position: sticky !important;
                    top: 55px !important; 
                    z-index: 9998 !important;
                    opacity: 1 !important;
                    backdrop-filter: none !important; /* 🌟 既存の半透明ぼかし処理を強制解除 */
                    box-shadow: 0 6px 15px rgba(0, 0, 0, 0.15) !important;
                    padding-bottom: 12px !important;
                    margin-bottom: 15px !important;
                    padding-right: 25px !important;
                    box-sizing: border-box !important;
                }
                .custom-dropdown, .skill-tag-dropdown, .dropdown-content, .skill-tag-content {
                    z-index: 10000 !important;
                }
                #studentContainer {
                    position: relative !important;
                    z-index: 1 !important;
                }
            `;
            document.head.appendChild(style);

            // 🌟【最重要】現在のモード（通常/プラナ）の生徒一覧の背景色を完全に吸い出すタイマー処理
            // モード切り替えボタンを押した際にも連動するよう、短い周期で背景色を監視・同期します
            setInterval(() => {
                const controlPanel = document.querySelector('.control-panel');
                const filterGrid = document.getElementById('filterGrid') || document.querySelector('.filter-grid');
                
                // 生徒一覧（#studentContainer）または全体の背景色を取得する対象候補
                const bgTarget = document.getElementById('studentContainer') || document.body;
                
                if (bgTarget && controlPanel && filterGrid) {
                    // 現在ブラウザが画面に描画している「実際の背景色」を計算して取得
                    let currentBgColor = window.getComputedStyle(bgTarget).backgroundColor;
                    
                    // 万が一、背景色が完全に透明（transparentやrgba(0,0,0,0)）だった場合のセーフティ
                    if (currentBgColor === 'transparent' || currentBgColor.replace(/\s/g, '') === 'rgba(0,0,0,0)') {
                        currentBgColor = window.getComputedStyle(document.body).backgroundColor;
                    }
                    
                    // 🌟 透過の原因となる「rgbaのアルファ値」を「1（不透明）」に強制書き換えする、またはそのまま適用
                    if (currentBgColor.includes('rgba')) {
                        currentBgColor = currentBgColor.replace(/[\d\.]+\)$/, '1)');
                    }

                    // 1段目と2段目の固定エリアに、生徒一覧と100%同じ不透明な背景色をリアルタイム上書き
                    controlPanel.style.setProperty('background-color', currentBgColor, 'important');
                    filterGrid.style.setProperty('background-color', currentBgColor, 'important');
                }
            }, 100); // 0.1秒ごとに背景色をチェックして完全に同期

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
            -moz-transform-origin: top center;
        }
        body .wrapper .container, body .container {
            max-width: 1980px !important; /* maxsize 1650px の 120% である 1980px に対応 */
            width: 95% !important;
            margin: 0 auto !important;
        }
        
        // ドロップダウンボタンに後から height='38px' を強制注入していた以下の記述を変更：
    document.querySelectorAll('.dropdown-button').forEach(btn => {
        // height や lineHeight の固定割り当てを完全に撤廃し、CSS側の可変設計を邪魔させないようにします
        btn.style.minHeight = '38px';
    });
    
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
        
        /* キャラ名エリアのCV用微調整 */
        .student-cv {
            font-size: 11px;
            color: var(--text-sub);
            margin-top: 2px;
            font-weight: 500;
        }

        /* ====================================================================
           非表示連動時のグリッド・均等比率幅調整の決定版CSS
           ==================================================================== */
        /* カード全体のグリッド設計を2カラムから1カラム（柔軟な結合型）へ変更し、CSS側の干渉を無効化 */
        .student-row {
            display: grid !important;
            grid-template-columns: 180px 300px 1fr !important; /* 基本構成を絶対維持 */
        }

        /* スキルエリア（愛用品ブロックも内包）の基本配置 */
        .skills-section {
            grid-column: 3 / 4 !important;
            width: 100% !important;
            display: flex !important;
            flex-direction: row !important;
            gap: 12px !important;
        }

        /* 🌟通常時：すべてのスキルブロック（愛用品含む）を5等分で均等に並べる */
        .skills-section .skill-block {
            display: flex !important;
            flex-direction: column !important;
            flex: 1 1 0% !important;
            min-width: 0 !important;
            margin: 0 !important;
            height: auto !important;
        }

        /* 🌟ボタンで非表示（hide-gear）が指定されたとき：愛用品ブロックのみを完全に消し、残りのスキル4つで4等分にする */
        #studentContainer.hide-gear .custom-gear-block {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function resetPageAndTrigger() {
    currentPage = 1;
    filterStudentsTrigger();
}

function toggleDropdown(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    // 🌟 1. まずクリックされたドロップダウンの開閉状態を切り替える
    dropdown.classList.toggle('active');

    // スキルタグドロップダウン（dropTags）の場合は、開いた瞬間に中身を再生成させない！
    // 既存のコードが innerHTML を書き換えてしまうのを完全にブロックします。
    if (id === 'dropTags') {
        // コンテンツ要素を表示状態にするだけの処理にとどめる
        const content = dropdown.querySelector('.skill-tag-content') || dropdown.querySelector('.dropdown-content');
        if (content) {
            // 他のドロップダウンが関与して消されないよう表示スタイルを保証
            if (dropdown.classList.contains('active')) {
                content.style.display = 'flex';
            } else {
                content.style.display = 'none';
            }
        }
    }

    // 🌟 2. 他のドロップダウンが開いていたら閉じる（既存の親切設計を維持）
    const allDropdowns = document.querySelectorAll('.custom-dropdown, .skill-tag-dropdown');
    allDropdowns.forEach(dd => {
        if (dd.id !== id) {
            dd.classList.remove('active');
            const c = dd.querySelector('.dropdown-content') || dd.querySelector('.skill-tag-content');
            if (c) c.style.display = 'none';
        }
    });
}

function parseTagsString(tagsStr) {
    if (!tagsStr || typeof tagsStr !== 'string') return [];
    return tagsStr.split(',').map(t => t.trim()).filter(t => t !== '');
}

function updateDropdownText(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const button = dropdown.querySelector('.dropdown-button');
    if (!button) return;

    const selectedValues = badgeSelectedFilters[dropdownId] || [];

    if (selectedValues.length === 0) {
        button.textContent = (dropdownId === 'dropExTags' || dropdownId === 'dropTags') ? '選択してください' : '選択してください';
        button.classList.remove('has-values');
    } else {
        let label = '選択中';
        if (dropdownId === 'dropSchool') label = '学校';
        else if (dropdownId === 'dropWeapon') label = '武器';
        else if (dropdownId === 'dropAttack') label = '攻撃';
        else if (dropdownId === 'dropDefense') label = '防御';
        else if (dropdownId === 'dropPosition') label = '配置';
        else if (dropdownId === 'dropRole') label = '役割';
        else if (dropdownId === 'dropSquadType') label = '戦区';
        else if (dropdownId === 'dropGear') label = '装備';
        else if (dropdownId === 'dropTags') label = 'スキルタグ';
        else if (dropdownId === 'dropHasGear') label = '愛用品有無';

        button.textContent = `${label} (${selectedValues.length})`;
        button.classList.add('has-values');
    }
}

function getCheckedValues(id) {
    const el = document.getElementById(id);
    if (!el) return [];
    
    // 🌟 画面上のバッジの残骸やHTMLの隙間の文字に惑わされないよう、
    // 現在ドロップダウン内で青く光っている（.selected がついている）div要素のみから値を抽出します。
    // これにより、クリアボタンを押してselectedが外れた瞬間に一発で「選択してください」に戻ります。
    const selectedOptions = el.querySelectorAll('.dropdown-content .dropdown-option.selected, .skill-tag-content .dropdown-option.selected');
    if (selectedOptions.length > 0) {
        return Array.from(selectedOptions).map(opt => {
            return opt.getAttribute('data-value') || opt.textContent.trim();
        });
    }
    
    // チェックボックス形式が残っていた場合のための互換性維持
    const checkboxes = el.querySelectorAll('.dropdown-content input[type="checkbox"]:checked, .skill-tag-content input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value);
}

// ============================================================================
// 【修正】ドロップダウン動的構築（遮蔽のリスト表示を統一）
// ============================================================================
function buildDynamicDropdowns(students) {
    let mBunrui = [];
    let mTag = [];
    try {
        if (typeof skittagbunruiJSON !== 'undefined') {
            mBunrui = (typeof skittagbunruiJSON === 'string') ? JSON.parse(skittagbunruiJSON) : skittagbunruiJSON;
        }
        if (typeof skittagJSON !== 'undefined') {
            mTag = (typeof skittagJSON === 'string') ? JSON.parse(skittagJSON) : skittagJSON;
        }
    } catch (e) {
        console.error("【エラー】追加されたJSONデータの取得に失敗しました:", e);
    }

    const collectedTags = new Set();
    students.forEach(s => {
        ['ex_tags', 'ns_tags', 'ps_tags', 'ss_tags'].forEach(field => {
            if (s[field]) {
                parseTagsString(s[field]).forEach(t => {
                    if (t && t.trim() !== "") collectedTags.add(t.trim());
                });
            }
        });
    });
    
    // 🌟 システムの初期化導線を維持するため、'dropTags' をここに保持
    const dropdownIds = [
        'dropSchool', 'dropType', 'dropWeapon', 'dropCover',
        'dropRole', 'dropPos', 'dropAttack', 'dropDefense',
        'dropExCost',
        'dropGear', 'dropTags'
    ];

    const getContentElement = (dd) => {
        if (!dd) return null;
        return dd.querySelector('.dropdown-content') || dd.querySelector('.skill-tag-content');
    };

    dropdownIds.forEach(id => {
        const dd = document.getElementById(id);
        if (!dd) return;
        const content = getContentElement(dd);
        if (content) content.innerHTML = '';
    });

    // CVと射程の動的データ収集用のSetを定義
    let cvs = new Set();
    let ranges = new Set();

    // 通常項目の収集
    const schools = new Set();
    const types = new Set();
    const weapons = new Set();
    const covers = new Set();
    const roles = new Set();
    const poss = new Set();
    const attacks = new Set();
    const defenses = new Set();
    const costs = new Set();
    const gears = new Set();
    
    // ここに書いていないものがあった場合は後ろに追加される
    schools.add("アビドス");
    schools.add("トリニティ");
    schools.add("ゲヘナ");
    schools.add("ミレニアム");
    schools.add("百鬼夜行");
    schools.add("レッドウィンター");
    schools.add("山海経");
    schools.add("ヴァルキューレ");
    schools.add("SRT");
    schools.add("アリウス");
    schools.add("ハイランダー");
    schools.add("ワイルドハント");
    
    types.add("STRIKER");
    types.add("SPECIAL");
    
    weapons.add("SG");
    weapons.add("SMG");
    weapons.add("AR");
    weapons.add("GL");
    weapons.add("HG");
    weapons.add("RL");
    weapons.add("SR");
    weapons.add("RG");
    weapons.add("MG");
    weapons.add("MT");
    weapons.add("FT");
    
    covers.add("○");
    covers.add("×");
    
    roles.add("タンク");
    roles.add("アタッカー");
    roles.add("ヒーラー");
    roles.add("サポーター");
    roles.add("T.S");
    
    poss.add("FRONT");
    poss.add("MIDDLE");
    poss.add("BACK");
    
    attacks.add("爆発");
    attacks.add("貫通");
    attacks.add("神秘");
    attacks.add("振動");
    attacks.add("分解");
    
    defenses.add("軽装備");
    defenses.add("重装甲");
    defenses.add("特殊装甲");
    defenses.add("弾力装甲");
    defenses.add("複合装甲");
    
    gears.add("ネックレス");
    gears.add("腕時計");
    gears.add("お守り");
    gears.add("ヘアピン");
    gears.add("バッジ");
    gears.add("バッグ");
    gears.add("シューズ");
    gears.add("グローブ");
    gears.add("帽子");

    students.forEach(s => {
        if (s.school) schools.add(s.school);
        if (s.type) types.add(s.type);
        if (s.cv && s.cv !== "-") cvs.add(s.cv.trim());
        if (s.weapon) weapons.add(s.weapon);
        if (s.cover) covers.add(s.cover);
        if (s.role) roles.add(s.role);
        if (s.position) poss.add(s.position);
        if (s.attack) attacks.add(s.attack);
        if (s.defense) defenses.add(s.defense);
        if (s.ex_cost !== undefined && s.ex_cost !== null && s.ex_cost !== '-') costs.add(s.ex_cost);
        if (s.gear1) gears.add(s.gear1);
        if (s.gear2) gears.add(s.gear2);
        if (s.gear3) gears.add(s.gear3);
        if (s.range && s.range !== "-") ranges.add(s.range);
    });

    const populate = (id, set, isCover = false) => {
        // 🌟 'dropTags' に対して動くのを完全にブロック
        if (id === 'dropTags') return;

        const dd = document.getElementById(id);
        if (!dd) return;
        const content = getContentElement(dd);
        if (!content) return;
        
        let list = Array.from(set);
        
        if (id === 'dropExCost') {
        
            list.sort((a, b) => String(a).localeCompare(String(b), 'ja', { numeric: true, sensitivity: 'base' }));
        }
        
    
        list.forEach(val => {
            const div = document.createElement('div');
            div.className = 'dropdown-option';
            if (isCover) {
                if (val === '○') {
                    div.innerText = '○: 利用する';
                    div.setAttribute('data-value', '○');
                } else if (val === '×') {
                    div.innerText = '×: 利用しない';
                    div.setAttribute('data-value', '×');
                } else {
                    div.innerText = val;
                }
            } else {
                div.innerText = val;
            }
            div.onclick = function() { toggleOptionSelect(this, id); };
            content.appendChild(div);
        });
    };

    // 🌟 動的追加データのソート配列化
    let cvList = Array.from(cvs).sort();
    let rangeList = Array.from(ranges).sort();

    // 通常のドロップダウンを生成
    populate('dropSchool', schools);
    populate('dropType', types);
    populate('dropWeapon', weapons);
    populate('dropCover', covers, true);
    populate('dropRole', roles);
    populate('dropPos', poss);
    populate('dropAttack', attacks);
    populate('dropDefense', defenses);
    populate('dropExCost', costs);

    // 残りのドロップダウン生成
    populate('dropRange', rangeList);
    populate('dropGear', gears);

    // 🌟 新しいグループ化スキルタグ（dropTags）の生成処理
    const dropTagsEl = document.getElementById('dropTags');
    if (dropTagsEl) {
        const content = getContentElement(dropTagsEl);
        if (content) {
            content.style.display = 'grid';
            content.style.gridTemplateColumns = 'repeat(5, 1fr)';
            content.style.gap = '4px';
            content.style.width = '100%';

            const groupedData = {};
            const unclassifiedTags = new Set();

            collectedTags.forEach(tag => {
                let cleanTag = String(tag).trim();
                if (cleanTag === "通所攻撃強化") cleanTag = "通常攻撃強化";
                let tagInfo = mTag.find(item => String(item.skil_tag).trim() === cleanTag);
                
                if (!tagInfo) {
                    const normalizedTag = cleanTag.replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase();
                    tagInfo = mTag.find(item => {
                        const mTagNorm = String(item.skil_tag).trim().replace(/[Ａ-Ｚａ-ｚ]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0)).toLowerCase();
                        return mTagNorm === normalizedTag;
                    });
                }
                
                if (tagInfo && tagInfo.skil_tag_bunrui) {
                    const bunruiName = tagInfo.skil_tag_bunrui;
                    const bunruiInfo = mBunrui.find(b => String(b.skil_tag_bunrui).trim() === String(bunruiName).trim());
                    const bSortNo = bunruiInfo ? parseInt(bunruiInfo.sort_no, 10) : 9999;

                    if (!groupedData[bunruiName]) {
                        groupedData[bunruiName] = { sort_no: bSortNo, tags: [] };
                    }
                    const tSortNo = tagInfo.sort_no !== undefined && tagInfo.sort_no !== null ? parseInt(tagInfo.sort_no, 10) : 9999;
                    
                    groupedData[bunruiName].tags.push({ name: tag, sort_no: tSortNo });
                } else {
                    unclassifiedTags.add(tag);
                }
            });

            const sortedGroups = Object.keys(groupedData).sort((a, b) => groupedData[a].sort_no - groupedData[b].sort_no);

            sortedGroups.forEach(bunruiName => {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'dropdown-group-header-title'; 
                groupTitle.style.cssText = `
                    font-weight: bold !important;
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    color: #ffffff !important;
                    background-color: #00B2FF ;
                    margin-top: 8px !important;
                    margin-bottom: 4px !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    display: block !important;
                    grid-column: span 5 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                `;
                groupTitle.innerText = `【${bunruiName}】`;
                content.appendChild(groupTitle);
                
                groupedData[bunruiName].tags.sort((a, b) => a.sort_no - b.sort_no);

                groupedData[bunruiName].tags.forEach(tag => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-option';
                    div.style.cssText = `
                        padding: 6px 4px !important;
                        border-left: 3px solid #00B2FF ;
                        box-sizing: border-box !important;
                        font-size: 12px !important;
                        text-align: center !important;
                    `;
                    div.innerText = tag.name;
                    div.onclick = function() { toggleOptionSelect(this, 'dropTags'); };
                    content.appendChild(div);
                });
            });

            if (unclassifiedTags.size > 0) {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'dropdown-group-header-title';
                groupTitle.style.cssText = `
                    font-weight: bold !important;
                    padding: 8px 12px !important;
                    font-size: 13px !important;
                    color: #ffffff !important;
                    background-color: #6C7A89 !important;
                    margin-top: 8px !important;
                    margin-bottom: 4px !important;
                    border-radius: 4px !important;
                    pointer-events: none !important;
                    display: block !important;
                    grid-column: span 5 !important;
                    width: 100% !important;
                    box-sizing: border-box !important;
                `;
                groupTitle.innerText = '【その他・未分類】';
                content.appendChild(groupTitle);

                const sortedUnclassified = Array.from(unclassifiedTags).sort();
                sortedUnclassified.forEach(tag => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-option';
                    div.style.cssText = `
                        padding: 6px 4px !important;
                        border-left: 3px solid #6C7A89 !important;
                        box-sizing: border-box !important;
                        font-size: 12px !important;
                        text-align: center !important;
                    `;
                    div.innerText = tag;
                    div.onclick = function() { toggleOptionSelect(this, 'dropTags'); };
                    content.appendChild(div);
                });
            }
        }
    }
    
    document.addEventListener('click', function(e) {
        if (dropTagsEl && !dropTagsEl.contains(e.target)) {
            dropTagsEl.classList.remove('active');
        }
    });

    // ============================================================================
    // 🌟 CVドロップダウン（dropCv）50音単位での強制改行処理
    // ============================================================================
    const dropCvEl = document.getElementById('dropCv');
    if (dropCvEl) {
        const content = dropCvEl.querySelector('.dropdown-content') || dropCvEl.querySelector('.skill-tag-content');
        if (content) {
            content.innerHTML = ''; 
            content.classList.add('cv-grid-layout'); 
            content.style.boxSizing = 'border-box';

            function getInitialChar(studentObj) {
                if (!studentObj || !studentObj.cv) return 'その他';
                const rawName = studentObj.kana || studentObj.cv_kana || studentObj.cv_yomi || studentObj.cv;
                const str = String(rawName).trim();
                const firstChar = str.charAt(0);
                
                if (/^[A-Za-z0-9]/.test(firstChar)) return firstChar.toUpperCase();

                const code = firstChar.charCodeAt(0);
                let char = firstChar;
                if (code >= 0x30A1 && code <= 0x30F6) {
                    char = String.fromCharCode(code - 0x0060);
                }
                if (/^[あ-ん]/.test(char)) return char;
                return 'other';
            }

            function getRowName(char) {
                if (/^[あ-お]/.test(char)) return 'あ行';
                if (/^[か-ご]/.test(char)) return 'か行';
                if (/^[さ-ぞ]/.test(char)) return 'さ行';
                if (/^[た-ど]/.test(char)) return 'た行';
                if (/^[な-の]/.test(char)) return 'な行';
                if (/^[は-ぼぱ-ぽ]/.test(char)) return 'は行';
                if (/^[ま-も]/.test(char)) return 'ま行';
                if (/^[や-よ]/.test(char)) return 'や行';
                if (/^[ら-ろ]/.test(char)) return 'ら行';
                if (/^[わ-ん]/.test(char)) return 'わ行';
                if (/^[A-Z0-9]/.test(char)) return 'アルファベット・英数字';
                return 'その他';
            }

            const charOrder = [
                'あ','い','う','え','お',
                'か','が','き','ぎ','く','ぐ','け','げ','こ','ご',
                'さ','ざ','し','じ','す','ず','せ','ぜ','そ','ぞ',
                'た','だ','ち','ぢ','つ','づ','て','で','と','ど',
                'な','に','ぬ','ね','の',
                'は','ば','ぱ','ひ','び','ぴ','ふ','ぶ','ぷ','へ','べ','ぺ','ほ','ぼ','ぽ',
                'ま','み','む','め','も',
                'や','ゆ','よ',
                'ら','り','る','れ','ろ',
                'わ','を','ん',
                'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z','other'
            ];

            const cvGroupsByChar = {};
            const processedCvs = new Set();

            cachedStudents.forEach(s => {
                if (!s.cv || s.cv === "-" || processedCvs.has(s.cv)) return;
                const char = getInitialChar(s);
                if (!cvGroupsByChar[char]) cvGroupsByChar[char] = [];
                cvGroupsByChar[char].push(s.cv);
                processedCvs.add(s.cv);
            });

            const renderedRows = new Set();

            charOrder.forEach(char => {
                const cvListForChar = cvGroupsByChar[char];
                if (!cvListForChar || cvListForChar.length === 0) return;

                const rowName = getRowName(char);

                if (!renderedRows.has(rowName)) {
                    const rowTitle = document.createElement('div');
                    rowTitle.className = 'cv-row-wide-title'; 
                    rowTitle.innerText = `【${rowName}】`;
                    content.appendChild(rowTitle);
                    renderedRows.add(rowName);
                } else {
                    const lineBreaker = document.createElement('div');
                    lineBreaker.style.cssText = `
                        grid-column: span 3 !important; 
                        height: 6px !important; 
                        pointer-events: none !important;
                    `;
                    content.appendChild(lineBreaker);
                }

                cvListForChar.sort().forEach(cvName => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-option cv-grid-option';
                    div.innerText = cvName;
                    div.title = cvName;
                    
                    div.onclick = function(e) { 
                        e.stopPropagation();
                        toggleOptionSelect(this, 'dropCv'); 
                    };
                    content.appendChild(div);
                });
            });
        }
    }
}

// ============================================================================
// 4. リストレンダリングコア ＆ ページ送り連動（全項目ハイライト対応版）
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
    
    }else{
        const totalPages = 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;
        const startIndex = (currentPage - 1) * limitValue;
        const endIndex = startIndex + limitValue;
        displayStudents = students.slice(startIndex, endIndex);
        setupPagination(students.length, 1, totalPages);
    }

    const searchInput = document.getElementById("liveSearch");
    const freeKeyword = searchInput ? searchInput.value.trim() : "";
    const selGear = getCheckedValues('dropGear');
    const selTags = getCheckedValues('dropTags');
    
    // 🌟 フリーワード以外の選択状態を取得（ハイライト表示用）
    const selSchool = getCheckedValues('dropSchool');
    const selType = getCheckedValues('dropType');
    const selCv = getCheckedValues('dropCv');
    const selWeapon = getCheckedValues('dropWeapon');
    // 🌟 遮蔽ドロップダウンの選択肢（"〇:利用する" など）から「〇」や「×」の記号部分だけを抽出して判定用に使う
    const selCover = getCheckedValues('dropCover').map(v => v.split(':')[0].trim());
    const selRole = getCheckedValues('dropRole');
    const selPos = getCheckedValues('dropPos');
    const selAttack = getCheckedValues('dropAttack');
    const selDefense = getCheckedValues('dropDefense');
    const selExCost = getCheckedValues('dropExCost');
    const selUrban = getCheckedValues('dropUrban');
    const selOutdoor = getCheckedValues('dropOutdoor');
    const selIndoor = getCheckedValues('dropIndoor');
    const selRange = getCheckedValues('dropRange');

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
    
// 🌟【新設】射程（数値・文字列混在）専用のハイライト関数
    function highlightRangeField(text, selectedList) {
        if (text === undefined || text === null || text === "-") return "-";
        const escaped = escapeHtml(text);
        
        let matchFree = false;
        if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
            matchFree = true;
        }
        
        let matchDropdown = false;
        if (selectedList && selectedList.length > 0) {
            // お互いを文字列に揃えて判定
            matchDropdown = selectedList.map(String).includes(String(text).trim());
        }
        
        if (matchFree || matchDropdown) {
            return `<mark class="search-highlight">${escaped}</mark>`;
        }
        return escaped;
    }
    
    function highlightFilterField(text, selectedList) {
    if (!text || text === "-") return "-";
    const escaped = escapeHtml(text);
    
    let matchFree = false;
    if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
        matchFree = true;
    }
    
    let matchDropdown = false;
    if (selectedList && selectedList.length > 0) {
        // 🌟 修正：選択されたフィルターの文字が、対象テキストに「含まれているか」で判定（大文字小文字を無視）
        matchDropdown = selectedList.some(val => {
            const cleanVal = String(val).trim().toLowerCase();
            const cleanText = String(text).trim().toLowerCase();
            return cleanText.includes(cleanVal); // ← 完全一致から部分一致に変更
        });
    }
    
    if (matchFree || matchDropdown) {
        return `<mark class="search-highlight">${escaped}</mark>`;
    }
    return escaped;
    }
// 🌟 遮蔽用の部分一致ハイライト関数（「〇」や「×」を正しく黄色く光らせる）
    function highlightCoverField(text, selectedList) {
        if (!text || text === "-") return "-";
        const escaped = escapeHtml(text);
        
        let matchFree = false;
        if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
            matchFree = true;
        }
        
        // 選択されたリスト（"○" や "×"）の中に、生徒側の文字が含まれているか判定
        let matchDropdown = false;
        if (selectedList && selectedList.length > 0) {
            matchDropdown = selectedList.some(val => val.includes(escaped) || escaped.includes(val));
        }
        
        if (matchFree || matchDropdown) {
            return `<mark class="search-highlight">${escaped}</mark>`;
        }
        return escaped;
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
            let processedText = highlightNumbersInDesc(nsAddText).replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
            nsAddHTML = `<br><span class="skill-type type-ns" style="margin-bottom: 4px; display: inline-block;">NORMAL SKILL+</span><span style="color:#48BB78; font-size:11px; font-weight:700; display:block; line-height:1.4;">${processedText}</span>`;
        }

        let psUnique2HTML = "";
        if (s.ps_unique2 && s.ps_unique2 !== "-") {
            psUnique2HTML = `<br><span style="color:#48BB78; font-size:11px; font-weight:700;">[固有2] ${highlightNumbersInDesc(s.ps_unique2)}</span>`;
        }

        const isFav = favoriteStudents.includes(s.name);
        const pinClass = isFav ? 'is-fav' : 'not-fav';
        const pinIcon = '📌';

        const cvText = s.cv 
            ? `CV: <span class="clickable-val" onclick="clickFilterBind('dropCv', '${s.cv.replace(/'/g, "\\'")}')" style="cursor: pointer; text-decoration: underline;">${highlightText(s.cv)}</span>` 
            : "CV: -";

        const hasItem = s.item_name && s.item_name !== "なし" && s.item_name !== "-";
        const displayItemName = hasItem ? highlightText(s.item_name) : "なし";

        row.innerHTML = `
            <div class="favorite-star-btn ${pinClass}" onclick="toggleFavoriteStudent(event, '${s.name.replace(/'/g, "\\'")}')">${pinIcon}</div>

            <div class="name-section" style="text-align: center; padding: 0 10px;">
                <div class="student-name" style="padding-left: 0;">${highlightText(s.name)}</div>
                <div class="student-cv" style="padding-left: 0;">${cvText}</div>
                <div class="student-school" style="padding-left: 0;">
                    <span class="clickable-filter-text" onclick="clickFilterBind('dropSchool', '${s.school}')">${highlightFilterField(s.school, selSchool)}</span> / 
                    <span class="clickable-filter-text" onclick="clickFilterBind('dropType', '${s.type}')">${highlightFilterField(s.type, selType)}</span>
                </div>
            </div>
            
            <div class="stats-section" style="display: grid; grid-template-columns: repeat(2, 1fr); grid-auto-flow: row; gap: 6px 8px;">
                <div class="stat-badge">役割: <span class="clickable-val" onclick="clickFilterBind('dropRole', '${s.role}')">${highlightFilterField(s.role, selRole)}</span></div>
                <div class="stat-badge">位置: <span class="clickable-val" onclick="clickFilterBind('dropPos', '${s.position}')">${highlightFilterField(s.position, selPos)}</span></div>
                <div class="stat-badge">攻撃: <span class="type-badge-style ${atkClass}" onclick="clickFilterBind('dropAttack', '${s.attack}')">${highlightFilterField(s.attack, selAttack)}</span></div>
                <div class="stat-badge">防御: <span class="type-badge-style ${defClass}" onclick="clickFilterBind('dropDefense', '${s.defense}')">${highlightFilterField(s.defense, selDefense)}</span></div>
                <div class="stat-badge">武器/遮蔽: 
                    <span>
                        <span class="clickable-val-text" onclick="clickFilterBind('dropWeapon', '${s.weapon}')" style="cursor: pointer;">${highlightFilterField(s.weapon, selWeapon)}</span> 
                        / 
                        <span class="clickable-val-text" onclick="clickFilterBind('dropCover', '${s.cover}')" style="cursor: pointer;">${highlightCoverField(s.cover, selCover)}</span>
                    </span>
                </div>
                <div class="stat-badge">市/外/内: 
                    <span>
                        <span class="clickable-val-text" onclick="clickFilterBind('dropUrban', '${s.urban}')" style="cursor: pointer;">${highlightFilterField(s.urban, selUrban)}</span> 
                        / 
                        <span class="clickable-val-text" onclick="clickFilterBind('dropOutdoor', '${s.outdoor}')" style="cursor: pointer;">${highlightFilterField(s.outdoor, selOutdoor)}</span> 
                        / 
                        <span class="clickable-val-text" onclick="clickFilterBind('dropIndoor', '${s.indoor}')" style="cursor: pointer;">${highlightFilterField(s.indoor, selIndoor)}</span>
                    </span>
                </div>
                <div class="stat-badge">装備1: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear1Text}')">${highlightGear(gear1Text)}</span></div>
                <div class="stat-badge">装備2: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear2Text}')">${highlightGear(gear2Text)}</span></div>
                <div class="stat-badge">装備3: <span class="clickable-gear" onclick="clickFilterBind('dropGear', '${gear3Text}')">${highlightGear(gear3Text)}</span></div>
                <div class="stat-badge">射程: <span class="clickable-val" onclick="clickFilterBind('dropRange', '${String(s.range).replace(/'/g, "\\'")}')" style="cursor: pointer; text-decoration: underline;">${highlightRangeField(s.range, selRange)}</span></div>
            </div>

            <div class="skills-section">
                <div class="skill-block">
                    <div class="skill-header">
                        <span class="skill-type type-ex">EX SKILL</span>
                        <span class="skill-cost" onclick="clickFilterBind('dropExCost', '${s.ex_cost}')">COST ${highlightFilterField(s.ex_cost, selExCost)}</span>
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
                
                <div class="skill-block custom-gear-block">
                    <div class="skill-header">
                        <span class="skill-type" style="background-color: var(--ba-blue, #00B2FF) !important; color: #fff !important;">愛用品</span>
                    </div>
                    <div class="skill-title">${displayItemName}</div>
                    <div class="skill-desc" style="font-size: 11px; line-height: 1.5; padding-top: 4px;">
                        <div style="margin-bottom: 4px;"><strong style="color: var(--ba-pink);">✦ T1: ${highlightText(s.gearStats || "")}</strong></div>
                        <div style="margin-bottom: 4px;"><strong style="color: #48BB78;">✦ 贈り物: ${highlightText(s.gift_name || "")}</strong></div>
                        <div style="margin-bottom: 0;"><strong style="color: #48BB78;">✦ オーパーツ: ${highlightText(s.artifacts || "")}</strong></div>
                    </div>
                </div>
            </div>

            <div class="items-section"></div>
        `;
        container.appendChild(row);
    });
}

function setupPagination(totalItems, itemsPerPage, totalPages) {
    const wrap = document.getElementById('paginationContainer');
    if (!wrap) return;
    wrap.innerHTML = ''; // 🌟 既存の残骸をクリア

    const nav = document.createElement('div');
    nav.className = 'pagination-container';

    // 1. 最初へ戻るボタン
    const firstBtn = document.createElement('button');
    firstBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    firstBtn.innerHTML = '<i class="fa-solid fa-angles-left"></i>';
    if (currentPage !== 1) {
        firstBtn.onclick = () => {
            currentPage = 1;
            // 🌟 修正: 安全に現在のキャッシュデータから再レンダリングを実行
            if (typeof filterStudents === 'function') filterStudents(); else renderStudentsList(cachedStudents);
        };
    }
    nav.appendChild(firstBtn);

    // 2. 前へボタン
    const prevBtn = document.createElement('button');
    prevBtn.className = `pagination-btn ${currentPage === 1 ? 'disabled' : ''}`;
    prevBtn.innerHTML = '<i class="fa-solid fa-angle-left"></i>';
    if (currentPage !== 1) {
        prevBtn.onclick = () => {
            currentPage--;
            // 🌟 修正: 安全に現在のキャッシュデータから再レンダリングを実行
            if (typeof filterStudents === 'function') filterStudents(); else renderStudentsList(cachedStudents);
        };
    }
    nav.appendChild(prevBtn);

    // 3. ページ番号ボタン（前後2ページ分を表示）
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
                // 🌟 修正: 安全に現在のキャッシュデータから再レンダリングを実行
                if (typeof filterStudents === 'function') filterStudents(); else renderStudentsList(cachedStudents);
            }
        };
        nav.appendChild(pageBtn);
    }

    // 4. 次へボタン
    const nextBtn = document.createElement('button');
    nextBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    nextBtn.innerHTML = '<i class="fa-solid fa-angle-right"></i>';
    if (currentPage !== totalPages) {
        nextBtn.onclick = () => {
            currentPage++;
            // 🌟 修正: 安全に現在のキャッシュデータから再レンダリングを実行
            if (typeof filterStudents === 'function') filterStudents(); else renderStudentsList(cachedStudents);
        };
    }
    nav.appendChild(nextBtn);

    // 5. 最後へ進むボタン
    const lastBtn = document.createElement('button');
    lastBtn.className = `pagination-btn ${currentPage === totalPages ? 'disabled' : ''}`;
    lastBtn.innerHTML = '<i class="fa-solid fa-angles-right"></i>';
    if (currentPage !== totalPages) {
        lastBtn.onclick = () => {
            currentPage = totalPages;
            // 🌟 修正: 安全に現在のキャッシュデータから再レンダリングを実行
            if (typeof filterStudents === 'function') filterStudents(); else renderStudentsList(cachedStudents);
        };
    }
    nav.appendChild(lastBtn);

    // 6. ページインフォメーション表示
    const info = document.createElement('span');
    info.className = 'pagination-info';
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    info.textContent = `${currentPage} / ${totalPages} PAGES (${startItem}-${endItem} / TOTAL ${totalItems})`;
    nav.appendChild(info);

    wrap.appendChild(nav);
}

// ============================================================================
// 【修正確定版】一覧クリック時に検索条件を追加し、バッジを生成する関数
// ============================================================================
function clickFilterBind(dropdownId, value) {
    if (!dropdownId || !value) return;

    const el = document.getElementById(dropdownId);
    if (!el) return;

    // ドロップダウン内のオプション要素（div）を探す
    const options = el.querySelectorAll('.dropdown-option');
    let targetOpt = null;

    options.forEach(opt => {
        const optText = opt.textContent.trim().toUpperCase();
        const optVal = (opt.getAttribute('data-value') || '').trim().toUpperCase();
        const searchVal = String(value).trim().toUpperCase();

        // 🌟 遮蔽の場合（例: 表示が "〇:利用する"、クリックされたのが "○" の時に前方一致やdata-valueで紐付け）
        if (dropdownId === 'dropCover') {
            if (optText.startsWith(searchVal) || optVal === searchVal) {
                targetOpt = opt;
            }
        } else {
            // 通常の項目の完全一致判定
            if (optText === searchVal || optVal === searchVal) {
                targetOpt = opt;
            }
        }
    });

    if (targetOpt) {
        // システムの共通トグル関数を呼び出し、選択クラスの付与、バッジ生成、検索連動をすべて1発で同期
        toggleOptionSelect(targetOpt, dropdownId);
    }
}

function clearAllFilters() {
    // 1. 全てのフィルターデータを初期化
    badgeSelectedFilters = {
        dropSchool: [], dropType: [], dropWeapon: [], dropCover: [], dropRole: [], 
        dropPos: [], dropAttack: [], dropDefense: [], dropExCost: [], dropUrban: [], 
        dropOutdoor: [], dropIndoor: [], dropGear: [], dropTags: [], dropHasGear: []
    };

    // 2. ドロップダウン内の .selected クラスをすべて解除し、チェックボックスも外す
    document.querySelectorAll('.custom-dropdown, .skill-tag-dropdown').forEach(el => {
        el.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
        el.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        
        // 🌟 内部のバッジ表示とボタンのテキスト表示を一発でリセット
        updateBadgeDropdownUI(el.id);
    });
    
    // お気に入りボタンのリセット
    const favBtn = document.getElementById('favFilterBtn');
    if (favBtn) {
        favBtn.classList.remove('is-fav');
        favBtn.classList.add('not-fav');
        const star = favBtn.querySelector('i');
        if (star) {
            star.className = 'fa-regular fa-star';
        }
    }
    showFavoritesOnly = false;

    const searchInput = document.getElementById('studentSearchInput');
    if (searchInput) searchInput.value = '';

    resetPageAndTrigger();
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

function toggleFavFilter() {
    const favBtn = document.getElementById('favFilterBtn');
    if (!favBtn) return;
    
    if (favBtn.classList.contains('is-fav')) {
        favBtn.classList.remove('is-fav');
        favBtn.classList.add('not-fav');
        favBtn.innerHTML = '📌 ';
    } else {
        favBtn.classList.remove('not-fav');
        favBtn.classList.add('is-fav');
        favBtn.innerHTML = '📌 ';
    }
    
    currentPage = 1;
    filterStudentsTrigger();
}

function toggleFavoriteStudent(event, studentName) {
    // 1. 他の行へのイベントの漏れ出し（バブリング）を完全に防ぐ
    if (event) {
        event.stopPropagation();
        if (typeof event.preventDefault === 'function') event.preventDefault();
    }
    
    // 2. 配列の更新処理（現状のロジックのまま）
    const index = favoriteStudents.indexOf(studentName);
    if (index > -1) {
        favoriteStudents.splice(index, 1);
    } else {
        favoriteStudents.push(studentName);
    }
    localStorage.setItem('db_favorites', JSON.stringify(favoriteStudents));
    
    // 3. 【重要】currentPage = 1; を排除し、現在のページを完全維持
    // 4. 【重要】全体リセットの filterStudents() ではなく、現在の検索状態を維持して安全に再描画するトリガーを実行
    if (typeof filterStudentsTrigger === 'function') {
        filterStudentsTrigger();
    } else if (typeof filterStudents === 'function') {
        filterStudents();
    }
}

/**
 * セクションの表示状態を切り替える汎用関数
 * @param {HTMLElement} btn - クリックされたボタン要素
 * @param {string} className - コンテナに付与するクラス名（例: 'hide-ex'）
 */
function toggleSect(btn, className) {
    const container = document.getElementById('studentContainer');
    if (!container) return;

    // 1. コンテナの表示状態を切り替える
    const isHidden = container.classList.toggle(className);
    
    let isVisible = false;
    // 2. ボタンの見た目（activeクラス）を同期
    if (isHidden) {
        btn.classList.remove('active');
        isVisible = false; // アクティブ解除 ＝ 非表示状態
    } else {
        btn.classList.add('active');
        isVisible = true;  // アクティブ付与 ＝ 表示状態
    }

    // 3. 🌟LocalStorageへの正しい書き込み処理（ここが原因でした）
    // 読み込み側が正常に検知できる「db_sect_クラス名」の形式でキーを生成
    const storageKey = `db_sect_${className}`;
    
    // 読み込み側が正常に判別できる「visible / hidden」の文字列で保存
    localStorage.setItem(storageKey, isVisible ? 'visible' : 'hidden');

    // 3. 検索結果への反映を強制する
    if (typeof filterStudentsTrigger === 'function') {
        filterStudentsTrigger();
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
            
            if (className === 'hide-gear') {
                const styleId = 'dynamic-gear-hide-style';
                let styleEl = document.getElementById(styleId);
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = styleId;
                    document.head.appendChild(styleEl);
                }
                if (savedSect === 'hidden') {
                    container.classList.add('hide-gear');
                    styleEl.textContent = `.custom-gear-block { display: none !important; }`;
                    if (targetBtn) targetBtn.classList.remove('active');
                } else {
                    container.classList.remove('hide-gear');
                    styleEl.textContent = '';
                    if (targetBtn) targetBtn.classList.add('active');
                }
                return;
            }

            if (savedSect === 'hidden') {
                container.classList.add(className);
                if (targetBtn) targetBtn.classList.remove('active');
            } else {
                container.classList.remove(className);
                if (targetBtn) targetBtn.classList.add('active');
            }
        });
    }

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

// ============================================================================
// 9. 【完全修正・決定版】バッジ形式・全検索プロパティ・ラベル位置完全補正ロジック
// ============================================================================

// 1. グローバルなフィルター保持オブジェクトを、HTML側の正確なID名（CamelCase）で定義
let badgeSelectedFilters = {
    dropSchool: [],
    dropType: [],
    dropWeapon: [],
    dropCover: [],
    dropRole: [],
    dropPos: [],
    dropAttack: [],
    dropDefense: [],
    dropExCost: [],
    dropUrban: [],
    dropOutdoor: [],
    dropIndoor: [],
    dropGear: [],
    dropTags: [],
    dropHasGear: [] 
};

// 2. オプション要素をクリックしたときのトグル処理
function toggleOptionSelect(element, dropdownId) {
    if (!badgeSelectedFilters.hasOwnProperty(dropdownId)) {
        badgeSelectedFilters[dropdownId] = [];
    }
    const value = element.getAttribute('data-value') || element.textContent.trim();
    let selectedArr = badgeSelectedFilters[dropdownId];

    if (selectedArr.includes(value)) {
        selectedArr = selectedArr.filter(v => v !== value);
        element.classList.remove('selected');
    } else {
        selectedArr.push(value);
        element.classList.add('selected');
    }
    badgeSelectedFilters[dropdownId] = selectedArr;
    
    // 🌟 画面上のバッジ描画、ボタンテキストを正しく更新します
    updateBadgeDropdownUI(dropdownId);
    
    currentPage = 1;
    filterStudentsTrigger();
}

function updateBadgeDropdownUI(id) {
    const dropdown = document.getElementById(id);
    if (!dropdown) return;

    const button = dropdown.querySelector('.dropdown-button');
    if (!button) return;

    const selectedArr = badgeSelectedFilters[id] || [];

    // コントロール内部を完全にクリア
    button.innerHTML = '';

    if (selectedArr.length === 0) {
        button.textContent = '選択してください';
        return;
    }

    // 選択された項目を、本物のバッジ（子要素）としてコントロール内部へストレートに追加
    selectedArr.forEach(val => {
        let displayVal = val;
        
        if (id === 'dropCover') {
            if (val.includes('利用する') || val === '〇' || val === '○') {
                displayVal = '〇：利用する';
            } else if (val.includes('利用しない') || val === '×') {
                displayVal = '×：利用しない';
            }
        }

        const badge = document.createElement('span');
        badge.className = 'selected-badge';
        badge.innerHTML = `${displayVal} <i class="fa-solid fa-xmark"></i>`;
        
        // バッジが改行でバラバラに千切れないよう保護
        badge.style.display = 'inline-flex';
        badge.style.alignItems = 'center';
        badge.style.whiteSpace = 'nowrap';

        // 個別のバッジ削除イベント
        badge.querySelector('i.fa-xmark').addEventListener('click', function(e) {
            e.stopPropagation();
            removeBadgeDirect(e, id, val);
        });
        
        // アークナイツ版同様、コントロール（div）の内部に直接格納
        button.appendChild(badge);
    });

    // 右端の一括クリアボタン（&times;）を生成してコントロール内に追加
    const clearBtn = document.createElement('span');
    clearBtn.className = 'dropdown-clear-btn';
    clearBtn.innerHTML = '&times;';
    
    clearBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        clearSingleDropdownContainer(id);
    });
    
    button.appendChild(clearBtn);
}

// 4. ピンクの×ボタンを押したときにそのドロップダウンだけを空にする処理
function clearSingleDropdownContainer(dropdownId) {
    badgeSelectedFilters[dropdownId] = [];
    
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
            opt.classList.remove('selected');
        });
    }

    updateBadgeDropdownUI(dropdownId);
    currentPage = 1;
    filterStudentsTrigger();
}

// 5. バッジ内の小さな「×」マークをクリックした時の単一解除処理
function removeBadgeDirect(event, dropdownId, value) {
    event.stopPropagation();

    let selectedArr = badgeSelectedFilters[dropdownId] || [];
    selectedArr = selectedArr.filter(v => v !== value);
    badgeSelectedFilters[dropdownId] = selectedArr;

    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.querySelectorAll('.dropdown-option').forEach(opt => {
            const optVal = opt.getAttribute('data-value') || opt.textContent.trim();
            if (optVal === value) {
                opt.classList.remove('selected');
            }
        });
    }

    updateBadgeDropdownUI(dropdownId);
    currentPage = 1;
    filterStudentsTrigger();
}


// 6. 全てクリアボタン（setClearAllFilters）のロジックを完全正常化
setClearAllFilters = function() {
    const liveSearch = document.getElementById('liveSearch');
    if (liveSearch) liveSearch.value = "";
    
    const favBtn = document.getElementById('favFilterBtn');
    if (favBtn) favBtn.classList.remove('is-fav');

    // 定義されているすべての正確なIDキー（CamelCase）を確実に完全初期化
    Object.keys(badgeSelectedFilters).forEach(key => {
        badgeSelectedFilters[key] = [];
        updateBadgeDropdownUI(key);
    });
    
    document.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
    currentPage = 1;
    filterStudentsTrigger();
};
// フリーワード検索・マルチフィルター判定メインロジック
filterStudentsTrigger = function() {
    const searchInput = document.getElementById("liveSearch");
    const freeText = searchInput ? searchInput.value.trim().toLowerCase() : ""; 
    const favBtn = document.getElementById('favFilterBtn');
    const isFavOnly = favBtn ? favBtn.classList.contains('is-fav') : false;

    // 一覧コンテナの要素を取得
    const container = document.getElementById('studentContainer');

    // クラスが含まれていない場合が表示中（＝検索プールに含める）
    const isProfileShow = container ? !container.classList.contains('hide-profile') : true;
    const isStatusShow  = container ? !container.classList.contains('hide-status')  : true;
    const isExShow      = container ? !container.classList.contains('hide-ex')      : true;
    const isNsShow      = container ? !container.classList.contains('hide-ns')      : true;
    const isPsShow      = container ? !container.classList.contains('hide-ps')      : true;
    const isSsShow      = container ? !container.classList.contains('hide-ss')      : true;
    const isGearShow    = container ? !container.classList.contains('hide-gear')    : true;

    // 既存のバッジ選択フィルター状態の取得
    const selSchool = badgeSelectedFilters.dropSchool || [];
    const selType = badgeSelectedFilters.dropType || [];
    const selCv = getCheckedValues('dropCv');
    const selWeapon = badgeSelectedFilters.dropWeapon || [];
    const selCover = badgeSelectedFilters.dropCover || [];
    const selRole = badgeSelectedFilters.dropRole || [];
    const selPos = badgeSelectedFilters.dropPos || [];
    const selAttack = badgeSelectedFilters.dropAttack || [];
    const selDefense = badgeSelectedFilters.dropDefense || [];
    const selExCost = badgeSelectedFilters.dropExCost || [];
    const selUrban = badgeSelectedFilters.dropUrban || [];
    const selOutdoor = badgeSelectedFilters.dropOutdoor || [];
    const selIndoor = badgeSelectedFilters.dropIndoor || [];
    const selGear = badgeSelectedFilters.dropGear || [];
    const selTags = badgeSelectedFilters.dropTags || [];
    const selRange = getCheckedValues('dropRange');
    const selHasGear = getCheckedValues('dropHasGear'); // 「あり」「なし」の選択状態を取得
    
    // 生徒データのフィルタリングメイン処理
    const filtered = cachedStudents.filter(s => {
        // お気に入りフィルター判定
        if (isFavOnly && !favoriteStudents.includes(s.name)) {
            return false;
        }

        // フリーワード検索判定
        if (freeText) {
            // トグル（表示切替）に関わらず、常に検索対象とする「基本の共通情報」
            let searchPool = [
                s.name, s.type, s.weapon, s.cover, s.role, s.position, s.attack, s.defense,
                s.urban, s.outdoor, s.indoor, s.gear1, s.gear2, s.gear3
            ];

            // 表示中（hideクラスがついていない）セクションデータのみを検索対象に加算
            if (isProfileShow) {
                searchPool.push(s.school, s.club, s.cv);
            }
            if (isStatusShow) {
                searchPool.push(s.hp, s.attackPower, s.defensePower, s.healingPower);
            }
            if (isExShow) {
                searchPool.push(s.ex_name, s.ex_desc, s.ex_cost, s.ex_tags);
            }
            if (isNsShow) {
                searchPool.push(s.ns_name, s.ns_desc, s.ns_tags, s.ns_add);
            }
            if (isPsShow) {
                searchPool.push(s.ps_name, s.ps_desc, s.ps_tags, s.ps_unique2);
            }
            if (isSsShow) {
                searchPool.push(s.ss_name, s.ss_desc, s.ss_tags);
            }
            if (isGearShow) {
                searchPool.push(
                    s.gearName,   // キャメルケースの可能性
                    s.gear_name,  // スネークケースの可能性
                    s.item_name,  // item表記の可能性
                    s.gear,       // 単体表記の可能性
                    s.gear_name, 
                    s.gear_desc, 
                    s.gear_tier2, 
                    s.gearStats, 
                    s.gift_name, 
                    s.artifacts
                );
            }

            const poolString = searchPool.filter(Boolean).join(" ").toLowerCase();
            // 🌟【デバッグ用出力】フリーワード検索の対象となっている全文字列をコンソールに出力します
            //console.log(`【検索対象プール - ${s.name}】:`, poolString);
            if (!poolString.includes(freeText)) {
                return false;
            }
            
        }

        // ドロップダウンマルチセレクト群とのAND判定
        if (selSchool.length > 0 && !selSchool.includes(s.school)) return false;
        if (selType.length > 0 && !selType.includes(s.type)) return false;
        if (selCv.length > 0 && !selCv.includes(s.cv)) return false;
        if (selWeapon.length > 0 && !selWeapon.includes(s.weapon)) return false;
        if (selRole.length > 0 && !selRole.includes(s.role)) return false;
        if (selPos.length > 0 && !selPos.includes(s.position)) return false;
        if (selAttack.length > 0 && !selAttack.includes(s.attack)) return false;
        if (selDefense.length > 0 && !selDefense.includes(s.defense)) return false;

        if (selCover.length > 0) {
            let matchCover = selCover.some(val => s.cover === val.replace("○", "").replace("×", "").replace(":", "").trim() || s.cover === val);
            if (!matchCover) return false;
        }
        
        // 既存の市街地・屋外・屋内の条件チェック処理（以下はイメージです。お手元の判定部分を書き換えてください）
        const urbanVal = document.getElementById('dropUrban') ? document.getElementById('dropUrban').value : '';
        const outdoorVal = document.getElementById('dropOutdoor') ? document.getElementById('dropOutdoor').value : '';
        const indoorVal = document.getElementById('dropIndoor') ? document.getElementById('dropIndoor').value : '';

        // 🏙️ 市街地・屋外・屋内ドロップダウンのマルチセレクト部分一致判定
        if (selUrban && selUrban.length > 0) {
            // 選択された「SS〜D」のいずれかが、生徒の適性文字列（s.urban）に含まれているか
            let matchUrban = selUrban.some(val => s.urban && s.urban.includes(val));
            if (!matchUrban) return false;
        }

        if (selOutdoor && selOutdoor.length > 0) {
            let matchOutdoor = selOutdoor.some(val => s.outdoor && s.outdoor.includes(val));
            if (!matchOutdoor) return false;
        }

        if (selIndoor && selIndoor.length > 0) {
            let matchIndoor = selIndoor.some(val => s.indoor && s.indoor.includes(val));
            if (!matchIndoor) return false;
        }
        
        if (selGear.length > 0) {
            let matchGear = selGear.some(g => s.gear1 === g || s.gear2 === g || s.gear3 === g);
            if (!matchGear) return false;
        }

        if (selExCost.length > 0) {
            if (s.ex_cost === undefined || s.ex_cost === null || s.ex_cost === "") return false;
            let matchCost = selExCost.some(val => String(s.ex_cost) === val.replace("コスト", "").trim());
            if (!matchCost) return false;
        }
        
        // 🌟【修正箇所】射程の判定を文字列（String）に統一して型安全に比較
        if (selRange.length > 0) {
            // 生徒側の射程データを安全に文字列化（nullやundefinedなら空文字に）
            const studentRangeStr = (s.range !== undefined && s.range !== null) ? String(s.range).trim() : "";
            // 選択されたリスト（こちらも全て文字列化）に生徒の射程文字列が含まれているか判定
            const matchRange = selRange.map(String).includes(studentRangeStr);
            if (!matchRange) return false;
        }
        
        if (selHasGear.length > 0) {
            // 生徒が愛用品を持っているか判定 (s.item_nameが実在し、かつ "なし" や "-" ではない場合)
            const studentHasGear = s.item_name && s.item_name !== "なし" && s.item_name !== "-";
            
            // 選択された条件のいずれかにマッチしているか検証
            const matchHasGear = selHasGear.some(val => {
                if (val === "あり") return studentHasGear;
                if (val === "なし") return !studentHasGear;
                return false;
            });
            
            if (!matchHasGear) return false; // 条件に合致しなければこの生徒を除外
        }
        
        if (selTags.length > 0) {
            // 表示されているセクションのタグのみを集計対象の配列に格納する
            let studentTags = [];
            
            if (isExShow) {
                studentTags.push(...parseTagsString(s.ex_tags));
            }
            if (isNsShow) {
                studentTags.push(...parseTagsString(s.ns_tags));
            }
            if (isPsShow) {
                studentTags.push(...parseTagsString(s.ps_tags));
            }
            if (isSsShow) {
                studentTags.push(...parseTagsString(s.ss_tags));
            }

            let matchTag = selTags.some(t => studentTags.includes(t));
            if (!matchTag) return false;
        }

        return true;
    });

    renderStudentsList(filtered);
};

// 全クリア連動フック
const originalClearAllFilters = clearAllFilters;
clearAllFilters = function() {
    originalClearAllFilters();
    Object.keys(badgeSelectedFilters).forEach(key => {
        badgeSelectedFilters[key] = [];
        updateBadgeDropdownUI(key);
    });
    document.querySelectorAll('.dropdown-option').forEach(opt => opt.classList.remove('selected'));
    filterStudentsTrigger();
};

// ============================================================================
// 【完全修正・決定版】5種ドロップダウン動的構築（EXコスト完全文字列処理版）
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    // 既存のパース処理(initDatabase)が走り、cachedStudentsにデータが入った直後に実行
    setTimeout(() => {
        if (typeof cachedStudents !== 'undefined' && cachedStudents.length > 0) {
            // 1. 既存のスキルタグドロップダウンの構築と監視の起動
            buildSkillTagDropdownContent(cachedStudents);
            initSkillTagOutsideClickClose();
            
            // 2. 学校・市街地・屋外・屋内・EXコストドロップダウンをデータから動的構築
            buildDynamicFiltersFromData(cachedStudents);
        }
    }, 150);
});

// 学校、市街地、屋外、屋内、EXコストのドロップダウンをデータから自動抽出して再構築する関数
function buildDynamicFiltersFromData(students) {
    const schoolsSet = new Set();

    // 全生徒データから各項目の値を重複なく抽出
    students.forEach(s => {
        if (s.school && String(s.school).trim() !== '') schoolsSet.add(String(s.school).trim());
    });

    // 🌟【文字列専用・自然順ソート関数】
    // 数値変換を一切行わず、文字列のままで「2, 3, 4, 4～6, 4(2)」のように人間の感覚に沿って並び替える
    const stringNaturalSort = (array) => {
        return array.sort((a, b) => {
            return a.localeCompare(b, 'ja', { numeric: true, sensitivity: 'base' });
        });
    };

    // 各ドロップダウンIDと、抽出・ソートしたデータのマッピング
    const filterConfigs = [
        { id: 'dropSchool', data: Array.from(schoolsSet) }
    ];

    filterConfigs.forEach(config => {
        const dropdown = document.getElementById(config.id);
        if (!dropdown) return;

        const contentDiv = dropdown.querySelector('.dropdown-content');
        if (!contentDiv) return;

        // 既存の静的（固定）HTML選択肢を完全にクリア
        contentDiv.innerHTML = '';

        // 抽出した文字列データから、元々のHTMLと100%同じ構造・デザインの選択肢を動的に生成
        config.data.forEach(val => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'dropdown-option';
            optionDiv.textContent = val;
            
            // 元々のHTMLに記述されていた onclick="toggleOptionSelect(this, 'ドロップダウンID')" を完全再現
            optionDiv.setAttribute('onclick', `toggleOptionSelect(this, '${config.id}')`);
            
            contentDiv.appendChild(optionDiv);
        });
    });
}

// スキルタグのドロップダウン外をクリックしたときにリストを閉じるグローバル関数
function initSkillTagOutsideClickClose() {
    document.addEventListener('click', function(e) {
        // クリックされた場所がスキルタグドロップダウンの構成要素（ボタンや中身）でなければ閉じる
        if (!e.target.closest('.skill-tag-dropdown')) {
            let openedAny = false;

            // 開いているドロップダウンがあれば閉じる
            document.querySelectorAll('.skill-tag-dropdown.open').forEach(d => {
                d.classList.remove('open');
                openedAny = true;
            });

            // 🌟【クリア処理】リスト外クリックで閉じられたので、検索インプットをリセット
            if (openedAny) {
                document.querySelectorAll('.skill-tag-search-input').forEach(input => {
                    input.value = ''; // 文字を空にする
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    const content = input.closest('.skill-tag-content, .dropdown-content');
                    if (content) {
                        content.querySelectorAll('.dropdown-option').forEach(opt => {
                            opt.classList.remove('hide');
                        });
                    }
                });
            }
        }
    });
}

function buildSkillTagDropdownContent(students) {
    return;
}

// ============================================================================
// 【追記】フリーワード以外のドロップダウン用のハイライト（強調表示）関数
// ============================================================================
function highlightFilterField(text, selectedList) {
    if (!text || text === "-") return "-";
    // HTMLエスケープ処理
    const escaped = String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    
    const searchInput = document.getElementById("liveSearch");
    const freeKeyword = searchInput ? searchInput.value.trim() : "";
    
    let matchFree = false;
    if (freeKeyword && escaped.toLowerCase().includes(freeKeyword.toLowerCase())) {
        matchFree = true;
    }
    
    let matchDropdown = false;
    if (selectedList && selectedList.length > 0) {
        matchDropdown = selectedList.some(val => escaped.toLowerCase() === val.toLowerCase());
    }
    
    if (matchFree || matchDropdown) {
        return `<mark class="search-highlight">${escaped}</mark>`;
    }
    return escaped;
}



// 各項目が呼び出すグローバル関数のマッピング（CamelCaseキーに完全対応）
setQuickBadgeFilter = function(dropdownId, value) { clickFilterBind(dropdownId, value); };
setQuickSchoolFilter = function(val) { clickFilterBind('dropSchool', val); };
setQuickWeaponFilter = function(val) { clickFilterBind('dropWeapon', val); };
setQuickAttackFilter = function(val) { clickFilterBind('dropAttack', val); };
setQuickDefenseFilter = function(val) { clickFilterBind('dropDefense', val); };
setQuickGearFilter = function(val) { clickFilterBind('dropGear', val); };
setQuickCostFilter = function(val) { clickFilterBind('dropExCost', val); };
setQuickCvFilter = function(val) { clickFilterBind('dropCv', val); };
setQuickRangeFilter = function(val) { clickFilterBind('dropRange', val); };

document.addEventListener('DOMContentLoaded', restoreAllStates);
