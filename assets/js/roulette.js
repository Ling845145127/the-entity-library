// =========================================
// 技能拉霸：隨機抽 4 個不重複技能，可鎖定、可限定標籤
// =========================================
const SLOT_COUNT = 4;

const slotRow = document.getElementById('slot-row');
const rollBtn = document.getElementById('roll-btn');
const rollMsg = document.getElementById('roll-msg');
const poolTagsEl = document.getElementById('pool-tags');
const poolHint = document.getElementById('pool-hint');
const comboSection = document.getElementById('combo-section');
const comboList = document.getElementById('combo-list');
const roleTabs = document.querySelectorAll('.role-tab');

const state = {
    role: 'killer',
    tags: new Set(),                       // 只抽含有這些標籤的技能（任一符合即可）
    slots: Array(SLOT_COUNT).fill(null),   // 每格目前的技能
    locked: Array(SLOT_COUNT).fill(false), // 每格是否鎖定
    spinning: false
};

let allPerks = [];

loadPerks()
    .then(result => {
        allPerks = result.allPerks;
        renderPoolTags();
        renderSlots();
    })
    .catch(err => console.error('抓取技能資料失敗:', err));

// ---------- 抽取範圍 ----------
function getPool() {
    return allPerks.filter(p => {
        if (p.role !== state.role) return false;
        if (state.tags.size === 0) return true;
        return [...state.tags].some(t => hasTag(p, t));
    });
}

function renderPoolTags() {
    // 只列出用途和類型標籤（狀態效果太細，拉霸用不到）
    const used = new Set();
    allPerks.filter(p => p.role === state.role).forEach(p => {
        mainTags(p).forEach(t => used.add(t));
        if (statusTags(p).length) used.add('減益');
    });
    const tags = [...used].sort((a, b) => tagRank(a) - tagRank(b));

    poolTagsEl.innerHTML = '';
    tags.forEach(tag => {
        const btn = document.createElement('button');
        btn.className = 'tag tag-btn' + (state.tags.has(tag) ? ' active' : '');
        btn.textContent = tag;
        if (TAG_INFO[tag]) btn.title = TAG_INFO[tag];
        btn.addEventListener('click', () => {
            state.tags.has(tag) ? state.tags.delete(tag) : state.tags.add(tag);
            btn.classList.toggle('active');
            updatePoolHint();
        });
        poolTagsEl.appendChild(btn);
    });
    updatePoolHint();
}

function updatePoolHint() {
    const n = getPool().length;
    poolHint.textContent = state.tags.size
        ? `從含有「${[...state.tags].join('、')}」任一標籤的 ${n} 個技能中抽取`
        : `從全部 ${n} 個技能中抽取，可以點上面的標籤縮小範圍`;
}

// ---------- 拉霸格 ----------
function renderSlots() {
    slotRow.innerHTML = '';
    state.slots.forEach((perk, i) => {
        const slot = document.createElement('div');
        slot.className = 'slot' + (state.locked[i] ? ' locked' : '');

        const body = perk
            ? `<a class="slot-perk" href="perks.html#${perk.id}" title="到技能百科看詳細說明">
                   ${diamondHtml(perk)}
                   <h3>${perk.name}</h3>
                   <p class="muted">${perk.owner}</p>
               </a>
               <div class="tag-list">${mainTags(perk).map(tagHtml).join('')}</div>`
            : `<div class="slot-perk">
                   <div class="perk-image-wrapper slot-empty">
                       <img src="assets/images/perks/bg.png" alt="" class="diamond-bg">
                       <span>?</span>
                   </div>
                   <h3 class="muted">尚未抽取</h3>
               </div>`;

        slot.innerHTML = body + `
            <button class="btn btn-ghost btn-sm lock-btn" ${perk ? '' : 'disabled'}>
                ${state.locked[i] ? '🔒 已鎖定' : '🔓 鎖定'}
            </button>`;

        slot.querySelector('.lock-btn').addEventListener('click', () => {
            state.locked[i] = !state.locked[i];
            renderSlots();
        });

        slotRow.appendChild(slot);
    });
}

// ---------- 抽獎 ----------
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function roll() {
    if (state.spinning) return;

    const lockedIds = state.slots.filter((p, i) => p && state.locked[i]).map(p => p.id);
    const pool = getPool().filter(p => !lockedIds.includes(p.id));
    const need = state.locked.filter((l, i) => !(l && state.slots[i])).length;

    if (need === 0) {
        rollMsg.textContent = '四格都鎖定了，先解鎖一格再抽。';
        return;
    }
    if (pool.length < need) {
        const lockedNote = lockedIds.length ? '（不含已鎖定的技能）' : '';
        const tip = state.role === 'survivor' && state.tags.size === 0
            ? '人類技能還在整理中，之後會補上更多。'
            : '請多選幾個標籤來擴大範圍，或取消所有標籤。';
        rollMsg.textContent = `範圍內只有 ${pool.length} 個技能${lockedNote}，不夠抽 ${need} 格。${tip}`;
        return;
    }
    rollMsg.textContent = '';

    // 先決定結果，再播動畫
    const picks = shuffle(pool).slice(0, need);
    const result = state.slots.map((p, i) => (p && state.locked[i]) ? p : picks.shift());

    state.spinning = true;
    rollBtn.disabled = true;
    comboSection.classList.remove('show');

    const slotEls = slotRow.querySelectorAll('.slot');
    const allOfRole = allPerks.filter(p => p.role === state.role);
    let stopped = 0;

    result.forEach((perk, i) => {
        if (state.locked[i] && state.slots[i]) { stopped++; return; }

        const slotEl = slotEls[i];
        slotEl.classList.add('spinning');
        const wrapper = slotEl.querySelector('.perk-image-wrapper');
        wrapper.classList.remove('slot-empty');
        wrapper.innerHTML = `
            <img src="assets/images/perks/bg.png" alt="" class="diamond-bg">
            <img src="" alt="" class="perk-icon">`;
        const icon = wrapper.querySelector('.perk-icon');
        const title = slotEl.querySelector('h3');
        title.textContent = '抽取中…';
        title.classList.add('muted');

        // 快速輪播圖示
        const timer = setInterval(() => {
            icon.src = allOfRole[Math.floor(Math.random() * allOfRole.length)].image;
        }, 80);

        // 從左到右依序停下
        setTimeout(() => {
            clearInterval(timer);
            state.slots[i] = perk;
            stopped++;
            if (stopped === SLOT_COUNT) finishRoll();
            else updateSingleSlot(i);
        }, 700 + i * 300);
    });

    if (stopped === SLOT_COUNT) finishRoll();
}

// 單格停下時先換成結果，其他格繼續轉
function updateSingleSlot(i) {
    const slotEl = slotRow.querySelectorAll('.slot')[i];
    const perk = state.slots[i];
    slotEl.classList.remove('spinning');
    slotEl.classList.add('landed');
    slotEl.querySelector('.perk-icon').src = perk.image;
    slotEl.querySelector('h3').textContent = perk.name;
    slotEl.querySelector('h3').classList.remove('muted');
}

function finishRoll() {
    state.spinning = false;
    rollBtn.disabled = false;
    renderSlots();
    slotRow.querySelectorAll('.slot').forEach((el, i) => {
        if (!state.locked[i]) el.classList.add('landed');
    });
    renderCombos();
}

// ---------- 搭配提示 ----------
function renderCombos() {
    const pairs = findSynergyPairs(state.slots.filter(Boolean));

    comboList.innerHTML = pairs.length
        ? pairs.map(({ a, b, reason }) => `
            <div class="combo-item">
                <div class="combo-icons">${diamondHtml(a)}<span class="combo-plus">+</span>${diamondHtml(b)}</div>
                <div>
                    <h3>${a.name} ＋ ${b.name}</h3>
                    <p class="muted">${reason || '這兩個技能互相搭配。'}</p>
                </div>
            </div>`).join('')
        : '<p class="muted">這組沒有特別的搭配，試著鎖定喜歡的技能再抽一次。</p>';

    comboSection.classList.add('show');
}

// ---------- 事件 ----------
rollBtn.addEventListener('click', roll);

roleTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        if (state.spinning) return;
        roleTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.role = tab.dataset.role;
        state.tags.clear();
        state.slots.fill(null);
        state.locked.fill(false);
        rollMsg.textContent = '';
        comboSection.classList.remove('show');
        renderPoolTags();
        renderSlots();
    });
});
