# Como ativar a integração após a validação

**Atenção:** esta branch é de teste. O GitHub Pages **não consegue acessar o Drive sozinho**. A versão de produção do Apps Script precisa expor a API autenticada antes do merge para a branch main.

## Apps Script

Use o **Codigo.gs existente** (não substitua por `DriveProjetos.gs` sozinho). Em uma cópia de teste do projeto, mantendo a mesma planilha e propriedades:

1. Inclua o nome `scDriveProjetosApi` na lista `API_FUNCOES` autorizada para a PWA.
2. No `switch (c.fn)` de `apiChamar`, acrescente:

```javascript
case 'scDriveProjetosApi':
  r = scDriveProjetosApi(args[0]);
  break;
```

3. Anexe o conteúdo de `integracoes/DriveProjetos.gs` ao final do `Codigo.gs`. Isso mantém o projeto Apps Script com os dois arquivos originais (`Codigo.gs` e `Index.html`) e **não altera as funções antigas**.
4. Publique uma **nova versão** da implantação /exec e confirme a função pela conta proprietária. Em Google Apps Script, salvar o editor não atualiza /exec.
5. A função exige `exigirAcesso()`; não remova a autenticação nem torne públicos arquivos ou pastas.

## Testes de aceitação em uma pasta de teste

- Abrir projeto que já possui link `drive.google.com/drive/folders/...` na descrição; não criar pasta duplicada.
- Listar uma pasta com arquivo PDF e uma subpasta; conferir busca e prévia.
- Fazer upload de um arquivo de até 3 MB; confirmar existência no Drive.
- Vincular documento existente de outra pasta; ele deve continuar no local original.
- Associar documento a uma tarefa do projeto; impedir associação a tarefa de outro projeto.
- Renomear e mover um arquivo do projeto; impedir mover/renomear arquivo de fora.
- Organizar manualmente; só itens na raiz do projeto são movidos.
- Habilitar/desabilitar organização automática; confirmar gatilho horário e não mover arquivos sem consentimento.
- Confirmar que cancelar/desvincular não apaga nenhum arquivo.
- Verificar login e carregamento após fechar e reabrir o app no PC e Android.

## GitHub Pages

Somente depois de confirmar a API, publicar o conjunto da branch:
- `index.html` (Projeto > Arquivos e versão 2026-11-20d).
- `sc-drive-projetos.js` (explorador).
- `sw.js` (cache versão 2026-11-20d).

A branch de produção main permanece com a versão anterior até essa validação.

## Escopo

Arquivos existentes não são apagados; a nova tabela auxiliar `ProjetoArquivos` guarda vínculos. Upload limitado a 3 MB. A organização automática é desligada por padrão. A integração não consegue garantir prévia embutida quando o Google Drive a bloqueia: mantém botão Abrir no Drive.

**Estado atual:** código incorporado em branch no GitHub, mas API ainda não implantada no Apps Script, sem teste real contra o Drive da conta.
