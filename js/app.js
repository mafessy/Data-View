/* ============================================================================
   DataView · app.js
   Controlador da interface: login e permissões, navegação, filtros, gráficos,
   gestão de dados e exportação.

   Ordem do arquivo:
     1. Atalhos e formatadores          6. Funções de renderização (uma por tela)
     2. Configuração (cores, telas)     7. Gestão de dados (adicionar/remover)
     3. Usuários e permissões           8. Navegação, login e sessão
     4. Avatares                        9. Inicialização e eventos
     5. Estado e utilitários de tela
   Depende de: Chart.js (vendor), window.DATA (data.js) e window.Calc (calc.js).
   ============================================================================ */

/* ----------------------------------------------------------------------------
   1. ATALHOS E FORMATADORES
   ---------------------------------------------------------------------------- */
const $ = (s) => document.querySelector(s);          // um elemento
const $$ = (s) => [...document.querySelectorAll(s)]; // vários elementos
const D = window.DATA;                               // base de dados fictícia
const O = Calc.options(D);                           // filtros disponíveis + intervalo de datas
const f1 = Calc.f1;                                  // número com 1 casa decimal e vírgula
const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const num = (v) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
const br = (iso) => iso.split("-").reverse().join("/"); // "2026-10-31" -> "31/10/2026"

/* ----------------------------------------------------------------------------
   2. CONFIGURAÇÃO
   ---------------------------------------------------------------------------- */
// Paleta dos gráficos (vem do logo): azul, turquesa, violeta, azul-marinho, laranja, cinza
const COLORS = ["#5b78e0", "#4cc0c8", "#8f78d8", "#26375a", "#f0a850", "#9aa1c4"];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mlabel = (k) => MES[+k.slice(5) - 1] + "/" + k.slice(2, 4); // "2026-03" -> "mar/26"

// Telas do sistema: título e ícone na barra lateral
const VIEWS = { geral: "Visão geral", clientes: "Clientes", produtos: "Produtos", dados: "Gestão de dados", admin: "Administração" };
const ICON = { geral: "▦", clientes: "☺", produtos: "☰", dados: "✎", admin: "⚙" };

// Eixo de valores em R$ mil, usado nos gráficos de receita
const money = { ticks: { callback: (v) => "R$ " + num(v / 1000) + "k" } };

/* ----------------------------------------------------------------------------
   3. USUÁRIOS E PERMISSÕES
   Autenticação apenas DEMONSTRATIVA, feita no navegador (as senhas ficam
   visíveis no código). Em um sistema real, o login deve ser feito em um backend.

   Campos: u = e-mail · p = senha · n = nome · role = cargo · desc = o que pode fazer
           views = telas liberadas · csv = pode exportar · edit = pode alterar dados
   ---------------------------------------------------------------------------- */
const USERS = [
  {
    u: "cecilia.brandao@dataview.com.br", p: "Diretoria@2026", n: "Cecília Albuquerque Brandão",
    role: "Diretora Comercial", desc: "Painéis e exportação de relatórios",
    views: ["geral", "clientes", "produtos"], csv: true,
  },
  {
    u: "otavio.fontes@dataview.com.br", p: "Dados@2026", n: "Otávio Nakamura Fontes",
    role: "Analista de Dados Sênior", desc: "Painéis, exportação e gestão de dados (adicionar e remover)",
    views: ["geral", "clientes", "produtos", "dados"], csv: true, edit: true, // único com permissão de edição
  },
  {
    u: "renata.sampaio@dataview.com.br", p: "TI@2026", n: "Renata Pimentel Sampaio",
    role: "Gerente de TI e Governança", desc: "Painéis, usuários e registro de auditoria",
    views: ["geral", "clientes", "produtos", "admin"], csv: true,
  },
];

/* ----------------------------------------------------------------------------
   4. AVATARES
   Ilustrações anônimas em silhueta, desenhadas em SVG com as cores da marca.
   Nenhuma foto de pessoa real. Cada conta usa uma variação: [cor 1, cor 2, cabelo].
   ---------------------------------------------------------------------------- */
const AVATARS = [["#26375a", "#5b78e0", "long"], ["#2a8f99", "#5b78e0", "short"], ["#6a55c4", "#26375a", "bun"]];

// Devolve o avatar do usuário de índice i como data URI (usável direto em <img src>)
function avatar(i) {
  const [c1, c2, h] = AVATARS[i % AVATARS.length], hr = "#1c2a47"; // hr = cor do cabelo
  const back = h === "long" ? `<path d="M31 46c0-19 8-29 19-29s19 10 19 29v26H31z" fill="${hr}"/>`
    : h === "bun" ? `<circle cx="50" cy="17" r="8" fill="${hr}"/>` : ""; // cabelo atrás da cabeça
  const front = h === "long" ? `<path d="M35 40c2-9 8-14 15-14s13 5 15 14c-6-4-10-5-15-5s-9 1-15 5z" fill="${hr}"/>`
    : h === "short" ? `<path d="M34 41c0-13 7-20 16-20s16 7 16 20c-5-6-10-8-16-8s-11 2-16 8z" fill="${hr}"/>`
    : `<path d="M34 42c0-14 7-21 16-21s16 7 16 21c-5-6-10-8-16-8s-11 2-16 8z" fill="${hr}"/>`; // franja
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>` +
    `<rect width="100" height="100" fill="url(#g)"/><circle cx="82" cy="18" r="22" fill="#fff" opacity=".08"/>` +
    `${back}<path d="M10 100c3-21 17-31 40-31s37 10 40 31z" fill="#e4e9f8"/>` + // ombros
    `<rect x="44" y="52" width="12" height="14" rx="5" fill="#d3daf0"/>` +        // pescoço
    `<ellipse cx="50" cy="43" rx="14" ry="16" fill="#eef1fb"/>${front}</svg>`;   // rosto + cabelo
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
USERS.forEach((u, i) => { u.photo = avatar(i); });

/* ----------------------------------------------------------------------------
   5. ESTADO E UTILITÁRIOS DE TELA
   ---------------------------------------------------------------------------- */
const form = $("#filters");   // formulário de filtros do cabeçalho
const charts = {};            // gráficos já criados (para destruir antes de redesenhar)
let user = null;              // usuário logado
let view = "geral";           // tela atual

// Armazenamento da sessão (lembra o login até fechar a aba). try/catch: pode estar bloqueado
const store = {
  get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } },
};

// Registro de auditoria da sessão atual (aparece na tela Administração)
const logs = [];
function log(a) {
  logs.unshift([new Date().toISOString().slice(0, 16).replace("T", " "), user.u, a]);
}

// Monta uma tabela. Cada célula pode ser: texto/número, { b, c } (selo), { btn, fn } (botão) ou { img, t } (avatar + texto)
/** Renderiza uma tabela a partir do cabeçalho e das linhas fornecidas. */
function tbl(sel, head, rows) {
  const t = $(sel);
  t.replaceChildren();
  const h = t.createTHead().insertRow();
  head.forEach((x) => {
    const th = document.createElement("th");
    th.textContent = x;
    h.appendChild(th);
  });
  const b = t.createTBody();
  rows.forEach((r) => {
    const tr = b.insertRow();
    r.forEach((c) => {
      const td = tr.insertCell();
      if (c && c.b) { // selo colorido (badge)
        const s = document.createElement("span");
        s.className = "b " + c.c;
        s.textContent = c.b;
        td.appendChild(s);
      } else if (c && c.btn) { // botão de ação
        const k = document.createElement("button");
        k.type = "button";
        k.className = "sm danger";
        k.textContent = c.btn;
        k.addEventListener("click", c.fn);
        td.appendChild(k);
      } else if (c && c.img) { // avatar + texto
        const m = new Image();
        m.className = "me";
        m.alt = "";
        m.src = c.img;
        td.append(m, c.t);
      } else {
        td.textContent = c;
      }
    });
  });
}

// Desenha (ou redesenha) um gráfico Chart.js no <canvas id="...">
/** Cria ou atualiza um gráfico, evitando instâncias duplicadas. */
function draw(id, cfg) {
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart($("#" + id), cfg);
}

// Mostra ou esconde a mensagem de erro dos filtros
const showError = (t) => {
  $("#msg").textContent = t || "";
  $("#msg").hidden = !t;
};

// Lê os filtros preenchidos no cabeçalho (ignora os vazios)
function filters() {
  const f = {};
  new FormData(form).forEach((v, k) => { if (v) f[k] = String(v).trim(); });
  return f;
}

// Define o período dos filtros como "os últimos n dias" da base. quiet = não redesenha
function setRange(n, quiet) {
  form.end.value = O.max;
  form.start.value = new Date(Date.parse(O.max) - (n - 1) * 864e5).toISOString().slice(0, 10);
  if (!quiet) render();
}

/* ----------------------------------------------------------------------------
   6. RENDERIZAÇÃO DAS TELAS
   render() valida os filtros, calcula os pedidos filtrados e chama a função da
   tela atual. Cada renderXxx recebe ctx = { f, rows, A, base }:
     f = filtros · rows = pedidos filtrados · A = curva ABC · base = opções comuns dos gráficos
   ---------------------------------------------------------------------------- */
/** Atualiza a tela ativa com base nos filtros e no estado atual. */
function render() {
  const f = filters(), err = Calc.validate(f, O);
  showError(err);
  if (err) return;

  // Cores do texto e das grades dos gráficos seguem o tema (claro/escuro)
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.color = css.getPropertyValue("--muted");
  Chart.defaults.borderColor = css.getPropertyValue("--line");

  const rows = Calc.filter(D, f);
  const ctx = { f, rows, A: Calc.abc(D, rows), base: { responsive: true, maintainAspectRatio: false } };
  if (view === "geral") renderGeral(ctx);
  else if (view === "clientes") renderClientes(ctx);
  else if (view === "produtos") renderProdutos(ctx);
  else if (view === "dados") renderDados();
  else if (view === "admin") renderAdmin();
}

// ---- Tela: Visão geral (KPIs, receita mensal com projeção, canais, regiões, insights, anomalias)
function renderGeral({ f, rows, A, base }) {
  // KPIs: [rótulo, campo do resumo, formatador, invertido?]. "Invertido" = queda é melhor (ex.: cancelamentos)
  const s = Calc.summary(D, rows), p = Calc.prev(D, f, O);
  const K = [
    ["Receita", "revenue", brl], ["Lucro bruto", "profit", brl], ["Margem", "margin", (v) => f1(v) + "%"],
    ["Pedidos", "orders", num], ["Ticket médio", "ticket", brl], ["NPS", "nps", (v) => String(v)],
    ["Cancel. + devol.", "loss", (v) => f1(v) + "%", 1], ["Prazo médio", "delivery", (v) => f1(v) + " dias", 1],
  ];
  $("#kpis").replaceChildren(
    ...K.map(([label, key, fmt, inverted]) => {
      const card = document.createElement("article");
      card.className = "card";
      const d = p && p[key] > 0 ? (s[key] / p[key] - 1) * 100 : null; // variação % vs. período anterior
      const text = d === null ? "sem período anterior" : (d >= 0 ? "▲ " : "▼ ") + f1(Math.abs(d)) + "% vs. período anterior";
      card.innerHTML = "<span></span><strong></strong><em></em>"; // textContent evita injeção de HTML
      card.children[0].textContent = label;
      card.children[1].textContent = fmt(s[key]);
      card.children[2].textContent = text;
      card.children[2].className = d === null ? "" : (d > 0) !== !!inverted ? "up" : "down"; // verde = bom, vermelho = ruim
      return card;
    })
  );

  // Receita mensal + linha de tendência e projeção dos próximos 3 meses
  const m = Calc.groupBy(D, rows, (o) => o.d.slice(0, 7)).sort((a, b) => (a.label < b.label ? -1 : 1));
  const fc = Calc.forecast(m);
  const labels = m.map((x) => mlabel(x.label)).concat(fc ? fc.next.map((x) => mlabel(x.label)) : []);
  $("#fc-note").textContent = fc
    ? "Tendência por regressão linear (R² = " + f1(fc.r2) + ")" + (fc.seasonal ? " com ajuste sazonal" : "") + " e projeção dos próximos 3 meses."
    : "Amplie o período (4+ meses) para ver a projeção.";
  draw("c-month", {
    type: "line",
    options: { ...base, scales: { y: money }, plugins: { legend: { position: "bottom" } } },
    data: {
      labels,
      datasets: [
        { label: "Receita", data: m.map((x) => x.revenue), borderColor: COLORS[0], backgroundColor: "rgba(91,120,224,.14)", fill: true, tension: 0.35 },
        ...(fc ? [{ label: "Tendência e projeção", data: fc.fit.concat(fc.next.map((x) => x.value)), borderColor: COLORS[3], borderDash: [6, 5], pointRadius: 0 }] : []),
      ],
    },
  });

  // Receita por canal (rosca) e por região (barras horizontais)
  const ch = Calc.byRev(Calc.groupBy(D, rows, (o) => o.ch));
  const rg = Calc.byRev(Calc.groupBy(D, rows, (o) => D.customers[o.c].reg));
  draw("c-ch", {
    type: "doughnut",
    options: { ...base, cutout: "62%", plugins: { legend: { position: "right" } } },
    data: { labels: ch.map((x) => x.label), datasets: [{ data: ch.map((x) => x.revenue), backgroundColor: COLORS }] },
  });
  draw("c-reg", {
    type: "bar",
    options: { ...base, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: money } },
    data: { labels: rg.map((x) => x.label), datasets: [{ data: rg.map((x) => x.revenue), backgroundColor: COLORS[1], borderRadius: 6 }] },
  });

  // Insights automáticos e dias atípicos
  $("#ins").replaceChildren(
    ...Calc.insights(D, rows, A).map((t) => {
      const li = document.createElement("li");
      li.textContent = t;
      return li;
    })
  );
  tbl("#t-an", ["Data", "Receita", "z", "Evento"],
    Calc.anomalies(D, rows).map((x) => [br(x.d), brl(x.v), (x.z > 0 ? "+" : "") + f1(x.z), x.ev || "Sem evento conhecido"]));
}

// ---- Tela: Clientes (segmentos RFM, receita por estado, maiores clientes)
function renderClientes({ rows, base }) {
  const r = Calc.rfm(D, rows, O);
  const uf = Calc.byRev(Calc.groupBy(D, rows, (o) => D.customers[o.c].uf));
  draw("c-rfm", {
    type: "doughnut",
    options: { ...base, cutout: "58%", plugins: { legend: { position: "right" } } },
    data: { labels: r.segs.map((x) => x.label), datasets: [{ data: r.segs.map((x) => x.n), backgroundColor: COLORS }] },
  });
  draw("c-uf", {
    type: "bar",
    options: { ...base, plugins: { legend: { display: false } }, scales: { y: money } },
    data: { labels: uf.map((x) => x.label), datasets: [{ data: uf.map((x) => x.revenue), backgroundColor: COLORS[2], borderRadius: 6 }] },
  });
  tbl("#t-rfm", ["Segmento", "Clientes", "Receita", "Ticket/cliente"], r.segs.map((x) => [x.label, num(x.n), brl(x.revenue), brl(x.revenue / x.n)]));
  tbl("#t-cli", ["Cliente", "UF", "Pedidos", "Receita", "Segmento"],
    r.top.map((x) => [D.customers[x.id].name, D.customers[x.id].uf, x.f, brl(x.m), x.seg]));
}

// ---- Tela: Produtos (curva ABC + tabela de margem e cobertura de estoque)
function renderProdutos({ A, base }) {
  const clsColor = { A: COLORS[0], B: COLORS[2], C: COLORS[5] }; // cor da barra por classe ABC
  draw("c-abc", {
    data: {
      labels: A.map((x) => x.name),
      datasets: [
        { type: "bar", label: "Receita", data: A.map((x) => x.revenue), backgroundColor: A.map((x) => clsColor[x.cls]), borderRadius: 6, yAxisID: "y" },
        { type: "line", label: "% acumulado", data: A.map((x) => x.cum), borderColor: COLORS[3], yAxisID: "y1" },
      ],
    },
    options: {
      ...base,
      plugins: { legend: { position: "bottom" } },
      scales: { y: money, y1: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + "%" } } },
    },
  });
  tbl("#t-prod", ["Produto", "Classe", "Receita", "Margem", "Estoque", "Cobertura"],
    A.map((x) => [
      x.name, { b: x.cls, c: "c" + x.cls }, brl(x.revenue), f1(x.margin) + "%", num(x.stock),
      { b: Math.round(x.cover) + " dias" + (x.cover < 12 ? " · reposição" : ""), c: x.cover < 12 ? "bad" : "ok" }, // alerta < 12 dias
    ]));
}

// ---- Tela: Administração (usuários e registro de auditoria; só o perfil de TI)
function renderAdmin() {
  tbl("#t-users", ["Usuário", "Nome", "Cargo", "Acesso"], USERS.map((x) => [{ img: x.photo, t: x.u }, x.n, x.role, x.desc]));
  tbl("#t-log", ["Data e hora", "Usuário", "Ação"], logs.concat(D.audit.slice().reverse()).slice(0, 12)); // sessão + histórico fictício
}

/* ----------------------------------------------------------------------------
   7. GESTÃO DE DADOS
   Só perfis com edit:true (Analista de Dados). As alterações NÃO mexem nos arquivos:
   ficam salvas no navegador (localStorage) como um "delta" que é reaplicado ao abrir.
     delta.add  = pedidos lançados     delta.del  = ids de pedidos removidos
     delta.cust = clientes criados     delta.prod = produtos cadastrados
     delta.n    = contador para gerar ids dos pedidos manuais
   ---------------------------------------------------------------------------- */
const KEY = "dv_delta_v1";
let delta = { add: [], del: [], cust: [], prod: [], n: 0 };
let confirmReset = false; // o botão "Restaurar" pede um segundo clique para confirmar

const save = () => { try { localStorage.setItem(KEY, JSON.stringify(delta)); } catch (e) { /* ignora */ } };
const sortO = () => D.orders.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id)); // mantém os pedidos em ordem de data
const oid = (id) => "#" + (id >= 1e6 ? "M" + (id - 1e6 + 1) : id + 1); // rótulo do pedido: #123 (base) ou #M1 (manual)

// Ao abrir o site: reaplica as alterações salvas sobre os dados gerados
/** Aplica as alterações persistidas à base fictícia. */
function applyDelta() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignora */ }
  if (d && d.add) {
    delta = d;
    const del = new Set(d.del);
    D.products.push(...d.prod);
    D.customers.push(...d.cust);
    D.orders = D.orders.filter((o) => !del.has(o.id)).concat(d.add);
    sortO();
    D.recalc();
  }
  Object.assign(O, Calc.options(D));
}

// Depois de qualquer alteração: atualiza intervalo de datas, listas e redesenha a tela
/** Recalcula as opções de filtro e atualiza a interface. */
function refresh() {
  Object.assign(O, Calc.options(D));
  ["start", "end"].forEach((n) => { form[n].min = O.min; form[n].max = O.max; });
  fillLists();
  render();
}

// Preenche os selects e a lista de clientes dos formulários
function fillLists() {
  const f = $("#fo"), cur = f.prod.value;
  f.prod.replaceChildren(...D.products.map((p, i) => new Option(p.name, i)));
  if (cur) f.prod.value = cur;
  if (!f.uf.options.length) Object.keys(D.UF).forEach((u) => f.uf.add(new Option(u, u)));
  if (!f.ch.options.length) O.channels.forEach((c) => f.ch.add(new Option(c, c)));
  if (!$("#fprod").cat.options.length) O.categories.forEach((c) => $("#fprod").cat.add(new Option(c, c)));
  $("#dl-cli").replaceChildren(...D.customers.map((c) => { const o = document.createElement("option"); o.value = c.name; return o; }));
}

// Valores iniciais do formulário de pedido (data = último dia da base, preço do produto)
function setDefaults() {
  const f = $("#fo");
  f.date.value = O.max;
  f.price.value = D.products[+f.prod.value || 0].price;
  f.qty.value = 1;
  f.dl.value = 3;
  f.cli.value = "";
  f.nps.value = "";
}

// Barreira de permissão: só quem tem edit:true altera dados (mesmo que alguém force o formulário)
const need = () => {
  if (user && user.edit) return true;
  showError("Seu perfil não tem permissão para alterar dados.");
  return false;
};
const say = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = "fmsg " + (ok ? "ok" : "bad"); };

// Tela: contagem da base + tabela dos 15 últimos lançamentos com botão de remover
function renderDados() {
  const ch = delta.add.length + delta.del.length + delta.prod.length;
  $("#d-count").textContent =
    num(D.orders.length) + " pedidos · " + num(D.customers.length) + " clientes · " + D.products.length + " produtos · período " +
    br(O.min) + " a " + br(O.max) + (ch ? " · " + ch + (ch === 1 ? " alteração local" : " alterações locais") : "");
  tbl("#t-rec", ["ID", "Data", "Cliente", "Produto", "Qtd", "Total", "Status", "Origem", ""],
    D.orders.slice(-15).reverse().map((o) => [
      oid(o.id), br(o.d), D.customers[o.c].name, D.products[o.p].name, o.q, brl(o.q * o.pr),
      { b: o.st, c: o.st === "Entregue" ? "ok" : "bad" }, o.id >= 1e6 ? "Manual" : "Base",
      { btn: "Remover", fn: () => removeOrder(o.id) },
    ]));
}

// Remove um pedido: se foi lançado manualmente, só desfaz o lançamento; se é da base, registra a exclusão
function removeOrder(id) {
  if (!need()) return;
  const i = delta.add.findIndex((o) => o.id === id);
  if (i >= 0) delta.add.splice(i, 1);
  else delta.del.push(id);
  D.orders = D.orders.filter((o) => o.id !== id);
  D.recalc();
  save();
  log("Removeu pedido " + oid(id));
  refresh();
}

// Formulário "Lançar pedido": valida, cria o cliente se for novo e adiciona o pedido
$("#fo").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!need()) return;
  const f = Object.fromEntries(new FormData(e.target));
  const q = +f.qty, pr = +f.price, dl = +f.dl, nps = f.nps === "" ? -1 : +f.nps;
  const name = f.cli.trim().replace(/\s+/g, " ");
  const err =
    !/^\d{4}-\d{2}-\d{2}$/.test(f.date) || isNaN(Date.parse(f.date)) ? "Informe uma data válida."
    : !Number.isInteger(q) || q < 1 ? "Quantidade inválida."
    : !(pr > 0) ? "Informe um preço maior que zero."
    : name.length < 5 ? "Informe o nome do cliente (mínimo de 5 caracteres)."
    : !(dl >= 1 && dl <= 60) ? "O prazo deve ficar entre 1 e 60 dias."
    : nps > 10 ? "A nota deve ficar entre 0 e 10."
    : "";
  if (err) return say("#fo-msg", err, false);

  // Cliente: usa o existente (pelo nome) ou cria um novo com a UF escolhida
  let ci = D.customers.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  if (ci < 0) {
    ci = D.customers.length;
    const c = { id: ci, uf: f.uf, reg: D.UF[f.uf][0], w: 0.5, name };
    D.customers.push(c);
    delta.cust.push(c);
  }
  const o = {
    id: 1e6 + delta.n++, d: f.date, c: ci, p: +f.prod, q, pr, ch: f.ch, pay: f.pay, st: f.st, dl,
    nps: f.st === "Entregue" ? nps : -1, // só pedidos entregues podem ter nota
  };
  D.orders.push(o);
  sortO();
  delta.add.push(o);
  D.recalc();
  save();
  log("Lançou pedido " + oid(o.id) + " (" + D.products[o.p].name + ")");
  e.target.reset();
  setDefaults();
  refresh();
  say("#fo-msg", "Pedido " + oid(o.id) + " lançado: " + brl(q * pr) + " em " + br(f.date) + ".", true);
});
$("#fo").prod.addEventListener("change", () => { $("#fo").price.value = D.products[+$("#fo").prod.value].price; }); // sugere o preço do produto

// Formulário "Cadastrar produto"
$("#fprod").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!need()) return;
  const f = Object.fromEntries(new FormData(e.target));
  const price = +f.price, cost = +f.cost, stock = +f.stock, name = f.name.trim();
  const err =
    name.length < 3 ? "Informe o nome do produto."
    : D.products.some((p) => p.name.toLowerCase() === name.toLowerCase()) ? "Já existe um produto com esse nome."
    : !(price > 0) ? "Informe um preço maior que zero."
    : !(cost >= 0 && cost < price) ? "O custo deve ser menor que o preço."
    : !(stock >= 0) ? "Estoque inválido."
    : "";
  if (err) return say("#fprod-msg", err, false);
  const p = { name, cat: f.cat, price, cost, w: 1, stock: Math.round(stock) };
  D.products.push(p);
  delta.prod.push(p);
  D.recalc();
  save();
  log("Cadastrou produto " + name);
  e.target.reset();
  refresh();
  say("#fprod-msg", "Produto cadastrado: " + name + ". Já aparece na lista de lançamento.", true);
});

// Botão "Restaurar dados originais": apaga o delta salvo (pede confirmação com um segundo clique)
$("#d-reset").addEventListener("click", (e) => {
  if (!need()) return;
  if (!confirmReset) {
    confirmReset = true;
    e.target.textContent = "Clique de novo para confirmar";
    return;
  }
  try { localStorage.removeItem(KEY); } catch (x) { /* ignora */ }
  location.reload();
});

/* ----------------------------------------------------------------------------
   8. NAVEGAÇÃO, LOGIN E SESSÃO
   ---------------------------------------------------------------------------- */

// Troca de tela: mostra só a seção escolhida, destaca o ícone e redesenha
/** Alterna a visualização respeitando as permissões do perfil. */
function go(v) {
  view = v;
  $$("[data-view]").forEach((s) => { s.hidden = s.dataset.view !== v; });
  $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  $("#title").textContent = VIEWS[v];
  form.hidden = v === "admin" || v === "dados"; // essas telas não usam os filtros
  if (v === "dados") { fillLists(); setDefaults(); }
  if (v === "admin") log("Consultou painel de administração");
  render();
}

// Entra no sistema: libera só as telas do perfil e abre a Visão geral nos últimos 6 meses
function start(u) {
  user = u;
  store.set("dv_user", u.u);
  $("#login").hidden = true;
  $("#app").hidden = false;
  $("#who").replaceChildren(
    Object.assign(new Image(), { src: u.photo, className: "me", alt: "" }),
    document.createTextNode(u.n + " · " + u.role)
  );
  $("#export").hidden = !u.csv; // exportar CSV depende de permissão
  $("#nav").replaceChildren(
    ...u.views.map((v) => {
      const b = document.createElement("button");
      b.dataset.v = v;
      b.title = VIEWS[v];
      b.textContent = ICON[v];
      b.addEventListener("click", () => go(v));
      return b;
    })
  );
  log("Login");
  setRange(180, true);
  go("geral");
}

/* ----------------------------------------------------------------------------
   9. INICIALIZAÇÃO E EVENTOS
   ---------------------------------------------------------------------------- */

// Lista de contas de demonstração na tela de login (clicar preenche e-mail e senha)
$("#creds").replaceChildren(
  ...USERS.map((u) => {
    const li = document.createElement("li"), b = document.createElement("button");
    const av = new Image(), t = document.createElement("span");
    b.type = "button";
    av.className = "av";
    av.alt = "";
    av.src = u.photo;
    t.innerHTML = "<b></b><small></small><small></small>";
    t.children[0].textContent = u.n + " · " + u.role;
    t.children[1].textContent = u.u + "  |  senha: " + u.p;
    t.children[2].textContent = u.desc;
    b.append(av, t);
    b.addEventListener("click", () => {
      $("#lf").u.value = u.u;
      $("#lf").p.value = u.p;
      $("#lerr").hidden = true;
    });
    li.appendChild(b);
    return li;
  })
);
$("#fp").addEventListener("click", (e) => { // "Esqueceu a senha?"
  e.preventDefault();
  $("#lerr").textContent = "Ambiente de demonstração: use uma das contas listadas abaixo.";
  $("#lerr").hidden = false;
});

// Login: confere e-mail e senha na lista USERS
$("#lf").addEventListener("submit", (e) => {
  e.preventDefault();
  const u = USERS.find((x) => x.u === $("#lf").u.value.trim().toLowerCase() && x.p === $("#lf").p.value);
  $("#lerr").hidden = !!u;
  $("#lerr").textContent = "E-mail ou senha incorretos.";
  if (u) start(u);
});
$("#out").addEventListener("click", () => { store.set("dv_user", ""); location.reload(); }); // sair

// Reaplica as alterações salvas e prepara os filtros do cabeçalho
applyDelta();
O.categories.forEach((v) => form.category.add(new Option(v, v)));
O.regions.forEach((v) => form.region.add(new Option(v, v)));
O.channels.forEach((v) => form.channel.add(new Option(v, v)));
["start", "end"].forEach((n) => { form[n].min = O.min; form[n].max = O.max; });
form.addEventListener("submit", (e) => { e.preventDefault(); render(); });
$("#reset").addEventListener("click", () => { form.reset(); render(); }); // "Limpar" = período total
$$("[data-p]").forEach((b) => b.addEventListener("click", () => setRange(+b.dataset.p))); // atalhos 30 dias a 12 meses

// Exportar CSV: baixa os pedidos do filtro atual (BOM \ufeff para o Excel abrir com acentos)
$("#export").addEventListener("click", () => {
  if (!user.csv) return;
  const L = ["data,produto,categoria,regiao,canal,pagamento,status,quantidade,preco_unitario,total"];
  Calc.filter(D, filters()).forEach((o) => {
    const p = D.products[o.p];
    L.push([o.d, `"${p.name}"`, p.cat, D.customers[o.c].reg, o.ch, o.pay, o.st, o.q, o.pr, (o.q * o.pr).toFixed(2)].join(","));
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + L.join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = "vendas.csv";
  a.click();
  URL.revokeObjectURL(a.href);
  log("Exportou CSV");
});

// Se já havia login nesta aba, entra direto
const saved = USERS.find((x) => x.u === store.get("dv_user"));
if (saved) start(saved);
