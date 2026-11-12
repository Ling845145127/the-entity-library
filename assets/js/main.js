// =========================================
// 每週手動更新這裡：秘密聖所的四個技能 id（對應 perks.json）
// =========================================
const shrinePerkIds = ['smash-hit', 'power-struggle', '殺手技能id', '殺手技能id'];

// 新手入門第 4 張卡片：新手萬用配裝
const beginnerBuildIds = ['corrupt-intervention', 'pain-resonance', 'alien-instinct', 'blood-warden'];

// 抓取 DOM 元素
const shrineGrid = document.getElementById('shrine-grid');
const beginnerGrid = document.getElementById('beginner-build');
const countdownEl = document.getElementById('shrine-countdown');
const tooltip = document.getElementById('js-tooltip');
const ttName = document.getElementById('tt-name');
const ttOwner = document.getElementById('tt-owner');
const ttTags = document.getElementById('tt-tags');
const ttDesc = document.getElementById('tt-desc');

let perkMap = {}; // 用 id 快速查詢技能：perkMap['dead-hard']

fetch('assets/perks.json')
    .then(response => response.json())
    .then(data => {
        data.forEach(perk => { perkMap[perk.id] = perk; });

        renderPerks(shrineGrid, shrinePerkIds);
        renderPerks(beginnerGrid, beginnerBuildIds);
    })
    .catch(error => console.error('抓取技能資料失敗:', error));

// 依照 id 清單，把技能畫進指定的容器
function renderPerks(container, ids) {
    if (!container) return;

    container.innerHTML = '';
    ids.forEach(id => {
        const perk = perkMap[id];
        if (!perk) {
            console.warn(`perks.json 找不到技能：${id}`);
            return;
        }

        const item = document.createElement('div');
        item.className = 'perk-item';
        item.innerHTML = `
            <div class="perk-image-wrapper">
                <img src="assets/images/perks/bg.png" alt="" class="diamond-bg">
                <img src="${perk.image}" alt="${perk.name}" class="perk-icon">
            </div>
            <p>${perk.name}</p>
        `;
        bindTooltip(item, perk);
        container.appendChild(item);
    });
}

// 滑鼠移入技能時顯示提示框，並跟著游標移動
function bindTooltip(item, perk) {
    item.addEventListener('mouseenter', () => {
        ttName.textContent = `${perk.name}（${perk.name_en}）`;
        ttOwner.textContent = perk.owner;
        ttDesc.textContent = perk.desc;
        ttTags.innerHTML = (perk.tags || []).map(tag => `<span class="tag">${tag}</span>`).join('');
        tooltip.classList.add('show');
    });

    item.addEventListener('mousemove', (e) => {
        // 靠近螢幕右邊或下面時，提示框改到游標另一側，避免超出畫面
        const pad = 15;
        let x = e.clientX + pad;
        let y = e.clientY + pad;
        if (x + tooltip.offsetWidth > window.innerWidth) x = e.clientX - tooltip.offsetWidth - pad;
        if (y + tooltip.offsetHeight > window.innerHeight) y = e.clientY - tooltip.offsetHeight - pad;
        tooltip.style.left = x + 'px';
        tooltip.style.top = y + 'px';
    });

    item.addEventListener('mouseleave', () => {
        tooltip.classList.remove('show');
    });
}

// =========================================
// 秘密聖所倒數：每週二 00:00 (UTC) 刷新，也就是台灣時間週二早上 8 點
// =========================================
function getNextShrineReset() {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const daysUntilTuesday = (2 - next.getUTCDay() + 7) % 7; // 週二 = 2
    next.setUTCDate(next.getUTCDate() + daysUntilTuesday);
    if (next <= now) next.setUTCDate(next.getUTCDate() + 7);
    return next;
}

function updateCountdown() {
    if (!countdownEl) return;

    const diff = getNextShrineReset() - new Date();
    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor(totalSeconds % 86400 / 3600);
    const minutes = Math.floor(totalSeconds % 3600 / 60);
    const seconds = totalSeconds % 60;
    const pad = n => String(n).padStart(2, '0');

    countdownEl.textContent = `${days} 天 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

updateCountdown();
setInterval(updateCountdown, 1000);
