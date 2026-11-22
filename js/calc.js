/* ============================================================================
   DataView · calc.js
   Camada ANALÍTICA: tudo que é cálculo (KPIs, projeção, anomalias, RFM, curva
   ABC e insights). Não mexe na tela. Equivale às "consultas" de um backend.

   Convenções dos pedidos (veja data.js):
     o.d = data · o.c = cliente · o.p = produto · o.q = quantidade · o.pr = preço
     o.ch = canal · o.st = status · o.dl = dias de entrega · o.nps = nota
   Só pedidos com status "Entregue" contam como receita.
   ============================================================================ */
(function (root) {
  /* --------------------------------------------------------------------------
     1. UTILITÁRIOS
     -------------------------------------------------------------------------- */
  const r2 = (v) => Math.round(v * 100) / 100;                        // arredonda em 2 casas
  const sum = (a, f) => a.reduce((t, x) => t + f(x), 0);              // soma f(x) de cada item
  const dn = (s) => Date.parse(s) / 864e5;                            // "AAAA-MM-DD" -> nº do dia
  const iso = (n) => new Date(n * 864e5).toISOString().slice(0, 10); // nº do dia -> "AAAA-MM-DD"
  const ok = (o) => o.st === "Entregue";                              // pedido válido (gera receita)
  const rev = (o) => o.q * o.pr;                                      // receita do pedido
  const f1 = (v) => v.toFixed(1).replace(".", ",");                   // número com 1 casa e vírgula
  const byRev = (a) => a.sort((x, y) => y.revenue - x.revenue);       // ordena por receita (maior primeiro)

  /* --------------------------------------------------------------------------
     2. OPÇÕES E FILTROS
     -------------------------------------------------------------------------- */

  // Valores disponíveis para os filtros e o intervalo de datas da base
  /** Lista as opções de filtro e os limites de data disponíveis na base. */
  function options(D) {
    return {
      categories: [...new Set(D.products.map((p) => p.cat))].sort(),
      regions: [...new Set(D.customers.map((c) => c.reg))].sort(),
      channels: [...new Set(D.orders.map((o) => o.ch))].sort(),
      min: D.orders.reduce((m, o) => (o.d < m ? o.d : m), "9999"),
      max: D.orders.reduce((m, o) => (o.d > m ? o.d : m), ""),
    };
  }

  // Valida os filtros digitados. Devolve a mensagem de erro, ou "" se estiver tudo certo
  /** Valida os filtros informados antes de executar as análises. */
  function validate(f, O) {
    const re = /^\d{4}-\d{2}-\d{2}$/;
    for (const k of ["start", "end"]) {
      if (f[k] && (!re.test(f[k]) || isNaN(Date.parse(f[k])))) return "Data inválida (use AAAA-MM-DD).";
    }
    if (f.start && f.end && f.start > f.end) return "A data inicial não pode ser maior que a final.";
    if (f.category && !O.categories.includes(f.category)) return "Categoria inválida.";
    if (f.region && !O.regions.includes(f.region)) return "Região inválida.";
    if (f.channel && !O.channels.includes(f.channel)) return "Canal inválido.";
    return "";
  }

  // Aplica os filtros (período, canal, região, categoria) e devolve os pedidos que passam
  /** Seleciona pedidos de acordo com o período e demais filtros. */
  function filter(D, f) {
    return D.orders.filter(
      (o) =>
        (!f.start || o.d >= f.start) &&
        (!f.end || o.d <= f.end) &&
        (!f.channel || o.ch === f.channel) &&
        (!f.region || D.customers[o.c].reg === f.region) &&
        (!f.category || D.products[o.p].cat === f.category)
    );
  }

  /* --------------------------------------------------------------------------
     3. INDICADORES (KPIs)
     -------------------------------------------------------------------------- */

  // Resume um conjunto de pedidos: receita, lucro, margem, ticket, perda, NPS e prazo
  /** Calcula os indicadores consolidados para os pedidos selecionados. */
  function summary(D, rows) {
    const v = rows.filter(ok);
    const revenue = sum(v, rev);
    const profit = sum(v, (o) => o.q * (o.pr - D.products[o.p].cost));
    // NPS = % de promotores (nota 9-10) menos % de detratores (nota 0-6), entre quem avaliou
    const rated = v.filter((o) => o.nps >= 0);
    const pro = rated.filter((o) => o.nps >= 9).length;
    const det = rated.filter((o) => o.nps <= 6).length;
    return {
      revenue: r2(revenue),
      profit: r2(profit),
      margin: revenue ? (profit / revenue) * 100 : 0,
      orders: rows.length,
      ticket: v.length ? revenue / v.length : 0,
      loss: rows.length ? (1 - v.length / rows.length) * 100 : 0, // % cancelados + devolvidos
      nps: rated.length ? Math.round(((pro - det) / rated.length) * 100) : 0,
      delivery: v.length ? sum(v, (o) => o.dl) / v.length : 0,
    };
  }

  // Resumo do PERÍODO ANTERIOR, com a mesma duração do filtro atual (para os deltas).
  // Devolve null quando o período anterior começaria antes do início da base.
  function prev(D, f, O) {
    const s = dn(f.start || O.min);
    const len = dn(f.end || O.max) - s + 1;
    if (iso(s - len) < O.min) return null;
    return summary(D, filter(D, { ...f, start: iso(s - len), end: iso(s - 1) }));
  }

  // Agrupa pedidos por uma chave (ex.: canal, mês) somando receita, lucro e perdas
  function groupBy(D, rows, fn) {
    const m = {};
    rows.forEach((o) => {
      const k = fn(o);
      const g = m[k] || (m[k] = { label: k, revenue: 0, profit: 0, orders: 0, lost: 0 });
      g.orders++;
      if (ok(o)) {
        g.revenue += rev(o);
        g.profit += o.q * (o.pr - D.products[o.p].cost);
      } else {
        g.lost++;
      }
    });
    return Object.values(m).map((g) => ({ ...g, revenue: r2(g.revenue) }));
  }

  /* --------------------------------------------------------------------------
     4. PROJEÇÃO DE RECEITA
     Regressão linear sobre a série mensal (tendência). Com mais de 12 meses de
     histórico, multiplica pelo índice sazonal de cada mês (ex.: novembro é forte).
     `m` é a série mensal: [{ label: "2025-01", revenue }, ...]
     -------------------------------------------------------------------------- */
  /** Estima a tendência de receita a partir da série mensal. */
  function forecast(m) {
    const n = m.length;
    if (n < 4) return null; // poucos meses: não projeta
    const ys = m.map((x) => x.revenue);
    const xm = (n - 1) / 2;
    const ym = sum(ys, (y) => y) / n;

    // Reta de tendência y = a + b·x (mínimos quadrados)
    let sxy = 0, sxx = 0, st = 0;
    ys.forEach((y, i) => { sxy += (i - xm) * (y - ym); sxx += (i - xm) ** 2; });
    const b = sxy / sxx, a = ym - b * xm;
    ys.forEach((y) => { st += (y - ym) ** 2; });

    // Índice sazonal: média de (receita real ÷ tendência) em cada mês do calendário
    const sf = {};
    m.forEach((x, i) => {
      const t = a + b * i;
      if (t > 0) (sf[x.label.slice(5)] = sf[x.label.slice(5)] || []).push(x.revenue / t);
    });
    const seasonal = n >= 13;
    const av = (k) => (seasonal && sf[k] ? sum(sf[k], (v) => v) / sf[k].length : 1);

    // Valores ajustados do modelo e qualidade do ajuste (R²)
    const fit = ys.map((_, i) => (a + b * i) * av(m[i].label.slice(5)));
    const sse = ys.reduce((t, y, i) => t + (y - fit[i]) ** 2, 0);

    // Próximos 3 meses
    const [Y, M] = m[n - 1].label.split("-").map(Number);
    const next = [1, 2, 3].map((k) => {
      const label = new Date(Date.UTC(Y, M - 1 + k, 1)).toISOString().slice(0, 7);
      return { label, value: Math.max(0, (a + b * (n - 1 + k)) * av(label.slice(5))) };
    });
    return { seasonal, fit, r2: st ? 1 - sse / st : 0, next };
  }

  /* --------------------------------------------------------------------------
     5. DIAS ATÍPICOS (anomalias)
     Dias cuja receita está a mais de 2 desvios-padrão da média (z-score > 2).
     -------------------------------------------------------------------------- */
  /** Identifica dias com comportamento atípico de receita. */
  function anomalies(D, rows) {
    const m = {};
    rows.filter(ok).forEach((o) => { m[o.d] = (m[o.d] || 0) + rev(o); }); // receita por dia
    const k = Object.keys(m), n = k.length;
    if (n < 10) return [];
    const mu = sum(k, (x) => m[x]) / n;
    const sd = Math.sqrt(sum(k, (x) => (m[x] - mu) ** 2) / n) || 1;
    return k
      .map((d) => ({ d, v: m[d], z: (m[d] - mu) / sd, ev: D.events[d] || "" }))
      .filter((x) => Math.abs(x.z) > 2)
      .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
      .slice(0, 6);
  }

  /* --------------------------------------------------------------------------
     6. SEGMENTAÇÃO DE CLIENTES (RFM)
     R = recência (dias desde a última compra), F = frequência, M = valor gasto.
     -------------------------------------------------------------------------- */
  /** Segmenta clientes por recência, frequência e valor monetário. */
  function rfm(D, rows, O) {
    const now = dn(O.max);
    const c = {};
    rows.filter(ok).forEach((o) => {
      const x = c[o.c] || (c[o.c] = { id: o.c, last: 0, f: 0, m: 0 });
      x.last = Math.max(x.last, dn(o.d));
      x.f++;
      x.m += rev(o);
    });

    // Regras de segmento (a ordem importa: a primeira que casar vence)
    const seg = (x) => {
      const r = now - x.last;
      return x.f >= 8 && r <= 60 ? "Campeões"
        : x.f >= 4 && r <= 120 ? "Leais"
        : x.f === 1 && r <= 60 ? "Novos"
        : r > 150 ? "Hibernando"
        : "Em risco";
    };

    const S = {};
    Object.values(c).forEach((x) => {
      x.seg = seg(x);
      const s = S[x.seg] || (S[x.seg] = { label: x.seg, n: 0, revenue: 0 });
      s.n++;
      s.revenue += x.m;
    });
    return {
      segs: byRev(Object.values(S)),                                          // resumo por segmento
      top: Object.values(c).sort((a, b) => b.m - a.m).slice(0, 8),            // 8 maiores clientes
    };
  }

  /* --------------------------------------------------------------------------
     7. CURVA ABC (Pareto) DE PRODUTOS
     A = produtos que somam os primeiros 80% da receita; B = até 95%; C = o resto.
     Inclui margem e cobertura de estoque de cada produto.
     -------------------------------------------------------------------------- */
  /** Classifica produtos segundo sua contribuição para a receita. */
  function abc(D, rows) {
    const g = byRev(groupBy(D, rows, (o) => o.p));
    const T = sum(g, (x) => x.revenue) || 1; // receita total
    let c = 0;
    return g.map((x) => {
      const before = (c / T) * 100; // % acumulado ANTES deste produto
      c += x.revenue;
      const p = D.products[+x.label];
      return {
        ...x,
        name: p.name,
        cat: p.cat,
        cum: (c / T) * 100,
        cls: before < 80 ? "A" : before < 95 ? "B" : "C",
        margin: x.revenue ? (x.profit / x.revenue) * 100 : 0,
        stock: p.stock,
        cover: p.cover,
      };
    });
  }

  /* --------------------------------------------------------------------------
     8. INSIGHTS AUTOMÁTICOS
     Frases geradas a partir dos dados filtrados. `A` é o resultado de abc().
     -------------------------------------------------------------------------- */
  /** Produz observações automáticas a partir dos indicadores. */
  function insights(D, rows, A) {
    const out = [];
    const ch = groupBy(D, rows, (o) => o.ch).filter((x) => x.revenue);
    if (!ch.length) return out;

    // 1) Canal que lidera em receita x canal com melhor margem
    const T = sum(ch, (x) => x.revenue);
    const top = byRev([...ch])[0];
    const bm = [...ch].sort((a, b) => b.profit / b.revenue - a.profit / a.revenue)[0];
    out.push(
      `${top.label} lidera em receita (${f1((top.revenue / T) * 100)}%), mas ${bm.label} tem a melhor margem (${f1((bm.profit / bm.revenue) * 100)}%).`
    );

    // 2) Canal com maior taxa de cancelamento + devolução
    const w = [...ch].sort((a, b) => b.lost / b.orders - a.lost / a.orders)[0];
    out.push(`${w.label} concentra a maior taxa de cancelamento e devolução: ${f1((w.lost / w.orders) * 100)}% dos pedidos.`);

    // 3) Região que mais cresceu: compara a 2ª metade do período com a 1ª
    const ds = rows.map((o) => o.d);
    const mid = iso(((dn(ds.reduce((x, y) => (x < y ? x : y))) + dn(ds.reduce((x, y) => (x > y ? x : y)))) / 2) | 0);
    const revByRegion = (fn) => {
      const m = {};
      rows.filter(ok).forEach((o) => {
        if (fn(o)) {
          const r = D.customers[o.c].reg;
          m[r] = (m[r] || 0) + rev(o);
        }
      });
      return m;
    };
    const a1 = revByRegion((o) => o.d < mid);
    const a2 = revByRegion((o) => o.d >= mid);
    const gr = Object.keys(a1)
      .filter((r) => a1[r] > 0 && a2[r])
      .map((r) => [r, a2[r] / a1[r] - 1])
      .sort((x, y) => y[1] - x[1]);
    if (gr.length > 1) {
      out.push(`${gr[0][0]} é a região que mais cresceu na 2ª metade do período (${f1(gr[0][1] * 100)}% sobre a 1ª).`);
    }

    // 4) Concentração de receita (Pareto)
    const nA = A.filter((x) => x.cls === "A").length;
    if (A.length) out.push(`${nA} de ${A.length} produtos (classe A) geram 80% da receita: a base do Pareto.`);

    // 5) Efeito do prazo de entrega na nota dos clientes
    const rt = rows.filter((o) => ok(o) && o.nps >= 0);
    const av = (a) => (a.length ? sum(a, (o) => o.nps) / a.length : 0);
    const fa = rt.filter((o) => o.dl <= 3), sl = rt.filter((o) => o.dl >= 7);
    if (fa.length > 20 && sl.length > 20) {
      out.push(`Entregas em até 3 dias recebem nota média ${f1(av(fa))}, contra ${f1(av(sl))} nas acima de 7 dias.`);
    }

    // 6) Produtos com risco de ruptura de estoque (cobertura < 12 dias)
    const risk = D.products.filter((p) => p.cover < 12);
    if (risk.length) {
      out.push(`Risco de ruptura em ${risk.length} produtos (cobertura abaixo de 12 dias): ${risk.map((p) => p.name).join(", ")}.`);
    }
    return out;
  }

  /* --------------------------------------------------------------------------
     9. EXPORTAÇÃO
     No navegador vira window.Calc; no Node (testes) usa module.exports.
     -------------------------------------------------------------------------- */
  const api = { options, validate, filter, summary, prev, groupBy, byRev, forecast, anomalies, rfm, abc, insights, f1 };
  if (typeof module !== "undefined") module.exports = api;
  else root.Calc = api;
})(this);
