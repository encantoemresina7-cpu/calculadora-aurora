# Personalizador de quadros infantis — biblioteca de kits

Editor sem login para organizar as artes, personalizar o nome e a inicial e exportar quadros individuais ou kits com três peças.

## Biblioteca

42 artes enviadas pela loja, além dos quatro temas já existentes (46 opções). Categorias: Fazendeiro, Dinossauro, Astronauta, Ursinho Aviador, Bailarina, Fazendinha Rosa, Jardim Encantado, Princesas, Pássaros, Borboletas, Safari, Bosque encantado, Marinheiro e Outros temas. O kit Ursinho Aviador tem cinco opções. Algumas artes aparecem em mais de um tema quando combinam com os dois. Os originais são preservados em assets/kits/*-original.webp (cópias WebP otimizadas, na resolução de origem); onze bases sem texto tornam os monogramas e nomes reutilizáveis. O monograma editável é composto com a fonte e o acabamento escolhidos; sua forma acompanha a letra digitada.

## Uso

1. Escolha um kit ou uma arte individual.
2. Digite o nome do cliente. A inicial pode acompanhar o nome ou ser digitada separadamente.
3. Selecione Quadro 1, 2 ou 3 para trocar a arte e escolher nome, inicial, fundo, fonte e posição.
4. Baixe a prévia JPG de 1600 × 1600 px para aprovação. O compartilhamento usa o menu de arquivos do aparelho, com download como alternativa.
5. Para impressão, baixe uma arte PNG ou o ZIP com três PNGs separados. A4: 2480 × 3508 px com metadados de 300 dpi. A nitidez depende da resolução original.

O fundo da arte e a parede da prévia são independentes. A opção de colorir o papel remove somente as áreas claras ligadas ao fundo, preservando os brancos internos contornados. Pode ser desligada para manter o papel da imagem. Imagens próprias devem preferencialmente vir sem nomes impressos.

Os ajustes e uploads ficam no navegador do aparelho. Os kits incluídos ficam disponíveis para qualquer aparelho que abra o site. Nenhuma imagem é enviada a um serviço de edição externo durante o uso.

## Publicação no Render

- Repositório: https://github.com/encantoemresina7-cpu/calculadora-aurora
- Branch: personalizador-quadros-render
- Build: node personalizador-quadros/check.mjs
- Publish directory: personalizador-quadros
- SKIP_INSTALL_DEPS=true

Sem novas dependências, servidor ou segredos. O serviço existente permanece no mesmo endereço. O check executa validação de sintaxe, controles, biblioteca e testes de remoção de papel, iniciais acentuadas, metadados PNG e estrutura ZIP.

Licença das fontes: assets/fonts/LICENSE.txt.
