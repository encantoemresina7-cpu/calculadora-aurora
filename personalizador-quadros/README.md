# Personalizador de quadros infantis

Mesmo editor visual para carregar uma arte, digitar o nome, escolher fonte e cor, arrastar a posição, ajustar formato e moldura e baixar uma imagem para enviar ao cliente.

## Publicação no Render

Crie um Static Site com estas configurações:

- Repository: `https://github.com/encantoemresina7-cpu/calculadora-aurora`
- Branch: `personalizador-quadros-render`
- Build command: `node personalizador-quadros/check.mjs`
- Publish directory: `personalizador-quadros`
- Environment: `SKIP_INSTALL_DEPS=true`

O endereço público do serviço abre sem login do ChatGPT. O site usa HTML, CSS e JavaScript, sem servidor próprio ou dependências de instalação. Não há configurações secretas.

## Uso no celular

Abra o link do Render no Chrome ou Safari. Toque em **Editar nome**, faça os ajustes e baixe a prévia. O botão **Compartilhar imagem** abre o menu de compartilhamento de arquivos quando o navegador oferece esse recurso; nos demais casos, baixa a imagem para anexar no WhatsApp.

- Prévia: JPG com cenário e moldura, 1600 × 1600 pixels.
- Arte: PNG sem cenário; A4 com 2480 × 3508 pixels e metadados de 300 dpi.
- Modelos inclusos: bailarina, sereia, passarinho e cavalinho.
- Imagens enviadas e ajustes: armazenados somente no navegador do aparelho. Não são transferidos para outro aparelho automaticamente.

Para imprimir, selecione o tamanho escolhido e a escala de 100%. A nitidez depende da resolução da arte original. Licença das fontes em `assets/fonts/LICENSE.txt`.
