# DataView · Inteligência Comercial

Dashboard analítico de vendas (loja fictícia **Vende+**, de jan/2025 a out/2026) em HTML, CSS e JavaScript puro, com Chart.js.
Funciona sem servidor e sem instalação: basta abrir o `index.html` ou acessar o site (https://data-view.htmly.com.br/).

## Acessos de demonstração

| Cargo | E-mail | Senha | O que pode fazer |
|---|---|---|---|
| Diretora Comercial | cecilia.brandao@dataview.com.br | Diretoria@2026 | Painéis e exportação de relatórios |
| Analista de Dados Sênior | otavio.fontes@dataview.com.br | Dados@2026 | Painéis, exportação e **gestão de dados** (adicionar e remover) |
| Gerente de TI e Governança | renata.sampaio@dataview.com.br | TI@2026 | Painéis, usuários e registro de auditoria |

> A autenticação é **apenas demonstrativa**, feita no navegador. Em um sistema real, ela fica em um backend.

## O que o projeto entrega

- **Dados fictícios realistas** (~12 mil pedidos, 900 clientes, 15 produtos, 5 canais, 13 estados) gerados com semente fixa, com sazonalidade, Black Friday, Dia das Mães, queda de plataforma e falha de gateway.
- **Visão geral:** 8 KPIs com variação sobre o período anterior, receita mensal com **projeção por regressão linear e ajuste sazonal (R²)**, canais, regiões, **insights automáticos** e **detecção de dias atípicos (z-score)**.
- **Clientes:** segmentação **RFM**, receita por estado e maiores clientes (nomes fictícios).
- **Produtos:** **curva ABC (Pareto)**, margem e **cobertura de estoque** com alerta de reposição.
- **Gestão de dados** (apenas perfil de analista de dados): lançar pedidos, cadastrar produtos e remover lançamentos, com validação. Tudo é recalculado em tempo real e fica salvo no navegador (`localStorage`); há botão para restaurar a base original.
- **Avatares anônimos** (ilustrações em silhueta, sem fotos de pessoas reais) nas contas de demonstração, no cabeçalho e na tela de administração.
- **Administração** (apenas TI): usuários, perfis e registro de auditoria.
- Filtros por período, categoria, região e canal, atalhos de 30 dias a 12 meses, exportação CSV e tema claro/escuro automático.

## Estrutura

```
index.html        interface, login e telas
css/style.css     estilos
js/data.js        gerador de dados fictícios
js/calc.js        análises (KPIs, projeção, RFM, ABC, insights)
js/app.js         autenticação, navegação, gestão de dados e gráficos
img/              logo, favicon e imagem de compartilhamento
vendor/           Chart.js (local, funciona offline)
```

> Todos os nomes de pessoas (usuários e clientes) são fictícios.

## Como o código está organizado

Cada arquivo é dividido em seções numeradas e comentadas.

| Arquivo | Para que serve | Onde mexer para... |
|---|---|---|
| `js/data.js` | Gera os dados fictícios (semente fixa) | mudar produtos, estados, eventos, sazonalidade ou o período |
| `js/calc.js` | Cálculos: KPIs, projeção, anomalias, RFM, curva ABC, insights | alterar uma regra de análise |
| `js/app.js` | Interface: usuários e permissões, telas, gestão de dados, login | adicionar um usuário ou uma tela |
| `css/style.css` | Visual em 10 seções (cores da marca no início) | mudar cores e layout |
| `index.html` | Estrutura da página, comentada por tela | adicionar um bloco na tela |

Exemplos rápidos:

- **Novo usuário:** acrescente um item em `USERS` no `js/app.js` (seção 3). O campo `views` define as telas liberadas; `edit: true` libera a gestão de dados.
- **Mudar as cores da marca:** edite as variáveis da seção 1 do `css/style.css` e a lista `COLORS` do `js/app.js`.
- **Mudar o período dos dados:** ajuste as datas do laço de pedidos na seção 4 do `js/data.js`.

## Guia de manutenção

O projeto não exige compilação, dependências instaladas ou um servidor de aplicação. Os arquivos são carregados diretamente pelo navegador, na ordem indicada em `index.html`:

1. `vendor/chart.umd.js`: biblioteca Chart.js distribuída localmente.
2. `js/data.js`: geração e recomputação dos dados fictícios.
3. `js/calc.js`: cálculos independentes da interface.
4. `js/app.js`: interação com o DOM, gráficos e armazenamento local.

### Convenções

- **HTML:** identação hierárquica e comentários apenas para identificar regiões da página.
- **CSS:** regras agrupadas por tema, componente e responsividade; a ordem da cascata é preservada.
- **JavaScript:** seções por responsabilidade e comentários curtos para funções analíticas e operações de estado.
- **Bibliotecas:** não edite `vendor/chart.umd.js` para não comprometer o código.
- **Dados:** não altere a ordem das chamadas ao gerador pseudoaleatório em `js/data.js` sem desejar mudar os números da demonstração para teste.


> **Segurança:** usuários e senhas de demonstração aparecem no código-fonte; `localStorage` não é banco de dados nem mecanismo seguro de autenticação. Não utilize esta implementação para armazenar dados pessoais ou controlar acessos reais.
