/* ============================================================================
   My Research Network — auto-built from network.json
   ----------------------------------------------------------------------------
   이 파일은 수정할 필요가 없습니다. 논문 추가/수정은 network.json 에서만 하세요.
   - 연결선(links)은 각 논문의 areas / keywords 값에서 자동 생성됩니다.
   - 키워드 노드는 같은 키워드가 keywordMinPapers 편 이상 쌓이면 자동 생성됩니다.
   - 노드는 Research area 와 Paper 두 종류뿐이고, 글자는 Research area 에만 붙습니다.
   - 연결선은 각 논문의 map 배열에 적힌 큰 주제 이름으로만 만들어집니다.
   - keywords 는 논문 고유 키워드이며 화면에는 나오지 않습니다(showKeywordNodes 를 켜면 노드로 등장).
   ========================================================================== */
(function () {
  "use strict";

  // 노드 종류는 두 가지뿐: Research area / Paper
  var DEFAULT_PALETTE = {
    core: "#a51417", coreStroke: "#7a0e11", coreText: "#ffffff",
    area: "#4a0810", areaStroke: "#2a040a", areaText: "#ffffff",
    paper: "#c4c4cb", paperStroke: "#9e9ea7", paperLabel: "#1a1a1a",
    link: "#e6e6ea", linkHighlight: "#a51417"
  };
  var R_KW = 18, R_PAPER = 14;
  var C_CORE, S_CORE, C_AREA, S_AREA, C_KW, S_KW;

  var el = document.getElementById("network-container");
  if (!el || typeof d3 === "undefined") return;

  fetch("network.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("network.json " + r.status); return r.json(); })
    .then(build)
    .catch(function (err) {
      console.error("[Research Network]", err);
      el.innerHTML = '<div style="padding:40px;text-align:center;color:#7a5060;font-family:Segoe UI,sans-serif;font-size:.85rem">' +
                     "Research network could not be loaded.</div>";
    });

  /* ---------------------------------------------------------------------- */
  function build(DATA) {
    var P = DATA.palette || {};
    Object.keys(DEFAULT_PALETTE).forEach(function (k) { if (!P[k]) P[k] = DEFAULT_PALETTE[k]; });
    if (!P.coreText)   P.coreText = P.areaText || "#ffffff";
    if (!P.paperLabel) P.paperLabel = P.paperStroke;
    C_CORE = P.core;  S_CORE = P.coreStroke;
    C_AREA = P.area;  S_AREA = P.areaStroke;
    C_KW   = P.paper; S_KW   = P.paperStroke;
    // 팔레트를 CSS 변수로 노출 (제목까지 같은 색을 쓰도록 섹션 전체에 지정)
    var scope = el.closest ? (el.closest(".network-section") || el) : el;
    scope.style.setProperty("--rn-link", P.link);
    scope.style.setProperty("--rn-highlight", P.linkHighlight);
    scope.style.setProperty("--rn-accent", P.area);
    scope.style.setProperty("--rn-deep", P.core);

    var showKeywordNodes = DATA.showKeywordNodes === true;

    var esc = function (s) {
      return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
      });
    };

    /* ---- nodes: areas (중심 노드 없음 — core:true 인 분야가 가운데로 모임) ---- */
    var areaByLabel = {};
    var areas = (DATA.areas || []).map(function (a, i) {
      var n = { id: "A" + i, type: "area", label: a.label, display: a.display || a.label,
                desc: a.desc || "", r: a.r || 38, core: !!a.core };
      areaByLabel[a.label] = n;
      return n;
    });
    var coreAreas = areas.filter(function (a) { return a.core; });
    var fallbackArea = coreAreas[0] || areas[0] || null;

    /* ---- nodes: papers (ids auto-assigned, no manual bookkeeping) ---- */
    var papers = (DATA.papers || []).map(function (p, i) {
      return {
        id: "P" + i, type: "paper", display: "",
        title: p.title, doi: p.doi || null,
        map: p.map || [], keywords: p.keywords || [], r: R_PAPER
      };
    });

    /* ---- keyword nodes: auto-promoted once used by N+ papers ---- */
    var minP = DATA.keywordMinPapers || 3;
    var kwMeta = {};
    (DATA.keywords || []).forEach(function (k) { kwMeta[k.label] = k; });

    var kwPapers = {};
    papers.forEach(function (p) {
      p.keywords.forEach(function (k) { (kwPapers[k] = kwPapers[k] || []).push(p); });
    });

    var kwByLabel = {}, keywords = [], ki = 0;
    Object.keys(kwPapers).forEach(function (label) {
      var n = kwPapers[label].length;
      var meta = kwMeta[label];
      if (!showKeywordNodes) return;
      if (!(n >= minP || (meta && meta.always))) return;
      var node = {
        id: "K" + (ki++), type: "keyword", label: label,
        display: "",
        name: (meta && meta.display) || label,
        desc: (meta && meta.desc) || (n + " papers in this area."),
        count: n, r: R_KW
      };
      kwByLabel[label] = node;
      keywords.push(node);
    });

    var allNodes = [].concat(areas, keywords, papers);
    var byId = {};
    allNodes.forEach(function (n) { byId[n.id] = n; });

    /* ---- links: fully derived ---- */
    var seen = {}, rawLinks = [];
    function addLink(s, t) {
      if (!s || !t || s === t) return;
      var key = s < t ? s + "|" + t : t + "|" + s;
      if (seen[key]) return;
      seen[key] = 1;
      rawLinks.push({ source: s, target: t });
    }

    (DATA.areaLinks || []).forEach(function (pair) {
      var a = areaByLabel[pair[0]], b = areaByLabel[pair[1]];
      if (a && b) addLink(a.id, b.id);
    });

    papers.forEach(function (p) {
      var attached = 0;
      p.map.forEach(function (label) {          // ★ 선은 map 에서만 만들어집니다
        var a = areaByLabel[label];
        if (a) { addLink(a.id, p.id); attached++; }
      });
      p.keywords.forEach(function (label) {     // 키워드 노드를 켜 둔 경우에만
        var k = kwByLabel[label];
        if (k) { addLink(k.id, p.id); attached++; }
      });
      if (!attached && fallbackArea) addLink(fallbackArea.id, p.id); // 고아 노드 방지
    });

    // keyword -> area, where the keyword co-occurs with that area in 2+ papers
    keywords.forEach(function (k) {
      var tally = {};
      kwPapers[k.label].forEach(function (p) {
        p.map.forEach(function (a) { if (areaByLabel[a]) tally[a] = (tally[a] || 0) + 1; });
      });
      var labels = Object.keys(tally).sort(function (a, b) { return tally[b] - tally[a]; });
      var linked = 0;
      labels.forEach(function (label) {
        if (tally[label] >= 2 && areaByLabel[label]) { addLink(areaByLabel[label].id, k.id); linked++; }
      });
      if (!linked && labels.length && areaByLabel[labels[0]]) addLink(areaByLabel[labels[0]].id, k.id);
    });

    var allLinks = rawLinks.map(function (l) { return { source: l.source, target: l.target }; });

    /* ---- D3 render ---- */
    var W = el.clientWidth || 920;
    var H = el.clientHeight || 700;

    var svg = d3.select(el).append("svg").attr("width", W).attr("height", H)
      .call(d3.zoom().scaleExtent([0.25, 4]).on("zoom", function (e) { g.attr("transform", e.transform); }));
    svg.append("rect").attr("width", W).attr("height", H).attr("fill", "#ffffff");
    var g = svg.append("g");

    var sim = d3.forceSimulation(allNodes)
      .force("link", d3.forceLink(allLinks).id(function (d) { return d.id; }).distance(function (d) {
        var s = d.source.type, t = d.target.type;
        if (s === "area" && t === "area") return 175;
        if (s === "area" || t === "area") return 125;
        if (s === "keyword" || t === "keyword") return 95;
        return 80;
      }).strength(0.4))
      .force("charge", d3.forceManyBody().strength(function (d) {
        return d.type === "area" ? (d.core ? -1000 : -680) : d.type === "keyword" ? -330 : -150;
      }))
      .force("center", d3.forceCenter(W / 2, H / 2))
      .force("collision", d3.forceCollide(function (d) { return (d.r || 20) + 14; }))
      .force("x", d3.forceX(W / 2).strength(function (d) { return d.core ? 0.22 : 0.035; }))
      .force("y", d3.forceY(H / 2).strength(function (d) { return d.core ? 0.24 : 0.05; }));

    var link = g.append("g").selectAll("line").data(allLinks).join("line").attr("class", "rn-link");

    var node = g.append("g").selectAll("g").data(allNodes).join("g")
      .attr("class", function (d) { return "rn-node " + d.type + "-node"; })
      .attr("data-role", function (d) {
        return d.type === "area" ? (d.core ? "core" : "area") : d.type === "keyword" ? "keyword" : "paper";
      })
      .style("cursor", function (d) { return d.doi ? "pointer" : "default"; })
      .call(d3.drag()
        .on("start", function (e, d) { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on("drag", function (e, d) { d.fx = e.x; d.fy = e.y; })
        .on("end", function (e, d) { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

    function isArea(d) { return d.type === "area"; }
    function fillOf(d)   { return isArea(d) ? (d.core ? C_CORE : C_AREA) : C_KW; }
    function strokeOf(d) { return isArea(d) ? (d.core ? S_CORE : S_AREA) : S_KW; }
    function opOf(d)     { return isArea(d) ? (d.core ? 0.92 : 0.85) : 0.75; }

    node.append("circle")
      .attr("r", function (d) { return d.r || 20; })
      .attr("fill", fillOf).attr("fill-opacity", opOf)
      .attr("stroke", strokeOf).attr("stroke-width", 1.8);

    // 원 안에 들어가도록 줄바꿈 + 글자 크기를 자동 조정
    function fitLines(label, radius, baseSize) {
      var manual = label.split("\n");
      var maxW = radius * 1.72;
      for (var fs = baseSize; fs >= 6.5; fs -= 0.5) {
        var cw = fs * 0.56;                       // 대략적인 글자 폭
        var maxChars = Math.max(3, Math.floor(maxW / cw));
        var lines = [];
        var ok = true;
        for (var m = 0; m < manual.length; m++) {
          var words = manual[m].split(/\s+/), cur = "";
          for (var i = 0; i < words.length; i++) {
            if (words[i].length > maxChars) { ok = false; break; }
            var next = cur ? cur + " " + words[i] : words[i];
            if (next.length <= maxChars) cur = next;
            else { lines.push(cur); cur = words[i]; }
          }
          if (!ok) break;
          if (cur) lines.push(cur);
        }
        if (ok && lines.length <= 3) return { lines: lines, size: fs };
      }
      return { lines: manual.slice(0, 3), size: 6.5 };
    }

    node.each(function (d) {
      var label = d.display || "";
      if (!label) return;
      var sel = d3.select(this);
      var base = d.core ? 14 : 12.5;
      var fill = d.core ? P.coreText : P.areaText;
      var fit = fitLines(label, d.r || 20, base);
      var lines = fit.lines;
      var offsets = lines.length === 1 ? ["0.1em"] : lines.length === 2 ? ["-0.62em", "0.62em"] : ["-1.15em", "0", "1.15em"];
      lines.forEach(function (txt, i) {
        sel.append("text").attr("dy", offsets[i]).attr("fill", fill).attr("font-size", fit.size + "px")
          .attr("font-weight", "700").attr("text-anchor", "middle")
          .attr("dominant-baseline", "central").attr("pointer-events", "none").text(txt);
      });
    });

    /* ---- tooltip ---- */
    var tt = document.getElementById("rn-tooltip");
    function typeLabel(t) {
      if (t === "area") return { text: "Research Area", color: C_CORE };
      if (t === "keyword") return { text: "Keyword", color: S_KW };
      return { text: "Paper", color: P.paperLabel };
    }

    node.on("mouseover", function (event, d) {
      if (!tt) return;
      var lb = typeLabel(d.type);
      var h = '<div class="rn-tt-type" style="color:' + lb.color + '">' + esc(lb.text) + "</div>";
      if (d.type === "area" || d.type === "keyword") {
        h += '<div class="rn-tt-title">' + esc((d.name || d.display || "").replace(/\n/g, " ")) + "</div>" +
             '<hr class="rn-tt-divider"><div class="rn-tt-desc">' + esc(d.desc) + "</div>";
      } else {
        h += '<div class="rn-tt-title">' + esc(d.title) + "</div>";
        if (d.doi) h += '<a class="rn-tt-doi" href="' + esc(d.doi) + '" target="_blank" rel="noopener" style="pointer-events:auto">🔗 ' +
                        esc(d.doi.replace("https://", "")) + "</a>";
      }
      tt.innerHTML = h;
      tt.style.opacity = "1";
      tt.style.pointerEvents = d.doi ? "auto" : "none";

      var ci = {};
      allLinks.forEach(function (l) {
        if (l.source.id === d.id) ci[l.target.id] = 1;
        if (l.target.id === d.id) ci[l.source.id] = 1;
      });
      link.classed("highlighted", function (l) { return l.source.id === d.id || l.target.id === d.id; })
          .classed("faded", function (l) { return l.source.id !== d.id && l.target.id !== d.id; });
      node.classed("faded", function (n) { return n.id !== d.id && !ci[n.id]; });
    }).on("mousemove", function (event) {
      if (!tt) return;
      var r = el.getBoundingClientRect();
      var x = event.clientX - r.left + 18, y = event.clientY - r.top - 10;
      if (x + 285 > W) x = event.clientX - r.left - 290;
      if (y + 230 > H) y = event.clientY - r.top - 240;
      tt.style.left = Math.max(4, x) + "px";
      tt.style.top = Math.max(4, y) + "px";
    }).on("mouseout", function () {
      if (tt) { tt.style.opacity = "0"; tt.style.pointerEvents = "none"; }
      link.classed("highlighted", false).classed("faded", false);
      node.classed("faded", false);
    });

    sim.on("tick", function () {
      // 노드가 프레임 밖으로 나가지 않도록 가둠
      allNodes.forEach(function (n) {
        var pad = (n.r || 20) + 4;
        n.x = Math.max(pad, Math.min(W - pad, n.x));
        n.y = Math.max(pad, Math.min(H - pad, n.y));
      });
      link.attr("x1", function (d) { return d.source.x; }).attr("y1", function (d) { return d.source.y; })
          .attr("x2", function (d) { return d.target.x; }).attr("y2", function (d) { return d.target.y; });
      node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

  }
})();
