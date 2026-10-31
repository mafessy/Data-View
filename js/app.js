const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const D = window.DATA, O = Calc.options(D), f1 = Calc.f1;
const brl = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
const num = (v) => new Intl.NumberFormat("pt-BR").format(Math.round(v));
const COLORS = ["#5b78e0", "#4cc0c8", "#8f78d8", "#26375a", "#f0a850", "#9aa1c4"];
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mlabel = (k) => MES[+k.slice(5) - 1] + "/" + k.slice(2, 4);
const VIEWS = { geral: "Visão geral", clientes: "Clientes", produtos: "Produtos", dados: "Gestão de dados", admin: "Administração" };
const ICON = { geral: "▦", clientes: "☺", produtos: "☰", dados: "✎", admin: "⚙" };
/* Atenção: autenticação apenas demonstrativa no navegador (não use em produção). */
const USERS = [
  { u: "cecilia.brandao@dataview.com.br", p: "Diretoria@2026", n: "Cecília Albuquerque Brandão", role: "Diretora Comercial", desc: "Painéis e exportação de relatórios", views: ["geral", "clientes", "produtos"], csv: true },
  { u: "otavio.fontes@dataview.com.br", p: "Dados@2026", n: "Otávio Nakamura Fontes", role: "Analista de Dados Sênior", desc: "Painéis, exportação e gestão de dados (adicionar e remover)", views: ["geral", "clientes", "produtos", "dados"], csv: true, edit: true },
  { u: "renata.sampaio@dataview.com.br", p: "TI@2026", n: "Renata Pimentel Sampaio", role: "Gerente de TI e Governança", desc: "Painéis, usuários e registro de auditoria", views: ["geral", "clientes", "produtos", "admin"], csv: true },
  { u: "banca@dataview.com.br", p: "Banca@2026", n: "Convidado Banca Avaliadora", role: "Avaliador convidado", desc: "Somente leitura, sem exportação", views: ["geral", "clientes", "produtos"], csv: false }
];
const form = $("#filters"), charts = {}; let user = null, view = "geral";

const store = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { sessionStorage.setItem(k, v); } catch (e) { /* ignora */ } } };
const logs = [];
function log(a) { logs.unshift([new Date().toISOString().slice(0, 16).replace("T", " "), user.u, a]); }

function tbl(sel, head, rows) {
  const t = $(sel); t.replaceChildren();
  const h = t.createTHead().insertRow();
  head.forEach((x) => { const th = document.createElement("th"); th.textContent = x; h.appendChild(th); });
  const b = t.createTBody();
  rows.forEach((r) => { const tr = b.insertRow(); r.forEach((c) => { const td = tr.insertCell();
    if (c && c.b) { const s = document.createElement("span"); s.className = "b " + c.c; s.textContent = c.b; td.appendChild(s); }
    else if (c && c.btn) { const k = document.createElement("button"); k.type = "button"; k.className = "sm danger"; k.textContent = c.btn; k.addEventListener("click", c.fn); td.appendChild(k); } else td.textContent = c; }); });
}
function draw(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($("#" + id), cfg); }
const showError = (t) => { $("#msg").textContent = t || ""; $("#msg").hidden = !t; };
function filters() { const f = {}; new FormData(form).forEach((v, k) => { if (v) f[k] = String(v).trim(); }); return f; }
const money = { ticks: { callback: (v) => "R$ " + num(v / 1000) + "k" } };

function render() {
  const f = filters(), err = Calc.validate(f, O); showError(err); if (err) return;
  const css = getComputedStyle(document.documentElement);
  Chart.defaults.color = css.getPropertyValue("--muted"); Chart.defaults.borderColor = css.getPropertyValue("--line");
  const rows = Calc.filter(D, f), A = Calc.abc(D, rows), base = { responsive: true, maintainAspectRatio: false };
  if (view === "geral") {
    const s = Calc.summary(D, rows), p = Calc.prev(D, f, O);
    const K = [["Receita", "revenue", brl], ["Lucro bruto", "profit", brl], ["Margem", "margin", (v) => f1(v) + "%"], ["Pedidos", "orders", num],
      ["Ticket médio", "ticket", brl], ["NPS", "nps", (v) => String(v)], ["Cancel. + devol.", "loss", (v) => f1(v) + "%", 1], ["Prazo médio", "delivery", (v) => f1(v) + " dias", 1]];
    $("#kpis").replaceChildren(...K.map(([l, k, fn, inv]) => { const a = document.createElement("article"); a.className = "card";
      const d = p && p[k] > 0 ? (s[k] / p[k] - 1) * 100 : null;
      const dl = d === null ? "sem período anterior" : (d >= 0 ? "▲ " : "▼ ") + f1(Math.abs(d)) + "% vs. período anterior";
      a.innerHTML = "<span></span><strong></strong><em></em>"; a.children[0].textContent = l; a.children[1].textContent = fn(s[k]);
      a.children[2].textContent = dl; a.children[2].className = d === null ? "" : (d > 0) !== !!inv ? "up" : "down"; return a; }));
    const m = Calc.groupBy(D, rows, (o) => o.d.slice(0, 7)).sort((a, b) => (a.label < b.label ? -1 : 1)), fc = Calc.forecast(m);
    const labels = m.map((x) => mlabel(x.label)).concat(fc ? fc.next.map((x) => mlabel(x.label)) : []);
    $("#fc-note").textContent = fc ? "Tendência por regressão linear (R² = " + f1(fc.r2) + ")" + (fc.seasonal ? " com ajuste sazonal" : "") + " e projeção dos próximos 3 meses." : "Amplie o período (4+ meses) para ver a projeção.";
    draw("c-month", { type: "line", options: { ...base, scales: { y: money }, plugins: { legend: { position: "bottom" } } }, data: { labels, datasets: [
      { label: "Receita", data: m.map((x) => x.revenue), borderColor: COLORS[0], backgroundColor: "rgba(91,120,224,.14)", fill: true, tension: .35 },
      ...(fc ? [{ label: "Tendência e projeção", data: fc.fit.concat(fc.next.map((x) => x.value)), borderColor: COLORS[3], borderDash: [6, 5], pointRadius: 0 }] : [])] } });
    const ch = Calc.byRev(Calc.groupBy(D, rows, (o) => o.ch)), rg = Calc.byRev(Calc.groupBy(D, rows, (o) => D.customers[o.c].reg));
    draw("c-ch", { type: "doughnut", options: { ...base, cutout: "62%", plugins: { legend: { position: "right" } } }, data: { labels: ch.map((x) => x.label), datasets: [{ data: ch.map((x) => x.revenue), backgroundColor: COLORS }] } });
    draw("c-reg", { type: "bar", options: { ...base, indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: money } }, data: { labels: rg.map((x) => x.label), datasets: [{ data: rg.map((x) => x.revenue), backgroundColor: COLORS[1], borderRadius: 6 }] } });
    $("#ins").replaceChildren(...Calc.insights(D, rows, A).map((t) => { const li = document.createElement("li"); li.textContent = t; return li; }));
    tbl("#t-an", ["Data", "Receita", "z", "Evento"], Calc.anomalies(D, rows).map((x) => [x.d.split("-").reverse().join("/"), brl(x.v), (x.z > 0 ? "+" : "") + f1(x.z), x.ev || "Sem evento conhecido"]));
  } else if (view === "clientes") {
    const r = Calc.rfm(D, rows, O), uf = Calc.byRev(Calc.groupBy(D, rows, (o) => D.customers[o.c].uf));
    draw("c-rfm", { type: "doughnut", options: { ...base, cutout: "58%", plugins: { legend: { position: "right" } } }, data: { labels: r.segs.map((x) => x.label), datasets: [{ data: r.segs.map((x) => x.n), backgroundColor: COLORS }] } });
    draw("c-uf", { type: "bar", options: { ...base, plugins: { legend: { display: false } }, scales: { y: money } }, data: { labels: uf.map((x) => x.label), datasets: [{ data: uf.map((x) => x.revenue), backgroundColor: COLORS[2], borderRadius: 6 }] } });
    tbl("#t-rfm", ["Segmento", "Clientes", "Receita", "Ticket/cliente"], r.segs.map((x) => [x.label, num(x.n), brl(x.revenue), brl(x.revenue / x.n)]));
    tbl("#t-cli", ["Cliente", "UF", "Pedidos", "Receita", "Segmento"], r.top.map((x) => [D.customers[x.id].name, D.customers[x.id].uf, x.f, brl(x.m), x.seg]));
  } else if (view === "produtos") {
    draw("c-abc", { data: { labels: A.map((x) => x.name), datasets: [
      { type: "bar", label: "Receita", data: A.map((x) => x.revenue), backgroundColor: A.map((x) => ({ A: COLORS[0], B: COLORS[2], C: COLORS[5] })[x.cls]), borderRadius: 6, yAxisID: "y" },
      { type: "line", label: "% acumulado", data: A.map((x) => x.cum), borderColor: COLORS[3], yAxisID: "y1" }] },
      options: { ...base, plugins: { legend: { position: "bottom" } }, scales: { y: money, y1: { position: "right", min: 0, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: (v) => v + "%" } } } } });
    tbl("#t-prod", ["Produto", "Classe", "Receita", "Margem", "Estoque", "Cobertura"], A.map((x) => [x.name, { b: x.cls, c: "c" + x.cls }, brl(x.revenue), f1(x.margin) + "%", num(x.stock),
      { b: Math.round(x.cover) + " dias" + (x.cover < 12 ? " · reposição" : ""), c: x.cover < 12 ? "bad" : "ok" }]));
  } else if (view === "dados") { renderDados();
  } else if (view === "admin") {
    tbl("#t-users", ["Usuário", "Nome", "Cargo", "Acesso"], USERS.map((x) => [x.u, x.n, x.role, x.desc]));
    tbl("#t-log", ["Data e hora", "Usuário", "Ação"], logs.concat(D.audit.slice().reverse()).slice(0, 12));
  }
}
/* ---------- Gestão de dados (somente perfis com permissão "edit"); alterações salvas no navegador ---------- */
const KEY = "dv_delta_v1"; let delta = { add: [], del: [], cust: [], prod: [], n: 0 }, confirmReset = false;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(delta)); } catch (e) { /* ignora */ } };
const sortO = () => D.orders.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.id - b.id));
const oid = (id) => "#" + (id >= 1e6 ? "M" + (id - 1e6 + 1) : id + 1);
function applyDelta() {
  let d = null; try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) { /* ignora */ }
  if (d && d.add) { delta = d; const del = new Set(d.del); D.products.push(...d.prod); D.customers.push(...d.cust);
    D.orders = D.orders.filter((o) => !del.has(o.id)).concat(d.add); sortO(); D.recalc(); }
  Object.assign(O, Calc.options(D));
}
function refresh() { Object.assign(O, Calc.options(D)); ["start", "end"].forEach((n) => { form[n].min = O.min; form[n].max = O.max; }); fillLists(); render(); }
function setRange(n, quiet) { form.end.value = O.max; form.start.value = new Date(Date.parse(O.max) - (n - 1) * 864e5).toISOString().slice(0, 10); if (!quiet) render(); }
function fillLists() {
  const f = $("#fo"), cur = f.prod.value;
  f.prod.replaceChildren(...D.products.map((p, i) => new Option(p.name, i))); if (cur) f.prod.value = cur;
  if (!f.uf.options.length) Object.keys(D.UF).forEach((u) => f.uf.add(new Option(u, u)));
  if (!f.ch.options.length) O.channels.forEach((c) => f.ch.add(new Option(c, c)));
  if (!$("#fprod").cat.options.length) O.categories.forEach((c) => $("#fprod").cat.add(new Option(c, c)));
  $("#dl-cli").replaceChildren(...D.customers.map((c) => { const o = document.createElement("option"); o.value = c.name; return o; }));
}
function setDefaults() { const f = $("#fo"); f.date.value = O.max; f.price.value = D.products[+f.prod.value || 0].price; f.qty.value = 1; f.dl.value = 3; f.cli.value = ""; f.nps.value = ""; }
const need = () => { if (user && user.edit) return true; showError("Seu perfil não tem permissão para alterar dados."); return false; };
const say = (id, t, ok) => { const m = $(id); m.textContent = t; m.className = "fmsg " + (ok ? "ok" : "bad"); };
function renderDados() {
  const ch = delta.add.length + delta.del.length + delta.prod.length;
  $("#d-count").textContent = num(D.orders.length) + " pedidos · " + num(D.customers.length) + " clientes · " + D.products.length + " produtos · período " + O.min.split("-").reverse().join("/") + " a " + O.max.split("-").reverse().join("/") + (ch ? " · " + ch + (ch === 1 ? " alteração local" : " alterações locais") : "");
  tbl("#t-rec", ["ID", "Data", "Cliente", "Produto", "Qtd", "Total", "Status", "Origem", ""], D.orders.slice(-15).reverse().map((o) => [oid(o.id), o.d.split("-").reverse().join("/"),
    D.customers[o.c].name, D.products[o.p].name, o.q, brl(o.q * o.pr), { b: o.st, c: o.st === "Entregue" ? "ok" : "bad" }, o.id >= 1e6 ? "Manual" : "Base", { btn: "Remover", fn: () => removeOrder(o.id) }]));
}
function removeOrder(id) {
  if (!need()) return; const i = delta.add.findIndex((o) => o.id === id);
  if (i >= 0) delta.add.splice(i, 1); else delta.del.push(id);
  D.orders = D.orders.filter((o) => o.id !== id); D.recalc(); save(); log("Removeu pedido " + oid(id)); refresh();
}
$("#fo").addEventListener("submit", (e) => {
  e.preventDefault(); if (!need()) return;
  const f = Object.fromEntries(new FormData(e.target)), q = +f.qty, pr = +f.price, dl = +f.dl, nps = f.nps === "" ? -1 : +f.nps, name = f.cli.trim().replace(/\s+/g, " ");
  const err = !/^\d{4}-\d{2}-\d{2}$/.test(f.date) || isNaN(Date.parse(f.date)) ? "Informe uma data válida." : !Number.isInteger(q) || q < 1 ? "Quantidade inválida." :
    !(pr > 0) ? "Informe um preço maior que zero." : name.length < 5 ? "Informe o nome do cliente (mínimo de 5 caracteres)." :
    !(dl >= 1 && dl <= 60) ? "O prazo deve ficar entre 1 e 60 dias." : nps > 10 ? "A nota deve ficar entre 0 e 10." : "";
  if (err) return say("#fo-msg", err, false);
  let ci = D.customers.findIndex((c) => c.name.toLowerCase() === name.toLowerCase());
  if (ci < 0) { ci = D.customers.length; const c = { id: ci, uf: f.uf, reg: D.UF[f.uf][0], w: .5, name }; D.customers.push(c); delta.cust.push(c); }
  const o = { id: 1e6 + delta.n++, d: f.date, c: ci, p: +f.prod, q, pr, ch: f.ch, pay: f.pay, st: f.st, dl, nps: f.st === "Entregue" ? nps : -1 };
  D.orders.push(o); sortO(); delta.add.push(o); D.recalc(); save(); log("Lançou pedido " + oid(o.id) + " (" + D.products[o.p].name + ")");
  e.target.reset(); setDefaults(); refresh(); say("#fo-msg", "Pedido " + oid(o.id) + " lançado: " + brl(q * pr) + " em " + f.date.split("-").reverse().join("/") + ".", true);
});
$("#fo").prod.addEventListener("change", () => { $("#fo").price.value = D.products[+$("#fo").prod.value].price; });
$("#fprod").addEventListener("submit", (e) => {
  e.preventDefault(); if (!need()) return;
  const f = Object.fromEntries(new FormData(e.target)), price = +f.price, cost = +f.cost, stock = +f.stock, name = f.name.trim();
  const err = name.length < 3 ? "Informe o nome do produto." : D.products.some((p) => p.name.toLowerCase() === name.toLowerCase()) ? "Já existe um produto com esse nome." :
    !(price > 0) ? "Informe um preço maior que zero." : !(cost >= 0 && cost < price) ? "O custo deve ser menor que o preço." : !(stock >= 0) ? "Estoque inválido." : "";
  if (err) return say("#fprod-msg", err, false);
  const p = { name, cat: f.cat, price, cost, w: 1, stock: Math.round(stock) }; D.products.push(p); delta.prod.push(p); D.recalc(); save(); log("Cadastrou produto " + name);
  e.target.reset(); refresh(); say("#fprod-msg", "Produto cadastrado: " + name + ". Já aparece na lista de lançamento.", true);
});
$("#d-reset").addEventListener("click", (e) => {
  if (!need()) return; if (!confirmReset) { confirmReset = true; e.target.textContent = "Clique de novo para confirmar"; return; }
  try { localStorage.removeItem(KEY); } catch (x) { /* ignora */ } location.reload();
});

function go(v) {
  view = v; $$("[data-view]").forEach((s) => { s.hidden = s.dataset.view !== v; });
  $$("#nav button").forEach((b) => b.classList.toggle("active", b.dataset.v === v));
  $("#title").textContent = VIEWS[v]; form.hidden = v === "admin" || v === "dados"; if (v === "dados") { fillLists(); setDefaults(); } if (v === "admin") log("Consultou painel de administração");
  render();
}
function start(u) {
  user = u; store.set("dv_user", u.u); $("#login").hidden = true; $("#app").hidden = false;
  $("#who").textContent = u.n + " · " + u.role; $("#export").hidden = !u.csv;
  $("#nav").replaceChildren(...u.views.map((v) => { const b = document.createElement("button"); b.dataset.v = v; b.title = VIEWS[v]; b.textContent = ICON[v];
    b.addEventListener("click", () => go(v)); return b; }));
  log("Login"); setRange(180, true); go("geral");
}
$("#creds").replaceChildren(...USERS.map((u) => { const li = document.createElement("li"), b = document.createElement("button"), av = document.createElement("span"), t = document.createElement("span");
  b.type = "button"; av.className = "av"; av.textContent = u.n.split(" ").filter((x) => x.length > 2).slice(0, 2).map((x) => x[0]).join("");
  t.innerHTML = "<b></b><small></small><small></small>"; t.children[0].textContent = u.n + " · " + u.role; t.children[1].textContent = u.u + "  |  senha: " + u.p; t.children[2].textContent = u.desc;
  b.append(av, t); b.addEventListener("click", () => { $("#lf").u.value = u.u; $("#lf").p.value = u.p; $("#lerr").hidden = true; }); li.appendChild(b); return li; }));
$("#fp").addEventListener("click", (e) => { e.preventDefault(); $("#lerr").textContent = "Ambiente de demonstração: use uma das contas listadas abaixo."; $("#lerr").hidden = false; });
$("#lf").addEventListener("submit", (e) => {
  e.preventDefault(); const u = USERS.find((x) => x.u === $("#lf").u.value.trim().toLowerCase() && x.p === $("#lf").p.value);
  $("#lerr").hidden = !!u; $("#lerr").textContent = "E-mail ou senha incorretos."; if (u) start(u);
});
$("#out").addEventListener("click", () => { store.set("dv_user", ""); location.reload(); });
applyDelta();
O.categories.forEach((v) => form.category.add(new Option(v, v)));
O.regions.forEach((v) => form.region.add(new Option(v, v)));
O.channels.forEach((v) => form.channel.add(new Option(v, v)));
["start", "end"].forEach((n) => { form[n].min = O.min; form[n].max = O.max; });
form.addEventListener("submit", (e) => { e.preventDefault(); render(); });
$("#reset").addEventListener("click", () => { form.reset(); render(); });
$$("[data-p]").forEach((b) => b.addEventListener("click", () => setRange(+b.dataset.p)));
$("#export").addEventListener("click", () => {
  if (!user.csv) return;
  const L = ["data,produto,categoria,regiao,canal,pagamento,status,quantidade,preco_unitario,total"];
  Calc.filter(D, filters()).forEach((o) => { const p = D.products[o.p];
    L.push([o.d, `"${p.name}"`, p.cat, D.customers[o.c].reg, o.ch, o.pay, o.st, o.q, o.pr, (o.q * o.pr).toFixed(2)].join(",")); });
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["\ufeff" + L.join("\n")], { type: "text/csv;charset=utf-8" }));
  a.download = "vendas.csv"; a.click(); URL.revokeObjectURL(a.href); log("Exportou CSV");
});
const saved = USERS.find((x) => x.u === store.get("dv_user")); if (saved) start(saved);
