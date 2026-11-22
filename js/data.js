/* ============================================================================
   DataView · data.js
   Gerador de DADOS FICTÍCIOS da loja "Vende+" (jan/2025 a out/2026).

   - Determinístico: usa semente fixa, então os dados são sempre os mesmos.
   - Nenhum dado real: nomes, clientes e pedidos são inventados.
   - Exporta o objeto global window.DATA, usado por calc.js e app.js.

   ATENÇÃO: a ordem das chamadas aleatórias (R()) não pode mudar, senão todos
   os números do painel mudam.
   ============================================================================ */
(function (root) {
  /* --------------------------------------------------------------------------
     1. GERADOR PSEUDOALEATÓRIO (mulberry32)
     rng(semente) devolve uma função que sorteia números entre 0 e 1.
     -------------------------------------------------------------------------- */
  const rng = (a) => () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const R = rng(2026); // sorteio principal (pedidos, clientes)

  // Sorteio ponderado: escolhe um item de `a` com probabilidade proporcional a `w`
  const wp = (a, w) => {
    let r = R() * w.reduce((x, y) => x + y, 0), i = 0;
    while (i < a.length - 1 && (r -= w[i]) > 0) i++;
    return a[i];
  };

  /* --------------------------------------------------------------------------
     2. CADASTROS-BASE: produtos, estados (UF) e clientes
     -------------------------------------------------------------------------- */

  // [nome, categoria, preço, custo (fração do preço), peso de popularidade]
  const products = [
    ["Notebook Pro", "Eletrônicos", 4100, 0.72, 1],
    ["Smartphone X", "Eletrônicos", 2500, 0.7, 2],
    ["Fone Bluetooth", "Eletrônicos", 340, 0.45, 4],
    ["Monitor 27 pol", "Eletrônicos", 1500, 0.68, 2],
    ["Cadeira Ergonômica", "Casa", 1080, 0.58, 2],
    ["Mesa Home Office", "Casa", 920, 0.55, 2],
    ["Luminária LED", "Casa", 155, 0.4, 3],
    ["Kit Organizador", "Casa", 88, 0.35, 4],
    ["Tênis Runner", "Moda", 360, 0.48, 4],
    ["Jaqueta Urbana", "Moda", 410, 0.5, 2],
    ["Mochila Tech", "Moda", 230, 0.42, 3],
    ["Camiseta Básica", "Moda", 69, 0.3, 6],
    ["Whey Protein", "Saúde", 140, 0.52, 5],
    ["Smartwatch Fit", "Saúde", 620, 0.62, 2],
    ["Tapete Yoga", "Saúde", 110, 0.38, 2],
  ].map(([name, cat, price, c, w]) => ({ name, cat, price, cost: Math.round(price * c), w }));

  // UF: [região, peso (participação aproximada nas vendas)]
  const UF = {
    SP: ["Sudeste", 30], MG: ["Sudeste", 14], RJ: ["Sudeste", 12],
    PR: ["Sul", 8], RS: ["Sul", 8], SC: ["Sul", 6],
    BA: ["Nordeste", 7], PE: ["Nordeste", 5], CE: ["Nordeste", 4],
    GO: ["Centro-Oeste", 3], DF: ["Centro-Oeste", 3],
    PA: ["Norte", 2], AM: ["Norte", 2],
  };
  const ufs = Object.keys(UF), ufw = ufs.map((u) => UF[u][1]);

  // 900 clientes. `w` é o "peso de compra": poucos clientes compram muito (efeito Pareto)
  const customers = Array.from({ length: 900 }, (_, id) => {
    const uf = wp(ufs, ufw);
    return { id, uf, reg: UF[uf][0], w: R() ** 3 + 0.02 };
  });

  // Nomes fictícios: gerador SEPARADO (semente 77) para não alterar os sorteios dos pedidos
  const N = rng(77), nm = (a) => a[Math.floor(N() * a.length)];
  const FIRST = ["Lívia", "Caetano", "Iara", "Davi", "Marina", "Théo", "Aurora", "Rômulo", "Yasmin", "Eduardo",
    "Valentina", "Heitor", "Giovana", "Matias", "Nicole", "Ícaro", "Sofia", "Bernardo", "Letícia", "Joaquim"];
  const LAST = ["Marchetti", "Albuquerque", "Tavares", "Kowalski", "Bittencourt", "Nogueira", "Camargo", "Ferraz",
    "Lombardi", "Siqueira", "Domingues", "Takahashi", "Vilela", "Andrade", "Quintão", "Moraes", "Rezende",
    "Hoffmann", "Pimentel", "Cavalcanti"];
  customers.forEach((c) => { c.name = nm(FIRST) + " " + nm(LAST) + " " + nm(LAST); });

  /* --------------------------------------------------------------------------
     3. PARÂMETROS DO COMÉRCIO FICTÍCIO
     -------------------------------------------------------------------------- */
  const cidx = customers.map((_, k) => k), cw = customers.map((c) => c.w); // índices e pesos dos clientes
  const pidx = products.map((_, k) => k), pw = products.map((p) => p.w);   // índices e pesos dos produtos

  // Prazo médio de entrega (dias) por região: Norte demora mais que Sudeste
  const base = { Sudeste: 2.5, Sul: 3.5, "Centro-Oeste": 4.5, Nordeste: 6, Norte: 8 };

  // Canais de venda e a taxa de cancelamento de cada um (Marketplace cancela mais)
  const CH = ["Orgânico", "Anúncios", "E-mail", "Marketplace", "Social"];
  const loss = [0.04, 0.04, 0.03, 0.1, 0.07];

  // Sazonalidade por mês (jan..dez): novembro e dezembro vendem muito mais
  const mf = [0.9, 0.8, 0.9, 0.95, 1.1, 1, 0.95, 1, 1.05, 1.15, 1.6, 1.8];

  // Eventos do calendário: aparecem como explicação dos "dias atípicos" no painel
  const events = {
    "2025-03-17": "Instabilidade na plataforma",
    "2025-05-11": "Dia das Mães",
    "2025-08-12": "Campanha viral em redes sociais",
    "2025-11-28": "Black Friday",
    "2025-12-01": "Cyber Monday",
    "2025-12-22": "Corrida de Natal",
    "2026-03-15": "Dia do Consumidor",
    "2026-05-10": "Dia das Mães",
    "2026-06-12": "Dia dos Namorados",
    "2026-08-09": "Dia dos Pais",
    "2026-09-22": "Falha no gateway de pagamento",
  };
  // Multiplicador de volume de pedidos em cada evento (0,2 = queda; 3,4 = pico)
  const ef = {
    "2025-03-17": 0.2, "2025-05-11": 1.7, "2025-08-12": 2.6, "2025-11-28": 3.4, "2025-12-01": 2,
    "2025-12-22": 1.5, "2026-03-15": 2, "2026-05-10": 1.7, "2026-06-12": 1.6, "2026-08-09": 1.4,
    "2026-09-22": 0.25,
  };

  /* --------------------------------------------------------------------------
     4. GERAÇÃO DOS PEDIDOS (um laço por dia, de 01/01/2025 a 31/10/2026)
     Cada pedido: { id, d: data, c: cliente, p: produto, q: quantidade,
       pr: preço unitário, ch: canal, pay: pagamento, st: status,
       dl: dias de entrega, nps: nota 0-10 (ou -1 se não avaliou) }
     -------------------------------------------------------------------------- */
  const orders = [];
  for (let t = Date.UTC(2025, 0, 1); t <= Date.UTC(2026, 9, 31); t += 864e5) {
    const dt = new Date(t);
    const d = dt.toISOString().slice(0, 10);                          // "AAAA-MM-DD"
    const m = dt.getUTCMonth();                                       // mês do ano (0-11)
    const k = (dt.getUTCFullYear() - 2025) * 12 + m;                  // meses desde jan/2025 (tendência de crescimento)
    const wd = dt.getUTCDay();                                        // dia da semana (0 = domingo)

    // Nº de pedidos do dia = base × crescimento × sazonalidade × fim de semana × evento × ruído
    const n = Math.round(
      13 * (1 + 0.025 * k) * mf[m] * (wd % 6 === 0 ? 0.8 : 1) * (ef[d] || 1) * (0.85 + 0.3 * R())
    );

    for (let i = 0; i < n; i++) {
      const c = wp(cidx, cw);                                         // quem comprou
      const p = wp(pidx, pw);                                         // o que comprou
      const P = products[p], reg = customers[c].reg;
      const ch = wp(CH, [3, 3, 1.5, 2.5, 1.5]);                       // canal de venda
      // Quantidade: produtos caros quase sempre 1 unidade
      const q = P.price > 900 ? (R() < 0.9 ? 1 : 2) : wp([1, 2, 3, 4, 5], [6, 3, 2, 1, 0.5]);

      // Status: cancelamento depende do canal; devolução é maior em Moda
      const lo = loss[CH.indexOf(ch)], r = R();
      const st = r < lo ? "Cancelado" : r < lo + (P.cat === "Moda" ? 0.05 : 0.025) ? "Devolvido" : "Entregue";

      // Prazo de entrega por região; a nota (NPS) cai quando a entrega demora
      const dl = Math.max(1, Math.round(base[reg] + (R() - 0.4) * 3));
      const nps = st === "Entregue" && R() < 0.7
        ? Math.max(0, Math.min(10, Math.round(9.4 - dl * 0.32 + (R() - 0.5) * 3.2)))
        : -1;

      orders.push({
        id: orders.length, d, c, p, q,
        // Preço varia ±5% e tem 18% de desconto na Black Friday
        pr: Math.round(P.price * (0.95 + 0.1 * R()) * (d === "2025-11-28" ? 0.82 : 1) * 100) / 100,
        ch,
        pay: wp(["Pix", "Cartão", "Boleto"], [4, 4, 1]),
        st, dl, nps,
      });
    }
  }

  /* --------------------------------------------------------------------------
     5. REGISTRO DE AUDITORIA INICIAL (histórico fictício exibido na Administração)
     -------------------------------------------------------------------------- */
  const audit = [
    ["2026-10-27 08:12", "cecilia.brandao@dataview.com.br", "Login"],
    ["2026-10-27 08:40", "otavio.fontes@dataview.com.br", "Login"],
    ["2026-10-27 08:52", "otavio.fontes@dataview.com.br", "Removeu lançamento duplicado"],
    ["2026-10-28 09:05", "renata.sampaio@dataview.com.br", "Login"],
    ["2026-10-28 09:20", "renata.sampaio@dataview.com.br", "Consultou painel de administração"],
    ["2026-10-29 17:31", "otavio.fontes@dataview.com.br", "Exportou CSV"],
  ];

  /* --------------------------------------------------------------------------
     6. OBJETO EXPORTADO E COBERTURA DE ESTOQUE
     -------------------------------------------------------------------------- */
  const X = { products, customers, orders, events, audit, UF, recalc };

  // Recalcula, para cada produto, a velocidade de vendas (unidades/dia nos últimos
  // 30 dias dos dados) e a cobertura de estoque (dias que o estoque aguenta).
  // É chamada de novo sempre que a gestão de dados altera pedidos ou produtos.
  function recalc() {
    const end = X.orders.reduce((m, o) => (o.d > m ? o.d : m), "");
    const from = new Date(Date.parse(end) - 29 * 864e5).toISOString().slice(0, 10);
    X.products.forEach((p) => { p.vel = 0; });
    X.orders.forEach((o) => {
      if (o.st === "Entregue" && o.d >= from) X.products[o.p].vel += o.q / 30;
    });
    X.products.forEach((p) => { p.cover = p.vel ? p.stock / p.vel : 99; });
  }

  // Estoque inicial: definido pela cobertura desejada de cada produto (em dias).
  // Valores baixos (8, 9, 11, 14) geram os alertas de "risco de ruptura".
  const cover = [8, 35, 20, 14, 28, 45, 60, 22, 30, 11, 25, 70, 18, 9, 40];
  recalc();
  products.forEach((p, i) => { p.stock = Math.round(p.vel * cover[i]); });
  recalc();

  root.DATA = X;
})(this);
