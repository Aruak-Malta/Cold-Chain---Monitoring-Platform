import asyncio
import json
import unittest
from datetime import datetime, timedelta
from io import BytesIO

import pandas as pd
from fastapi import HTTPException, UploadFile

import main
from analises.basica import processar_telemetria_basica, suavizar_serie
from analises.eletrica import analisar_comportamento_eletrico
from analises.saude import calcular_health_score
from analises.termica import analisar_comportamento_termico


class AnaliseTelemetriaTests(unittest.TestCase):
    def setUp(self):
        main.equipamentos_por_sessao.clear()
        main.dados_brutos_por_sessao.clear()

    def test_json_vazio_mantem_contrato_e_score_indisponivel(self):
        arquivo = UploadFile(file=BytesIO(b"[]"), filename="vazio.json")
        resposta = asyncio.run(main.cadastrar_equipamento(
            nome="Freezer vazio",
            serial="VAZIO-001",
            setor="Teste",
            session_id="sessao-a",
            file=arquivo,
        ))

        telemetria = resposta["equipamentos"][0]["telemetria"]
        self.assertEqual(telemetria["resumo_analise"]["total_leituras"], 0)
        self.assertEqual(
            telemetria["dados_graficos"],
            {
                "tempos": [],
                "temperaturas": [],
                "temperaturas_suavizadas": [],
                "umidades": [],
                "umidades_suavizadas": [],
                "correntes": [],
                "correntes_suavizadas": [],
            },
        )
        resumo = asyncio.run(main.obter_resumo(session_id="sessao-a"))["resumo"]
        self.assertEqual(resumo["total_equipamentos"], 1)
        self.assertEqual(resumo["analises_concluidas"], 0)
        self.assertIsNone(resumo["temperatura_media"])

        resposta = asyncio.run(main.executar_analise_avancada(
            main.SolicitacaoAnalise(serial="VAZIO-001"),
            session_id="sessao-a",
        ))
        self.assertIsNone(resposta["equipamentos"][0]["analise_avancada"]["saude"]["health_score"])
        self.assertIsNone(calcular_health_score({}, {})["health_score"])

    def test_resumo_preserva_zero_e_downsampling_limita_a_cem_pontos(self):
        df = pd.DataFrame({
            "temperatura": range(199),
            "umidade": [0] * 199,
            "corrente": range(199),
        })

        resultado = processar_telemetria_basica(df)

        self.assertEqual(resultado["resumo_analise"]["umidade_media"], 0)
        self.assertEqual(len(resultado["dados_graficos"]["temperaturas"]), 100)
        self.assertEqual(len(resultado["dados_graficos"]["temperaturas_suavizadas"]), 100)
        self.assertEqual(len(resultado["dados_graficos"]["umidades_suavizadas"]), 100)
        self.assertEqual(len(resultado["dados_graficos"]["correntes"]), 100)
        self.assertEqual(len(resultado["dados_graficos"]["correntes_suavizadas"]), 100)

    def test_series_sem_coluna_mantem_alinhamento_dos_timestamps(self):
        resultado = processar_telemetria_basica(
            pd.DataFrame({"temperatura": [-18.0, -17.5, -18.0]}),
        )
        graficos = resultado["dados_graficos"]

        self.assertEqual(graficos["tempos"], [None, None, None])
        for coluna in (
            "temperaturas",
            "temperaturas_suavizadas",
            "umidades",
            "umidades_suavizadas",
            "correntes",
            "correntes_suavizadas",
        ):
            self.assertEqual(len(graficos[coluna]), 3)
        self.assertEqual(graficos["umidades"], [None, None, None])

    def test_suavizacao_reduz_picos_curto_sem_apagar_mudanca_sustentada(self):
        valores = pd.Series([-18.0] * 100 + [-5.0] * 3 + [-18.0] * 100)
        suavizados = suavizar_serie(valores)
        self.assertLess(float(suavizados.max()), -12.0)

        valores_com_abertura = pd.Series([-18.0] * 100 + [-5.0] * 40 + [-18.0] * 100)
        suavizados_com_abertura = suavizar_serie(valores_com_abertura)
        self.assertGreater(float(suavizados_com_abertura.iloc[120]), -10.0)

    def test_suavizacao_preserva_leituras_ausentes(self):
        resultado = suavizar_serie(pd.Series([1.0, 1.0, None, 1.0, 1.0]))

        self.assertTrue(pd.isna(resultado.iloc[2]))

    def test_analise_avancada_usa_sessao_e_conta_transicoes_observadas(self):
        registros = []
        timestamp = datetime(2026, 10, 18)
        for indice in range(40):
            timestamp += timedelta(minutes=45 if indice % 7 == 0 else 5)
            registros.append({
                "timestamp": timestamp.isoformat(),
                "temperatura": 4 + indice * 0.02,
                "umidade": 0,
                "corrente": 6 if 10 <= indice < 20 or indice >= 30 else 0,
            })

        arquivo = UploadFile(
            file=BytesIO(json.dumps(registros).encode()),
            filename="telemetria.json",
        )
        asyncio.run(main.cadastrar_equipamento(
            nome="Freezer teste",
            serial="TESTE-001",
            setor="Congelados",
            session_id="sessao-b",
            file=arquivo,
        ))
        resposta = asyncio.run(main.executar_analise_avancada(
            main.SolicitacaoAnalise(serial="TESTE-001"),
            session_id="sessao-b",
        ))

        analise = resposta["equipamentos"][0]["analise_avancada"]
        self.assertEqual(analise["termica"]["base_temporal"], "timestamps")
        self.assertEqual(analise["eletrica"]["partidas_observadas"], 2)
        self.assertIsNotNone(analise["saude"]["health_score"])
        self.assertEqual(resposta["equipamentos"][0]["telemetria"]["resumo_analise"]["umidade_media"], 0)
        resumo = asyncio.run(main.obter_resumo(session_id="sessao-b"))["resumo"]
        self.assertEqual(resumo["total_equipamentos"], 1)
        self.assertEqual(resumo["total_leituras"], 40)
        self.assertEqual(resumo["analises_concluidas"], 1)
        self.assertAlmostEqual(resumo["temperatura_media"], sum(item["temperatura"] for item in registros) / 40, places=2)

        with self.assertRaises(HTTPException) as erro:
            asyncio.run(main.executar_analise_avancada(
                main.SolicitacaoAnalise(serial="TESTE-001"),
                session_id="outra-sessao",
            ))
        self.assertEqual(erro.exception.status_code, 404)

    def test_partida_inicial_sem_transicao_nao_e_contada(self):
        correntes = [6] * 10 + [0] * 10 + [6] * 10 + [0] * 10

        resultado = analisar_comportamento_eletrico(pd.DataFrame({"corrente": correntes}))

        self.assertEqual(resultado["partidas_observadas"], 1)
        self.assertNotIn("total_ciclos_partida", resultado)

    def test_analise_termica_sem_timestamps_identifica_base_por_leituras(self):
        resultado = analisar_comportamento_termico(
            pd.DataFrame({"temperatura": [4 + indice * 0.01 for indice in range(30)]}),
        )

        self.assertEqual(resultado["base_temporal"], "leituras")


if __name__ == "__main__":
    unittest.main()
