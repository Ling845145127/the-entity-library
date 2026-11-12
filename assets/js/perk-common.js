// =========================================
// 技能百科、技能拉霸共用的設定與小工具
// 改標籤分組或說明，只要改這個檔案
// =========================================

// =========================================
// 標籤分組與說明
// - 分組決定篩選區的排列；沒列在任何分組的新標籤會自動放進「其他」
// - 說明會顯示在「標籤說明」區塊，滑鼠移到標籤上也看得到
// =========================================
const TAG_GROUPS = [
    {
        name: '用途',
        tags: {
            '控機': '讓發電機進度倒退，或暫時封鎖發電機',
            '反修機': '降低人類修理發電機的速度',
            '追逐': '幫助你在追逐中更快擊倒人類',
            '氣場': '看見人類的光環，知道確切位置與狀態，可以直接前往或遠程攻擊',
            '情報': '提示附近有人類或人類正在做什麼，但不會告訴你確切位置',
            '隱蔽': '讓人類更難察覺你的接近，例如縮小恐懼範圍',
            '終局': '在發電機全部修好、大門通電後才發揮作用',
            '減益': '對人類施加負面狀態（細項見下方狀態效果）',
            '反治療': '讓人類治療變慢或無法治療',
            '增益': '強化殺手自身，例如加快動作或移動速度'
        }
    },
    {
        name: '類型',
        tags: {
            '厄咒': '綁定在地圖上的圖騰，圖騰被人類淨化後技能就會失效',
            '天災鉤': '地圖上會出現特殊的白色鉤子，把人類掛在這些鉤子上才會觸發效果',
            '血祭品': '每局會隨機指定一位人類為血祭品（又稱獵物），這類技能的效果和血祭品有關'
        }
    },
    {
        name: '狀態效果',
        advanced: true, // 進階篩選：預設收起
        tags: {
            '暴露': '人類只要再被攻擊一次就會直接倒地',
            '疲勞': '人類暫時無法使用衝刺類技能',
            '不治': '人類無法被治療',
            '減速': '人類的移動速度變慢',
            '障目': '人類看不見任何光環',
            '渾然不覺': '人類聽不到你的心跳聲，察覺不到你接近',
            '出血': '受傷的人類會留下更多血跡，治療進度會倒退',
            '重傷': '人類的治療速度變慢'
        }
    }
];

// 由分組整理出：標籤 → 說明、標籤 → 分組
const TAG_INFO = {};
const TAG_GROUP_OF = {};
TAG_GROUPS.forEach(g => Object.entries(g.tags).forEach(([tag, info]) => {
    TAG_INFO[tag] = info;
    TAG_GROUP_OF[tag] = g.name;
}));
const STATUS_TAGS = Object.keys(TAG_GROUPS.find(g => g.name === '狀態效果').tags);

const TAG_RANK = TAG_GROUPS.flatMap(g => Object.keys(g.tags));
function tagRank(tag) {
    const i = TAG_RANK.indexOf(tag);
    return i === -1 ? 999 : i;
}

// ---------- 小工具 ----------
function tagHtml(tag) {
    const title = TAG_INFO[tag] ? ` title="${TAG_INFO[tag]}"` : '';
    return `<span class="tag"${title}>${tag}</span>`;
}

function diamondHtml(perk) {
    return `
        <div class="perk-image-wrapper">
            <img src="assets/images/perks/bg.png" alt="" class="diamond-bg">
            <img src="${perk.image}" alt="${perk.name}" class="perk-icon">
        </div>`;
}

// 把標籤拆成「主要標籤」（用途、類型、其他）和「狀態效果」
function mainTags(perk) { return perk.tags.filter(t => !STATUS_TAGS.includes(t)); }
function statusTags(perk) { return perk.tags.filter(t => STATUS_TAGS.includes(t)); }

// 篩選用：有任何狀態效果的技能，也算有「減益」
function hasTag(perk, tag) {
    if (perk.tags.includes(tag)) return true;
    return tag === '減益' && statusTags(perk).length > 0;
}

// 別稱：有填才顯示「又稱：A、B」
function aliasHtml(perk) {
    const aliases = perk.aliases || [];
    return aliases.length ? `<p class="perk-alias">又稱：${aliases.join('、')}</p>` : '';
}

// 推薦搭配可以寫成 "id" 或 { "id": "...", "reason": "..." }
function normalizeSynergy(s) {
    return typeof s === 'string' ? { id: s, reason: '' } : s;
}

// 讀取 perks.json，整理好標籤順序後回傳 { allPerks, perkMap }
function loadPerks() {
    return fetch('assets/perks.json')
        .then(res => res.json())
        .then(data => {
            const perkMap = {};
            data.forEach(p => {
                p.tags = p.tags || [];
                // 標籤照分組順序排列（用途 → 類型 → 狀態效果 → 其他）
                p.tags.sort((a, b) => tagRank(a) - tagRank(b));
                perkMap[p.id] = p;
            });
            return { allPerks: data, perkMap };
        });
}

// 找出一組技能裡互相搭配的組合（兩邊誰寫了搭配都算）
// 回傳 [{ a: 技能, b: 技能, reason: '...' }]
function findSynergyPairs(perks) {
    const ids = new Set(perks.map(p => p.id));
    const pairs = [];
    const seen = new Set();
    perks.forEach(a => {
        (a.synergies || []).map(normalizeSynergy).forEach(s => {
            if (!ids.has(s.id)) return;
            const key = [a.id, s.id].sort().join('|');
            if (seen.has(key)) return;
            seen.add(key);
            pairs.push({ a, b: perks.find(p => p.id === s.id), reason: s.reason });
        });
    });
    return pairs;
}
