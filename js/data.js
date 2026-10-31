/* Dados fictícios gerados de forma determinística (semente fixa): jan/2025 a out/2026, ~12 mil pedidos. */
(function (root) {
  const rng = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const R = rng(2026);
  const wp = (a, w) => { let r = R() * w.reduce((x, y) => x + y, 0), i = 0; while (i < a.length - 1 && (r -= w[i]) > 0) i++; return a[i]; };
  const products = [
    ["Notebook Pro", "Eletrônicos", 4100, .72, 1], ["Smartphone X", "Eletrônicos", 2500, .70, 2], ["Fone Bluetooth", "Eletrônicos", 340, .45, 4],
    ["Monitor 27 pol", "Eletrônicos", 1500, .68, 2], ["Cadeira Ergonômica", "Casa", 1080, .58, 2], ["Mesa Home Office", "Casa", 920, .55, 2],
    ["Luminária LED", "Casa", 155, .40, 3], ["Kit Organizador", "Casa", 88, .35, 4], ["Tênis Runner", "Moda", 360, .48, 4],
    ["Jaqueta Urbana", "Moda", 410, .50, 2], ["Mochila Tech", "Moda", 230, .42, 3], ["Camiseta Básica", "Moda", 69, .30, 6],
    ["Whey Protein", "Saúde", 140, .52, 5], ["Smartwatch Fit", "Saúde", 620, .62, 2], ["Tapete Yoga", "Saúde", 110, .38, 2]
  ].map(([name, cat, price, c, w]) => ({ name, cat, price, cost: Math.round(price * c), w }));
  const UF = { SP: ["Sudeste", 30], MG: ["Sudeste", 14], RJ: ["Sudeste", 12], PR: ["Sul", 8], RS: ["Sul", 8], SC: ["Sul", 6], BA: ["Nordeste", 7],
    PE: ["Nordeste", 5], CE: ["Nordeste", 4], GO: ["Centro-Oeste", 3], DF: ["Centro-Oeste", 3], PA: ["Norte", 2], AM: ["Norte", 2] };
  const ufs = Object.keys(UF), ufw = ufs.map((u) => UF[u][1]);
  const customers = Array.from({ length: 900 }, (_, id) => { const uf = wp(ufs, ufw); return { id, uf, reg: UF[uf][0], w: R() ** 3 + .02 }; });
  const N = rng(77), nm = (a) => a[Math.floor(N() * a.length)];
  const F = ["Lívia", "Caetano", "Iara", "Davi", "Marina", "Théo", "Aurora", "Rômulo", "Yasmin", "Eduardo", "Valentina", "Heitor", "Giovana", "Matias", "Nicole", "Ícaro", "Sofia", "Bernardo", "Letícia", "Joaquim"];
  const L = ["Marchetti", "Albuquerque", "Tavares", "Kowalski", "Bittencourt", "Nogueira", "Camargo", "Ferraz", "Lombardi", "Siqueira", "Domingues", "Takahashi", "Vilela", "Andrade", "Quintão", "Moraes", "Rezende", "Hoffmann", "Pimentel", "Cavalcanti"];
  customers.forEach((c) => { c.name = nm(F) + " " + nm(L) + " " + nm(L); });
  const cidx = customers.map((_, k) => k), pidx = products.map((_, k) => k), cw = customers.map((c) => c.w), pw = products.map((p) => p.w);
  const base = { Sudeste: 2.5, Sul: 3.5, "Centro-Oeste": 4.5, Nordeste: 6, Norte: 8 };
  const CH = ["Orgânico", "Anúncios", "E-mail", "Marketplace", "Social"], loss = [.04, .04, .03, .10, .07];
  const mf = [.9, .8, .9, .95, 1.1, 1, .95, 1, 1.05, 1.15, 1.6, 1.8];
  const events = { "2025-03-17": "Instabilidade na plataforma", "2025-05-11": "Dia das Mães", "2025-08-12": "Campanha viral em redes sociais",
    "2025-11-28": "Black Friday", "2025-12-01": "Cyber Monday", "2025-12-22": "Corrida de Natal", "2026-03-15": "Dia do Consumidor",
    "2026-05-10": "Dia das Mães", "2026-06-12": "Dia dos Namorados", "2026-08-09": "Dia dos Pais", "2026-09-22": "Falha no gateway de pagamento" };
  const ef = { "2025-03-17": .2, "2025-05-11": 1.7, "2025-08-12": 2.6, "2025-11-28": 3.4, "2025-12-01": 2, "2025-12-22": 1.5, "2026-03-15": 2,
    "2026-05-10": 1.7, "2026-06-12": 1.6, "2026-08-09": 1.4, "2026-09-22": .25 };
  const orders = [];
  for (let t = Date.UTC(2025, 0, 1); t <= Date.UTC(2026, 9, 31); t += 864e5) {
    const dt = new Date(t), d = dt.toISOString().slice(0, 10), m = dt.getUTCMonth(), k = (dt.getUTCFullYear() - 2025) * 12 + m, wd = dt.getUTCDay();
    const n = Math.round(13 * (1 + .025 * k) * mf[m] * (wd % 6 === 0 ? .8 : 1) * (ef[d] || 1) * (.85 + .3 * R()));
    for (let i = 0; i < n; i++) {
      const c = wp(cidx, cw), p = wp(pidx, pw), P = products[p], reg = customers[c].reg;
      const ch = wp(CH, [3, 3, 1.5, 2.5, 1.5]), q = P.price > 900 ? (R() < .9 ? 1 : 2) : wp([1, 2, 3, 4, 5], [6, 3, 2, 1, .5]);
      const lo = loss[CH.indexOf(ch)], r = R(), st = r < lo ? "Cancelado" : r < lo + (P.cat === "Moda" ? .05 : .025) ? "Devolvido" : "Entregue";
      const dl = Math.max(1, Math.round(base[reg] + (R() - .4) * 3)), nps = st === "Entregue" && R() < .7 ? Math.max(0, Math.min(10, Math.round(9.4 - dl * .32 + (R() - .5) * 3.2))) : -1;
      orders.push({ id: orders.length, d, c, p, q, pr: Math.round(P.price * (.95 + .1 * R()) * (d === "2025-11-28" ? .82 : 1) * 100) / 100, ch,
        pay: wp(["Pix", "Cartão", "Boleto"], [4, 4, 1]), st, dl, nps });
    }
  }
  const audit = [["2026-10-27 08:12", "cecilia.brandao@dataview.com.br", "Login"], ["2026-10-27 08:40", "otavio.fontes@dataview.com.br", "Login"],
    ["2026-10-27 08:52", "otavio.fontes@dataview.com.br", "Removeu lançamento duplicado"], ["2026-10-28 09:05", "renata.sampaio@dataview.com.br", "Login"],
    ["2026-10-28 09:20", "renata.sampaio@dataview.com.br", "Consultou painel de administração"], ["2026-10-29 17:31", "otavio.fontes@dataview.com.br", "Exportou CSV"]];
  const X = { products, customers, orders, events, audit, UF, recalc };
  function recalc() { // velocidade de vendas (últimos 30 dias dos dados) e cobertura de estoque
    const end = X.orders.reduce((m, o) => (o.d > m ? o.d : m), ""), from = new Date(Date.parse(end) - 29 * 864e5).toISOString().slice(0, 10);
    X.products.forEach((p) => { p.vel = 0; });
    X.orders.forEach((o) => { if (o.st === "Entregue" && o.d >= from) X.products[o.p].vel += o.q / 30; });
    X.products.forEach((p) => { p.cover = p.vel ? p.stock / p.vel : 99; });
  }
  const cover = [8, 35, 20, 14, 28, 45, 60, 22, 30, 11, 25, 70, 18, 9, 40];
  recalc(); products.forEach((p, i) => { p.stock = Math.round(p.vel * cover[i]); }); recalc();
  root.DATA = X;
})(this);
