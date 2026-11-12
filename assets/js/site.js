// =========================================
// 全站共用的小巧思：換頁迷霧轉場、回到頂端按鈕
// =========================================
(function () {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const LEAVE_MS = 350; // 迷霧蓋上的時間，要和 CSS 的 fog-in 一致

    // ---------- 換頁轉場：點站內連結時先讓迷霧蓋上，再換頁 ----------
    document.addEventListener('click', e => {
        const link = e.target.closest('a[href]');
        if (!link || reduceMotion) return;

        // 這些情況照瀏覽器原本的行為：新分頁、按住 Ctrl/Cmd、站外連結、同頁錨點
        if (link.target === '_blank' || e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;
        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname && url.hash) return;

        e.preventDefault();
        root.classList.add('is-leaving');
        setTimeout(() => { location.href = url.href; }, LEAVE_MS);
    });

    // 按「上一頁」回來時，瀏覽器可能直接還原舊畫面，要把迷霧拿掉
    window.addEventListener('pageshow', e => {
        if (e.persisted) root.classList.remove('is-leaving');
    });

    // ---------- 回到頂端按鈕 ----------
    const topBtn = document.createElement('button');
    topBtn.className = 'btn btn-ghost back-to-top';
    topBtn.setAttribute('aria-label', '回到頂端');
    topBtn.textContent = '↑';
    topBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(topBtn);
        // 首頁右下角已經有拉霸按鈕，回到頂端按鈕往上疊
        if (document.querySelector('.fab-roulette')) topBtn.classList.add('above-fab');
        updateTopBtn();
    });

    function updateTopBtn() {
        topBtn.classList.toggle('show', window.scrollY > 600);
    }
    window.addEventListener('scroll', updateTopBtn, { passive: true });
})();
