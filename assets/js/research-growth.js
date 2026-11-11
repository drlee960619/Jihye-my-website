// "How My Research Has Grown" — topic × year dot chart, built from publications.json.
// Clicking a circle filters the publication list below (tab + year + topic).
(function () {
    const box = document.getElementById('growth-chart');
    if (!box) return;

    const RED = '#a51417', GRAY = '#a3a3ab';
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

    // data-count="overlap" (default): a paper counts under every topic it carries, plus an "All papers" row.
    // data-count="primary": a paper counts once, under its first topic.
    const mode = box.dataset.count || 'overlap';

    fetch('publications.json', { cache: 'no-cache' }).then(r => r.json()).then(raw => {
        // Policy briefs and working papers stay in the list but not in the chart (peer-reviewed + under review only)
        const d = Object.assign({}, raw, { papers: raw.papers.filter(p => p.chart !== false) });
        const pillars = d.pillars || [];
        // Only the pillar topics get their own row (data-rows="all" brings back every topic)
        const rows = box.dataset.rows === 'all'
            ? pillars.concat(d.categories.filter(c => !pillars.includes(c)))
            : (pillars.length ? pillars.slice() : d.categories.slice());
        const years = [...new Set(d.papers.filter(p => p.status === 'published').map(p => p.year))].sort((a, b) => a - b);
        const cols = years.map(y => ({ label: String(y), year: String(y), status: 'published' }))
            .concat([{ label: 'Under review', year: '', status: 'under-review' }]);

        const inCol = (p, col) => p.status === col.status && (col.year === '' || String(p.year) === col.year);
        const count = (c, col) => d.papers.filter(p => inCol(p, col) &&
            (mode === 'primary' ? (p.categories || [])[0] === c : (p.categories || []).includes(c))).length;
        const total = col => d.papers.filter(p => inCol(p, col)).length;
        const showTotal = mode === 'overlap';

        const nCols = cols.length, x0 = 330, xEnd = 900, dx = (xEnd - x0) / (nCols - 1);
        const y0 = 72, dy = 50, H = y0 + (rows.length - 1 + (showTotal ? 1.4 : 0)) * dy + 44;
        const o = [`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 ${H}" width="100%" role="img" aria-label="Number of papers by topic and year">`];

        cols.forEach((c, j) => o.push(`<text class="g-yr" x="${x0 + j * dx}" y="40" text-anchor="middle">${c.label}</text>`));
        const sepX = x0 + (nCols - 1.5) * dx;
        o.push(`<line x1="${sepX}" y1="26" x2="${sepX}" y2="${H - 18}" stroke="#ddd" stroke-dasharray="4 4"/>`);
        if (pillars.length && pillars.length < rows.length) {
            const yy = y0 + (pillars.length - 0.5) * dy;
            o.push(`<line x1="70" y1="${yy}" x2="${xEnd + 40}" y2="${yy}" stroke="#eee"/>`);
        }

        rows.forEach((c, i) => {
            const Y = y0 + i * dy, main = pillars.includes(c), col = main ? RED : GRAY;
            o.push(`<line x1="${x0 - 20}" y1="${Y}" x2="${xEnd + 20}" y2="${Y}" stroke="#f1f1f1"/>`);
            o.push(`<text class="g-cat" x="${x0 - 40}" y="${Y + 5}" text-anchor="end" fill="${main ? '#333' : '#888'}">${esc(c)}</text>`);
            cols.forEach((k, j) => {
                const n = count(c, k);
                if (!n) return;
                const X = x0 + j * dx, r = 8 + n * 2.8, ur = k.status === 'under-review';
                o.push(`<g class="g-dot" tabindex="0" role="button" data-cat="${esc(c)}" data-year="${k.year}" data-status="${k.status}"
                    aria-label="${esc(c)}, ${k.label}: ${n} paper${n > 1 ? 's' : ''}">
                    <title>${esc(c)} · ${k.label}: ${n} paper${n > 1 ? 's' : ''}</title>
                    <circle cx="${X}" cy="${Y}" r="${r.toFixed(1)}" fill="${ur ? '#fff' : col}" stroke="${col}" stroke-width="2"/>
                    <text class="g-n" x="${X}" y="${Y + 4}" text-anchor="middle" fill="${ur ? col : '#fff'}">${n}</text></g>`);
            });
        });
        if (showTotal) {
            const Y = y0 + (rows.length - 1 + 1.4) * dy, TC = '#555';
            o.push(`<line x1="70" y1="${Y - dy * 0.65}" x2="${xEnd + 40}" y2="${Y - dy * 0.65}" stroke="#ddd"/>`);
            o.push(`<text class="g-cat" x="${x0 - 40}" y="${Y + 5}" text-anchor="end" fill="${TC}">All papers</text>`);
            cols.forEach((k, j) => {
                const n = total(k); if (!n) return;
                const X = x0 + j * dx, ur = k.status === 'under-review';
                o.push(`<g class="g-dot" tabindex="0" role="button" data-cat="" data-year="${k.year}" data-status="${k.status}"
                    aria-label="All papers, ${k.label}: ${n}"><title>All papers · ${k.label}: ${n}</title>
                    <circle cx="${X}" cy="${Y}" r="${(8 + n * 1.2).toFixed(1)}" fill="${ur ? '#fff' : TC}" stroke="${TC}" stroke-width="2"/>
                    <text class="g-n" x="${X}" y="${Y + 4}" text-anchor="middle" fill="${ur ? TC : '#fff'}">${n}</text></g>`);
            });
        }
        o.push('</svg>');
        box.innerHTML = o.join('');
    }).catch(() => { box.closest('.growth').hidden = true; });

    function apply(g) {
        const q = s => document.querySelector(s);
        const tab = q(`.pub-tab[data-status="${g.dataset.status}"]`); if (tab) tab.click();
        const clear = q('#pub-clear'); if (clear && !clear.hidden) clear.click();
        if (g.dataset.year) { const y = q(`#pub-years [data-value="${g.dataset.year}"]`); if (y) y.click(); }
        if (g.dataset.cat) { const c = q(`#pub-cats [data-value="${CSS.escape(g.dataset.cat)}"]`); if (c) c.click(); }
        const app = document.getElementById('pub-app');
        if (app) app.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    box.addEventListener('click', e => { const g = e.target.closest('.g-dot'); if (g) apply(g); });
    box.addEventListener('keydown', e => {
        const g = e.target.closest('.g-dot');
        if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); apply(g); }
    });
})();
