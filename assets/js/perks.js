
// DOM
const listEl = document.getElementById('perk-list');
const emptyEl = document.getElementById('empty-state');
const searchEl = document.getElementById('perk-search');
const tagFilterEl = document.getElementById('tag-filter');
const clearBtn = document.getElementById('clear-filter');
const hintEl = document.getElementById('filter-hint');
const roleNoteEl = document.getElementById('role-note');
const roleTabs = document.querySelectorAll('.role-tab');

const modal = document.getElementById('perk-modal');
const pdImage = document.getElementById('pd-image');
const pdName = document.getElementById('pd-name');
const pdNameEn = document.getElementById('pd-name-en');
const pdOwner = document.getElementById('pd-owner');
const pdTags = document.getElementById('pd-tags');
const pdDesc = document.getElementById('pd-desc');
const pdSynergies = document.getElementById('pd-synergies');

// 目前的篩選狀態
const state = {
    role: 'killer',
    keyword: '',
    tags: new Set()
};

let allPerks = [];
let perkMap = {};

loadPerks()
    .then(result => {
        allPerks = result.allPerks;
        perkMap = result.perkMap;

        renderTagLegend();
        renderTagFilter();
        renderList();
        openFromHash(); // 網址有 #技能id 時直接打開
    })
    .catch(err => console.error('抓取技能資料失敗:', err));


// ---------- 標籤說明（可展開的區塊） ----------
function renderTagLegend() {
    const el = document.getElementById('tag-legend-body');
    el.innerHTML = TAG_GROUPS.map(g => `
        <div class="legend-group">
            <h4>${g.name}</h4>
            <dl>
                ${Object.entries(g.tags).map(([tag, info]) => `
                    <div class="legend-item"><dt>${tagHtml(tag)}</dt><dd>${info}</dd></div>
                `).join('')}
            </dl>
        </div>`).join('');
}

// ---------- 標籤篩選按鈕（依分組排成幾排） ----------
function makeTagButton(tag) {
    const btn = document.createElement('button');
    btn.className = 'tag tag-btn' + (state.tags.has(tag) ? ' active' : '');
    btn.textContent = tag;
    if (TAG_INFO[tag]) btn.title = TAG_INFO[tag];
    btn.addEventListener('click', () => {
        state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
        btn.classList.toggle('active');
        renderList();
    });
    return btn;
}

function renderTagFilter() {
    // 只列出目前分頁（殺手 / 人類）有用到的標籤
    const used = new Set();
    allPerks
        .filter(p => p.role === state.role)
        .forEach(p => {
            p.tags.forEach(t => used.add(t));
            if (statusTags(p).length) used.add('減益');
        });

    // 依分組排好；沒有分組的放進「其他」
    const groups = TAG_GROUPS.map(g => ({
        name: g.name,
        advanced: g.advanced,
        tags: Object.keys(g.tags).filter(t => used.has(t))
    }));
    const others = [...used].filter(t => !TAG_GROUP_OF[t]);
    if (others.length) groups.push({ name: '其他', tags: others });

    tagFilterEl.innerHTML = '';
    groups.filter(g => g.tags.length).forEach(g => {
        const row = document.createElement(g.advanced ? 'details' : 'div');
        row.className = 'filter-group';

        const label = document.createElement(g.advanced ? 'summary' : 'span');
        label.className = 'filter-label';
        label.textContent = g.advanced ? `進階篩選：${g.name}` : g.name;
        row.appendChild(label);

        const list = document.createElement('div');
        list.className = 'tag-list tag-filter';
        g.tags.forEach(tag => list.appendChild(makeTagButton(tag)));
        row.appendChild(list);

        // 進階區塊裡有已選的標籤時保持展開
        if (g.advanced && g.tags.some(t => state.tags.has(t))) row.open = true;

        tagFilterEl.appendChild(row);
    });
}

// ---------- 技能清單 ----------
function matchPerk(perk) {
    if (perk.role !== state.role) return false;

    // 標籤：必須「全部」符合
    for (const t of state.tags) {
        if (!hasTag(perk, t)) return false;
    }

    // 關鍵字：中文名、別稱、英文名、擁有者、說明任一包含即可
    if (state.keyword) {
        const text = [perk.name, ...(perk.aliases || []), perk.name_en, perk.owner, perk.desc].join(' ').toLowerCase();
        if (!text.includes(state.keyword)) return false;
    }
    return true;
}

function renderList() {
    const result = allPerks.filter(matchPerk);

    listEl.innerHTML = '';
    result.forEach(perk => {
        const card = document.createElement('button');
        card.className = 'perk-card';
        card.innerHTML = `
            ${diamondHtml(perk)}
            <div class="perk-card-text">
                <h3>${perk.name}</h3>
                <p class="muted">${perk.name_en}</p>
                <p class="muted">${perk.owner}</p>
                <div class="tag-list">${mainTags(perk).map(tagHtml).join('')}</div>
            </div>`;
        card.addEventListener('click', () => openPerk(perk.id));
        listEl.appendChild(card);
    });

    emptyEl.style.display = result.length ? 'none' : 'block';

    // 篩選提示
    const total = allPerks.filter(p => p.role === state.role).length;
    let hint = `共 ${result.length} / ${total} 個技能`;
    if (state.tags.size > 1) hint += `（同時具有：${[...state.tags].join('、')}）`;
    hintEl.textContent = hint;
}

// ---------- 事件 ----------
searchEl.addEventListener('input', () => {
    state.keyword = searchEl.value.trim().toLowerCase();
    renderList();
});

clearBtn.addEventListener('click', () => {
    state.tags.clear();
    state.keyword = '';
    searchEl.value = '';
    renderTagFilter();
    renderList();
});

roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        roleTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.role = tab.dataset.role;
        state.tags.clear();
        roleNoteEl.textContent = state.role === 'survivor'
            ? '人類技能整理中，目前只收錄部分技能。'
            : '';
        renderTagFilter();
        renderList();
    });
});

// ---------- 技能詳細視窗 ----------
function openPerk(id) {
    const perk = perkMap[id];
    if (!perk) return;

    pdImage.src = perk.image;
    pdImage.alt = perk.name;
    pdName.textContent = perk.name;
    pdNameEn.textContent = perk.name_en;
    document.getElementById('pd-aliases').innerHTML = aliasHtml(perk);
    pdOwner.textContent = perk.owner;
    pdTags.innerHTML = mainTags(perk).map(tagHtml).join('');

    // 狀態效果獨立一行顯示
    const status = statusTags(perk);
    const pdStatus = document.getElementById('pd-status');
    pdStatus.innerHTML = status.length
        ? `<span class="muted">附加狀態</span>${status.map(tagHtml).join('')}`
        : '';
    pdDesc.textContent = perk.desc;

    // 推薦搭配：自己寫的 + 別的技能把我列為搭配的（雙向顯示，只要寫一邊）
    const synergies = (perk.synergies || []).map(normalizeSynergy);
    const listed = new Set(synergies.map(s => s.id));
    allPerks.forEach(other => {
        (other.synergies || []).map(normalizeSynergy).forEach(s => {
            if (s.id === perk.id && !listed.has(other.id)) {
                synergies.push({ id: other.id, reason: s.reason });
                listed.add(other.id);
            }
        });
    });

    pdSynergies.innerHTML = '';
    const valid = synergies.filter(s => perkMap[s.id]);
    if (!valid.length) {
        pdSynergies.innerHTML = '<p class="muted">搭配建議整理中。</p>';
    }
    valid.forEach(s => {
        const p = perkMap[s.id];
        const item = document.createElement('button');
        item.className = 'synergy-item';
        item.innerHTML = `
            ${diamondHtml(p)}
            <div>
                <h4>${p.name}</h4>
                <p class="muted">${s.reason || p.name_en}</p>
            </div>`;
        item.addEventListener('click', () => openPerk(p.id));
        pdSynergies.appendChild(item);
    });

    modal.classList.add('show');
    modal.querySelector('.perk-modal').scrollTop = 0;
    history.replaceState(null, '', '#' + perk.id);
}

function closePerk() {
    modal.classList.remove('show');
    history.replaceState(null, '', location.pathname);
}

function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!perkMap[id]) return;

    // 如果是人類技能，先切到人類分頁
    if (perkMap[id].role !== state.role) {
        document.querySelector(`.role-tab[data-role="${perkMap[id].role}"]`).click();
    }
    openPerk(id);
}

window.addEventListener('hashchange', openFromHash);
document.getElementById('perk-modal-close').addEventListener('click', closePerk);
modal.addEventListener('click', e => { if (e.target === modal) closePerk(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closePerk(); });
