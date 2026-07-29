# Calculadora Aurora API

Servidor protegido para consultar o frete da Manda Bem sem expor o API Token no HTML.

## Dados fixos usados

- CEP de origem: `13225020`
- Peso: `1 kg`
- Altura: `8 cm`
- Largura: `10 cm`
- Comprimento: `30 cm`

A API consulta `PAC` e `SEDEX`. O pacote informado não atende às medidas e ao peso máximos do `PACMINI`.

## Variáveis protegidas no Render

Crie estas variáveis em **Environment**:

- `MANDA_BEM_API_ID`
- `MANDA_BEM_API_TOKEN`

Nunca coloque o token dentro do HTML nem envie o arquivo `.env` para o GitHub.

## Teste

Depois da publicação, abra:

`https://SEU-SERVICO.onrender.com/`

Deve aparecer uma mensagem informando que a API está funcionando.

A consulta de frete utiliza:

`POST /calcular-frete`

Exemplo de corpo JSON:

```json
{
  "cepDestino": "13052120",
  "valorSeguro": "99.99"
}
```

Exemplo de resposta:

```json
{
  "sucesso": true,
  "opcoes": [
    {
      "servico": "PAC",
      "nome": "PAC",
      "valor": 22.8,
      "prazoDias": 5
    }
  ]
}
```

## Próxima etapa

Depois que o endereço do Render estiver funcionando, ele será colocado no HTML da Calculadora Aurora para:

1. receber o CEP;
2. mostrar as opções de frete;
3. selecionar uma opção;
4. somar o frete automaticamente ao total.
