import asyncio
import json
import unittest
from datetime import datetime, timedelta, timezone
from io import BytesIO

import pandas as pd
from fastapi import HTTPException, UploadFile
from fastapi.encoders import jsonable_encoder

import main
from analises.basica import processar_telemetria_basica, suavizar_serie
from analises.avisos import gerar_avisos
from analises.eletrica import analisar_comportamento_eletrico
from analises.qualidade import analisar_qualidade_telemetria
from analises.saude import calcular_health_score
from analises.termica import analisar_comportamento_termico


class AnaliseTelemetriaTests(unittest.TestCase):
    def setUp(self):
        main.equipamentos_por_sessao.clear()
        main.dados_brutos_por_sessao.clear()

    def test_relatorio_consulta_leituras_brutas_da_sessao_atual(self):
        leitura = {
            "timestamp": "2026-10-18T10:00:00+00:00",
            "temperatura": -18.5,
            "umidade": 65,
            "corrente": 2.1,
        }
        arquivo = UploadFile(
            file=BytesIO(json.dumps([leitura]).encode()),
            filename="telemetria.json",
        )
        asyncio.run(main.cadastrar_equipamento(
            nome="Freezer relatório",
            serial="REL-001",
            setor="Teste",
            session_id="sessao-relatorio",
            file=arquivo,
        ))

        resposta = asyncio.run(main.obter_dados_relatorio(session_id="sessao-relatorio"))
        outra_sessao = asyncio.run(main.obter_dados_relatorio(session_id="outra-sessao"))

        self.assertEqual(len(resposta["equipamentos"]), 1)
        self.assertEqual(resposta["equipamentos"][0]["leituras"], [leitura])
        self.assertEqual(resposta["equipamentos"][0]["serial"], "REL-001")
        self.assertEqual(outra_sessao["equipamentos"], [])

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
        self.assertIsNone(resumo["health_score_medio"])
        self.assertEqual(resumo["riscos_criticos"], 0)
        self.assertIsNone(resumo["duty_cycle_medio"])

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

    def test_suavizacao_preserva_anomalia_brusca_e_suaviza_ruido_moderado(self):
        valores = pd.Series([-18.0] * 100 + [-5.0] * 3 + [-18.0] * 100)
        suavizados = suavizar_serie(valores)
        self.assertAlmostEqual(float(suavizados.iloc[100]), -5.0)
        self.assertAlmostEqual(float(suavizados.iloc[101]), -5.0)
        self.assertAlmostEqual(float(suavizados.iloc[102]), -5.0)

        valores_com_ruido = pd.Series([-18.0] * 100 + [-17.7] * 3 + [-18.0] * 100)
        suavizados_com_ruido = suavizar_serie(valores_com_ruido)
        self.assertLess(float(suavizados_com_ruido.max()), -17.7)

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
        self.assertEqual(resumo["health_score_medio"], analise["saude"]["health_score"])
        self.assertEqual(
            resumo["riscos_criticos"],
            int(analise["saude"]["status_geral"] == "Crítico"),
        )
        self.assertEqual(resumo["duty_cycle_medio"], analise["eletrica"]["duty_cycle_percentual"])
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

    def test_anomalia_sustentada_detecta_desvio_termico_e_corrente_sem_confundir_picos(self):
        instante = datetime.now(timezone.utc) - timedelta(hours=10)
        registros = []
        for indice in range(120):
            anomalia = indice >= 101
            registros.append({
                "timestamp": (instante + timedelta(minutes=5 * indice)).isoformat(),
                "temperatura": 0.1 + (indice % 2) * 0.05 if anomalia else 4 + (indice % 2) * 0.1,
                "corrente": 12.5 if anomalia else 17.5 if indice in {1, 41, 81} else 5.5 if indice % 4 in {1, 2} else 0,
            })

        df = pd.DataFrame(registros)
        termica = analisar_comportamento_termico(df)
        eletrica = analisar_comportamento_eletrico(df)
        qualidade = analisar_qualidade_telemetria(df)
        codigos = {
            aviso["codigo"]
            for aviso in gerar_avisos(termica, eletrica, qualidade)
        }

        self.assertTrue(termica["alerta_temperatura_anomala_baixa"])
        self.assertTrue(eletrica["alerta_corrente_alta_sustentada"])
        self.assertTrue(eletrica["alerta_refrigeracao_ineficiente"])
        self.assertFalse(qualidade["telemetria_desatualizada"])
        self.assertIn("temperatura_baixa_relativa", codigos)
        self.assertIn("corrente_alta_sustentada", codigos)
        self.assertIn("refrigeracao_ineficiente", codigos)
        self.assertNotIn("telemetria_desatualizada", codigos)

        base_sem_anomalia = pd.DataFrame(registros[:101])
        resultado_sem_anomalia = analisar_comportamento_eletrico(base_sem_anomalia)
        self.assertFalse(resultado_sem_anomalia["alerta_corrente_alta_sustentada"])

    def test_qualidade_identifica_valores_invalidos_e_intervalos_sem_timestamp(self):
        agora = datetime(2026, 10, 18, 12, tzinfo=timezone.utc)
        registros = [
            {
                "timestamp": (agora - timedelta(minutes=30 - indice * 5)).isoformat(),
                "temperatura": "inválida" if indice == 1 else 4,
                "corrente": -1 if indice == 2 else 5,
            }
            for indice in range(6)
        ]
        registros.append({
            "timestamp": "horário-inválido",
            "temperatura": None,
            "corrente": None,
        })
        registros[4]["timestamp"] = (agora - timedelta(minutes=60)).isoformat()

        resultado = analisar_qualidade_telemetria(pd.DataFrame(registros), agora=agora)

        self.assertEqual(resultado["timestamps_invalidos"], 1)
        self.assertEqual(resultado["temperaturas_fora_faixa_sensor"], 0)
        self.assertEqual(resultado["leituras_temperatura_sem_valor"], 2)
        self.assertEqual(resultado["correntes_fora_faixa_sensor"], 1)
        self.assertEqual(resultado["leituras_corrente_sem_valor"], 1)
        self.assertGreater(resultado["lacunas_temporais"], 0)

    def test_base_simulada_gera_os_avisos_da_anomalia_injetada(self):
        with open("dados_simulados.json", encoding="utf-8") as arquivo:
            registros = json.load(arquivo)
        df = pd.DataFrame(registros)

        termica = analisar_comportamento_termico(df)
        eletrica = analisar_comportamento_eletrico(df)
        ultima_data = pd.to_datetime(df["timestamp"], utc=True).max().to_pydatetime()
        qualidade = analisar_qualidade_telemetria(
            df,
            agora=ultima_data + timedelta(hours=2),
        )
        codigos = {
            aviso["codigo"]
            for aviso in gerar_avisos(termica, eletrica, qualidade)
        }

        self.assertTrue(termica["alerta_temperatura_anomala_baixa"])
        self.assertTrue(eletrica["alerta_corrente_alta_sustentada"])
        self.assertIn("temperatura_baixa_relativa", codigos)
        self.assertIn("corrente_alta_sustentada", codigos)
        self.assertIn("refrigeracao_ineficiente", codigos)
        self.assertIn("telemetria_desatualizada", codigos)

        arquivo = UploadFile(
            file=BytesIO(json.dumps(registros).encode()),
            filename="dados_simulados.json",
        )
        asyncio.run(main.cadastrar_equipamento(
            nome="Freezer simulado",
            serial="SIMULADO-001",
            setor="Teste",
            session_id="sessao-simulada",
            file=arquivo,
        ))
        resposta = asyncio.run(main.executar_analise_avancada(
            main.SolicitacaoAnalise(serial="SIMULADO-001"),
            session_id="sessao-simulada",
        ))
        analise_integrada = resposta["equipamentos"][0]["analise_avancada"]
        codigos_integrados = {aviso["codigo"] for aviso in analise_integrada["avisos"]}
        self.assertIn("temperatura_baixa_relativa", codigos_integrados)
        self.assertIn("corrente_alta_sustentada", codigos_integrados)
        self.assertIn("refrigeracao_ineficiente", codigos_integrados)
        self.assertIs(type(analise_integrada["eletrica"]["alerta_refrigeracao_ineficiente"]), bool)
        self.assertIsInstance(jsonable_encoder(resposta), dict)

        analise_integrada.pop("avisos")
        resposta_atualizada = asyncio.run(main.listar_equipamentos(session_id="sessao-simulada"))
        avisos_atualizados = resposta_atualizada["equipamentos"][0]["analise_avancada"]["avisos"]
        self.assertIn("temperatura_baixa_relativa", {aviso["codigo"] for aviso in avisos_atualizados})


if __name__ == "__main__":
    unittest.main()
