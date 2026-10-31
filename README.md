# DataView · Inteligência Comercial

Dashboard analítico de vendas (loja fictícia **Nova Loja**, de jan/2025 a out/2026) em HTML, CSS e JavaScript puro, com Chart.js.
Funciona sem servidor e sem instalação: basta abrir o `index.html`.

## Acessos de demonstração

| Cargo | E-mail | Senha | O que pode fazer |
|---|---|---|---|
| Diretora Comercial | cecilia.brandao@dataview.com.br | Diretoria@2026 | Painéis e exportação de relatórios |
| Analista de Dados Sênior | otavio.fontes@dataview.com.br | Dados@2026 | Painéis, exportação e **gestão de dados** (adicionar e remover) |
| Gerente de TI e Governança | renata.sampaio@dataview.com.br | TI@2026 | Painéis, usuários e registro de auditoria |
| Avaliador convidado | banca@dataview.com.br | Banca@2026 | Somente leitura, sem exportação |

> A autenticação é **apenas demonstrativa**, feita no navegador. Em um sistema real, ela deve ficar em um backend.

## O que o projeto entrega

- **Dados fictícios realistas** (~12 mil pedidos, 900 clientes, 15 produtos, 5 canais, 13 estados) gerados com semente fixa, com sazonalidade, Black Friday, Dia das Mães, queda de plataforma e falha de gateway.
- **Visão geral:** 8 KPIs com variação sobre o período anterior, receita mensal com **projeção por regressão linear e ajuste sazonal (R²)**, canais, regiões, **insights automáticos** e **detecção de dias atípicos (z-score)**.
- **Clientes:** segmentação **RFM**, receita por estado e maiores clientes (nomes fictícios).
- **Produtos:** **curva ABC (Pareto)**, margem e **cobertura de estoque** com alerta de reposição.
- **Gestão de dados** (apenas perfil de analista de dados): lançar pedidos, cadastrar produtos e remover lançamentos, com validação. Tudo é recalculado em tempo real e fica salvo no navegador (`localStorage`); há botão para restaurar a base original.
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

## Como publicar no GitHub Pages

1. Envie os arquivos para um repositório.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. O site ficará em `https://SEU-USUARIO.github.io/NOME-DO-REPOSITORIO/`.
