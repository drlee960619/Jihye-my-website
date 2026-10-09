// Research page: tabbed, searchable, filterable publication list.
// Data lives in /publications.json — edit that file only.
(function () {
    const root = document.getElementById('pub-app');
    if (!root) return;

    const els = {
        tabs: root.querySelectorAll('.pub-tab'),
        search: root.querySelector('#pub-search'),
        years: root.querySelector('#pub-years'),
        cats: root.querySelector('#pub-cats'),
        list: root.querySelector('#pub-list'),
        count: root.querySelector('#pub-count'),
        clear: root.querySelector('#pub-clear'),
        yearBlock: root.querySelector('#pub-year-block')
    };

    const state = { status: 'published', q: '', year: 'all', cats: new Set() };
    let data = { categories: [], papers: [] };

    const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    // Bold "Lee, J." in the author string
    const fmtAuthors = a => esc(a).replace(/Lee, J\./g, '<strong>Lee, J.</strong>');

    function matchesText(p) {
        if (!state.q) return true;
        const hay = (p.title + ' ' + p.authors + ' ' + p.venue + ' ' + (p.categories || []).join(' ')).toLowerCase();
        return state.q.toLowerCase().split(/\s+/).every(t => hay.includes(t));
    }
    const matchesYear = p => state.year === 'all' || String(p.year) === state.year;
    const matchesCats = p => state.cats.size === 0 || (p.categories || []).some(c => state.cats.has(c));

    function inTab() { return data.papers.filter(p => p.status === state.status); }

    function renderFilters() {
        const base = inTab().filter(matchesText);

        // Years (counts respect search + category filters)
        const yBase = base.filter(matchesCats);
        const yearCounts = {};
        yBase.forEach(p => { if (p.year) yearCounts[p.year] = (yearCounts[p.year] || 0) + 1; });
        const years = Object.keys(yearCounts).sort((a, b) => b - a);
        els.yearBlock.hidden = state.status !== 'published';
        els.years.innerHTML =
            chip('all', `All (${yBase.length})`, state.year === 'all', 'year') +
            years.map(y => chip(y, `${y} (${yearCounts[y]})`, state.year === y, 'year')).join('');

        // Categories (counts respect search + year filters)
        const cBase = base.filter(matchesYear);
        els.cats.innerHTML = data.categories.map(c => {
            const n = cBase.filter(p => (p.categories || []).includes(c)).length;
            if (n === 0 && !state.cats.has(c)) return '';
            return chip(c, `${c} (${n})`, state.cats.has(c), 'cat');
        }).join('');

        const active = state.q || state.year !== 'all' || state.cats.size;
        els.clear.hidden = !active;
    }

    function chip(value, label, on, kind) {
        return `<button type="button" class="pub-chip${on ? ' is-on' : ''}" data-kind="${kind}" data-value="${esc(value)}" aria-pressed="${on}">${esc(label)}</button>`;
    }

    function renderList() {
        const rows = inTab().filter(p => matchesText(p) && matchesYear(p) && matchesCats(p))
            .sort((a, b) => (b.year || 0) - (a.year || 0));

        els.count.textContent = `${rows.length} ${rows.length === 1 ? 'paper' : 'papers'}`;

        if (!rows.length) {
            els.list.innerHTML = '<li class="pub-empty">No papers match these filters.</li>';
            return;
        }

        let lastYear = null;
        els.list.innerHTML = rows.map(p => {
            let head = '';
            if (state.status === 'published' && p.year !== lastYear) {
                head = `<li class="pub-year-head">${p.year}</li>`;
                lastYear = p.year;
            }
            const badges = [
                p.type ? `<span class="pub-badge">${esc(p.type)}</span>` : '',
                p.note ? `<span class="pub-badge pub-badge--note">${esc(p.note)}</span>` : ''
            ].join('');
            const title = p.url
                ? `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.title)}</a>`
                : esc(p.title);
            const cite = state.status === 'published'
                ? `${fmtAuthors(p.authors)} (${p.year}). <em>${esc(p.venue)}</em>.`
                : `${fmtAuthors(p.authors)} <em>${esc(p.venue)}</em>.`;
            const tags = (p.categories || []).map(c =>
                `<button type="button" class="pub-tag" data-kind="cat" data-value="${esc(c)}">${esc(c)}</button>`).join('');
            const link = p.url
                ? `<a class="pub-link" href="${esc(p.url)}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> ${p.url.includes('doi.org') ? 'DOI' : 'Link'}</a>`
                : '';
            return `${head}<li class="pub-item">
                <h3 class="pub-title">${badges}${title}</h3>
                <p class="pub-cite">${cite}</p>
                <div class="pub-meta">${tags}${link}</div>
            </li>`;
        }).join('');
    }

    function render() { renderFilters(); renderList(); }

    // Events
    els.tabs.forEach(t => t.addEventListener('click', () => {
        state.status = t.dataset.status;
        state.year = 'all';
        els.tabs.forEach(x => {
            const on = x === t;
            x.classList.toggle('is-on', on);
            x.setAttribute('aria-selected', on);
        });
        render();
    }));

    els.search.addEventListener('input', e => { state.q = e.target.value.trim(); render(); });

    root.addEventListener('click', e => {
        const b = e.target.closest('[data-kind]');
        if (!b) return;
        const v = b.dataset.value;
        if (b.dataset.kind === 'year') state.year = v;
        if (b.dataset.kind === 'cat') {
            // Tag inside a paper always selects just that category
            if (b.classList.contains('pub-tag')) { state.cats = new Set([v]); }
            else state.cats.has(v) ? state.cats.delete(v) : state.cats.add(v);
        }
        render();
    });

    els.clear.addEventListener('click', () => {
        state.q = ''; state.year = 'all'; state.cats.clear();
        els.search.value = '';
        render();
    });

    fetch('publications.json', { cache: 'no-cache' })
        .then(r => r.json())
        .then(d => {
            data = d;
            const nPub = d.papers.filter(p => p.status === 'published').length;
            const nUr = d.papers.filter(p => p.status === 'under-review').length;
            root.querySelector('[data-status="published"] .pub-tab-n').textContent = nPub;
            root.querySelector('[data-status="under-review"] .pub-tab-n').textContent = nUr;
            render();
        })
        .catch(() => {
            els.list.innerHTML = '<li class="pub-empty">Could not load publications.</li>';
        });
})();
