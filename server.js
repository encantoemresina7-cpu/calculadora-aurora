"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const MANDA_BEM_URL = "https://mandabem.com.br/ws/valor_envio";
const CEP_ORIGEM = somenteNumeros(process.env.CEP_ORIGEM || "13225020");

// Medidas fixas da luminária/pacote informadas no projeto.
const PACOTE = {
  peso: process.env.PESO || "1",
  altura: process.env.ALTURA || "8",
  largura: process.env.LARGURA || "10",
  comprimento: process.env.COMPRIMENTO || "30"
};

app.use(express.json({ limit: "20kb" }));

// Durante os testes, permite acesso de qualquer origem.
// Depois poderemos restringir para o endereço exato da Calculadora Aurora.
app.use(cors());

app.get("/", (_req, res) => {
  res.json({
    sucesso: true,
    mensagem: "API da Calculadora Aurora funcionando.",
    origem: CEP_ORIGEM,
    pacote: PACOTE
  });
});

app.get("/saude", (_req, res) => {
  res.json({ sucesso: true });
});

app.post("/calcular-frete", async (req, res) => {
  try {
    validarCredenciais();

    const cepDestino = somenteNumeros(req.body?.cepDestino || req.body?.cep_destino);

    if (cepDestino.length !== 8) {
      return res.status(400).json({
        sucesso: false,
        erro: "Informe um CEP de destino válido com 8 números."
      });
    }

    const valorSeguro = normalizarDecimal(req.body?.valorSeguro ?? "0.00");

    // As medidas 8 x 10 x 30 cm e peso de até 1 kg não atendem ao PACMINI.
    // Por isso consultamos PAC e SEDEX.
 const servicos = ["PAC", "SEDEX", "JADLOG_EXP"];

    const resultados = await Promise.all(
      servicos.map((servico) =>
        consultarMandaBem({
          servico,
          cepDestino,
          valorSeguro
        })
      )
    );

    const opcoes = resultados
      .flatMap((resultado) => extrairOpcoes(resultado))
      .filter((opcao, indice, lista) =>
        lista.findIndex((item) => item.servico === opcao.servico) === indice
      );

    if (opcoes.length === 0) {
      const erros = resultados
        .map(extrairErro)
        .filter(Boolean);

      return res.status(422).json({
        sucesso: false,
        erro: erros[0] || "Nenhuma opção de frete foi encontrada para esse CEP.",
        detalhes: erros
      });
    }

    opcoes.sort((a, b) => a.valor - b.valor);

    return res.json({
      sucesso: true,
      cepOrigem: CEP_ORIGEM,
      cepDestino,
      pacote: PACOTE,
      opcoes
    });
  } catch (erro) {
    console.error("Erro ao calcular frete:", erro);

    return res.status(500).json({
      sucesso: false,
      erro: erro.message || "Não foi possível consultar o frete agora."
    });
  }
});

function validarCredenciais() {
  if (!process.env.MANDA_BEM_API_ID || !process.env.MANDA_BEM_API_TOKEN) {
    throw new Error(
      "As variáveis MANDA_BEM_API_ID e MANDA_BEM_API_TOKEN ainda não foram configuradas no Render."
    );
  }
}

async function consultarMandaBem({ servico, cepDestino, valorSeguro }) {
  const dados = new URLSearchParams({
    plataforma_id: process.env.MANDA_BEM_API_ID,
    plataforma_chave: process.env.MANDA_BEM_API_TOKEN,
    cep_origem: CEP_ORIGEM,
    cep_destino: cepDestino,
    valor_seguro: valorSeguro,
    servico,
    peso: PACOTE.peso,
    altura: PACOTE.altura,
    largura: PACOTE.largura,
    comprimento: PACOTE.comprimento
  });

  const resposta = await fetch(MANDA_BEM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json"
    },
    body: dados.toString(),
    signal: AbortSignal.timeout(20000)
  });

  const texto = await resposta.text();

  let json;
  try {
    json = JSON.parse(texto);
  } catch {
    throw new Error(
      `A Manda Bem respondeu em formato inesperado para ${servico}.`
    );
  }

  if (!resposta.ok) {
    throw new Error(
      extrairErro(json) || `Falha HTTP ${resposta.status} ao consultar ${servico}.`
    );
  }
console.log("=== RESPOSTA DA MANDA BEM ===");
console.dir(json, { depth: null });
console.log("============================");

return json;
}

function extrairOpcoes(resposta) {
  const resultado = resposta?.resultado || resposta || {};
  const opcoes = [];

for (const servico of ["PAC", "SEDEX", "PACMINI", "JADLOG_EXP"]) {
    const item =
      resultado[servico] ||
      resultado[servico.toLowerCase()] ||
      resultado[servico === "PACMINI" ? "PAC Mini" : servico];

    if (!item || item.valor == null) continue;

    const valor = converterValor(item.valor);
    if (!Number.isFinite(valor)) continue;

    opcoes.push({
      servico,
      nome: nomeServico(servico),
      valor,
      prazoDias: converterInteiro(item.prazo)
    });
  }

  return opcoes;
}

function extrairErro(resposta) {
  const resultado = resposta?.resultado || resposta || {};
  return resultado.erro || resultado.mensagem_erro || null;
}


 function nomeServico(servico) {
  if (servico === "PACMINI") return "PAC Mini";
  if (servico === "JADLOG_EXP") return "Jadlog";
  return servico;
}
function converterValor(valor) {
  if (typeof valor === "number") {
    return valor;
  }

  let texto = String(valor ?? "")
    .trim()
    .replace(/[R$\s]/g, "");

  if (texto.includes(".") && texto.includes(",")) {
    texto = texto
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (texto.includes(",")) {
    texto = texto.replace(",", ".");
  } else {
    texto = texto.replace(/[^\d.-]/g, "");
  }

  const numero = Number(texto);

  return Number.isFinite(numero) ? numero : NaN;
}

function converterInteiro(valor) {
  const numero = Number.parseInt(String(valor ?? ""), 10);
  return Number.isFinite(numero) ? numero : null;
}

function somenteNumeros(valor) {
  return String(valor ?? "").replace(/\D/g, "");
}

function normalizarDecimal(valor) {
  const numero = converterValor(valor);

  return Number.isFinite(numero) && numero >= 0
    ? numero.toFixed(2)
    : "0.00";
}


app.use((_req, res) => {
  res.status(404).json({
    sucesso: false,
    erro: "Rota não encontrada."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API Aurora ativa na porta ${PORT}`);
});
