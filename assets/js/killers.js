// =========================================
// 殺手圖鑑：資料來自 killers.json，傳承技能自動從 perks.json 抓
// =========================================
const grid = document.getElementById('killers-grid');
const modal = document.getElementById('killer-modal');
const closeModalBtn = document.getElementById('close-modal');

const mPortrait = document.getElementById('m-portrait');
const mName = document.getElementById('m-name');
const mNameEn = document.getElementById('m-name-en');
const mAliases = document.getElementById('m-aliases');
const mTerror = document.getElementById('m-terror');
const mSpeed = document.getElementById('m-speed');
const mSize = document.getElementById('m-size');
const mPowerName = document.getElementById('m-power-name');
const mPowerDesc = document.getElementById('m-power-desc');
const mPowerIcon = document.getElementById('m-power-icon');
const mPerksContainer = document.getElementById('m-perks-container');
const radarCanvas = document.getElementById('m-radar');
const radarEmpty = document.getElementById('radar-empty');

const PENDING = '整理中';
let killerChart = null;
let perksByFolder = {}; // 'Wraith' → [技能, 技能, 技能]

Promise.all([
    fetch('assets/killers.json').then(res => res.json()),
    loadPerks()
])
    .then(([killers, { allPerks }]) => {
        // 依圖片資料夾把技能分給每位殺手
        allPerks.forEach(perk => {
            const m = perk.image.match(/perks\/killers\/([^/]+)\//);
            if (!m) return;
            (perksByFolder[m[1]] = perksByFolder[m[1]] || []).push(perk);
        });

        killers.forEach(killer => grid.appendChild(createKillerCard(killer)));
        openFromHash(killers);
    })
    .catch(err => console.error('抓取殺手資料失敗:', err));

// 「幽靈殺手 (The Wraith)」→ ['幽靈殺手', 'The Wraith']
function splitName(name) {
    const m = name.match(/^(.*?)\s*\((.*)\)\s*$/);
    return m ? [m[1], m[2]] : [name, ''];
}

// ---------- 網格卡片 ----------
function createKillerCard(killer) {
    const card = document.createElement('button');
    card.className = 'killer-card';
    card.innerHTML = `
        <div class="killer-image-wrapper">
            <img src="assets/images/chara/bg.png" alt="" class="killer-bg">
            <img src="assets/images/chara/killer-bg.png" alt="" class="killer-faction">
            <img src="${killer.icon}" alt="${killer.name}" class="killer-icon" loading="lazy">
        </div>
        <span class="killer-card-name">${splitName(killer.name)[0]}</span>`;
    card.addEventListener('click', () => openKiller(killer));
    return card;
}

// ---------- 詳細視窗 ----------
function openKiller(killer) {
    const [zh, en] = splitName(killer.name);
    mPortrait.src = killer.portrait;
    mPortrait.alt = zh;
    mName.textContent = zh;
    mNameEn.textContent = en;
    mAliases.textContent = killer.aliases.length ? `別稱：${killer.aliases.join('、')}` : '';
    mSpeed.textContent = killer.speed || PENDING;
    mTerror.textContent = killer.terror_radius || PENDING;
    mSize.textContent = killer.size || PENDING;
    mPowerName.textContent = killer.power_name || '能力介紹';
    mPowerDesc.textContent = killer.power_desc || '能力介紹整理中。';
    mPowerIcon.src = killer.power_icon || '';
    mPowerIcon.alt = killer.power_name || '';
    mPowerIcon.parentElement.style.display = killer.power_icon ? '' : 'none';

    // 傳承技能：點擊前往技能百科
    mPerksContainer.innerHTML = '';
    (perksByFolder[killer.folder] || []).forEach(perk => {
        const a = document.createElement('a');
        a.className = 'm-perk';
        a.href = `perks.html#${perk.id}`;
        a.title = `${perk.name}：到技能百科看說明`;
        a.innerHTML = `${diamondHtml(perk)}<span>${perk.name}</span>`;
        mPerksContainer.appendChild(a);
    });

    modal.classList.add('show');
    modal.querySelector('.large-modal').scrollTop = 0;
    history.replaceState(null, '', '#' + killer.id);
    drawRadarChart(killer.stats);
}

function closeKiller() {
    modal.classList.remove('show');
    history.replaceState(null, '', location.pathname);
}

function openFromHash(killers) {
    const id = location.hash.slice(1);
    const killer = killers.find(k => k.id === id);
    if (killer) openKiller(killer);
}

closeModalBtn.addEventListener('click', closeKiller);
modal.addEventListener('click', e => { if (e.target === modal) closeKiller(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) closeKiller(); });

// ---------- 雷達圖 ----------
function drawRadarChart(stats) {
    if (killerChart) {
        killerChart.destroy();
        killerChart = null;
    }

    // 還沒評分：顯示提示，不畫圖
    radarEmpty.style.display = stats ? 'none' : 'flex';
    radarCanvas.style.display = stats ? 'block' : 'none';
    if (!stats || typeof Chart === 'undefined') return;

    const css = getComputedStyle(document.documentElement);
    killerChart = new Chart(radarCanvas.getContext('2d'), {
        type: 'radar',
        data: {
            labels: ['追逐', '巡場', '控場', '情報', '隱蔽'],
            datasets: [{
                label: '能力評分',
                data: stats,
                backgroundColor: 'rgba(163, 18, 27, 0.45)',
                borderColor: css.getPropertyValue('--c-red-light').trim(),
                pointBackgroundColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 800, easing: 'easeOutQuart' },
            scales: {
                r: {
                    min: 0,
                    max: 5,
                    ticks: { display: false, stepSize: 1 },
                    angleLines: { color: 'rgba(255, 255, 255, 0.15)' },
                    grid: { color: 'rgba(255, 255, 255, 0.15)' },
                    pointLabels: {
                        color: css.getPropertyValue('--c-text').trim(),
                        font: { size: 16, family: css.getPropertyValue('--font').trim() }
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: ctx => ` ${ctx.raw} / 5` } }
            }
        }
    });
}
