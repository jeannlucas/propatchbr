#!/usr/bin/env python3
"""
Motor de Avaliação de Política de Promoção de Segurança — BigDev.Z & MonkeyLab

Regra Canônica:
- Bloqueia novas vulnerabilidades CRÍTICAS que possuam correção disponível (FixedVersion).
- Achados conhecidos já aceitos na linha de base de produção (baseline) permanecem registrados e não bloqueiam.
- Erros de execução do scanner ou arquivos corrompidos são tratados como falha estrita (Fail-Closed).
- Suporta modos 'audit' (modo informativo) e 'enforce' (modo bloqueante).
"""

import sys
import os
import json
import argparse
from typing import Set, Dict, Any, List

def parse_args():
    parser = argparse.ArgumentParser(description="Avaliar politica de promocao de seguranca (Trivy / DefectDojo)")
    parser.add_argument("--scan", required=True, help="Caminho do arquivo JSON de saida do Trivy")
    parser.add_argument("--baseline", help="Caminho do arquivo JSON com CVEs aprovadas na linha de base")
    parser.add_argument("--mode", choices=["audit", "enforce"], default="audit", help="Modo de operacao: audit (informativo) ou enforce (bloqueante)")
    parser.add_argument("--output-summary", help="Arquivo markdown para salvar o resumo da avaliacao")
    return parser.parse_args()

def load_baseline(baseline_path: str) -> Set[str]:
    if not baseline_path:
        return set()
    if not os.path.exists(baseline_path):
        print(f"⚠️ Aviso: Arquivo de baseline '{baseline_path}' nao encontrado. Considerando baseline vazia.")
        return set()
    try:
        with open(baseline_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                cves = set()
                for item in data:
                    if isinstance(item, str):
                        cves.add(item.strip().upper())
                    elif isinstance(item, dict):
                        cve = item.get("VulnerabilityID") or item.get("cve") or item.get("id")
                        if cve:
                            cves.add(str(cve).strip().upper())
                return cves
            elif isinstance(data, dict):
                cves = set()
                # Se for formato Trivy completo
                for res in data.get("Results", []):
                    for v in res.get("Vulnerabilities", []):
                        vid = v.get("VulnerabilityID")
                        if vid:
                            cves.add(str(vid).strip().upper())
                # Se for dict com chave 'cves' ou 'baseline'
                for k in ["cves", "baseline", "approved_cves"]:
                    if k in data and isinstance(data[k], list):
                        for c in data[k]:
                            cves.add(str(c).strip().upper())
                return cves
    except Exception as e:
        print(f"❌ Erro ao ler baseline '{baseline_path}': {e}", file=sys.stderr)
        return set()
    return set()

def evaluate():
    args = parse_args()

    # 1. Validacao do Scanner (Cenario 3 - Fail Closed)
    if not os.path.exists(args.scan):
        print(f"❌ ERRO FATAL: Arquivo de varredura '{args.scan}' nao existe.", file=sys.stderr)
        if args.output_summary:
            with open(args.output_summary, "w", encoding="utf-8") as f:
                f.write("### ❌ Falha no Quality Gate de Seguranca\n\nErro de scanner: arquivo de varredura ausente (Fail-Closed).\n")
        sys.exit(1)

    try:
        with open(args.scan, "r", encoding="utf-8") as f:
            scan_data = json.load(f)
    except Exception as e:
        print(f"❌ ERRO FATAL: Falha ao decodificar JSON do scanner '{args.scan}': {e}", file=sys.stderr)
        if args.output_summary:
            with open(args.output_summary, "w", encoding="utf-8") as f:
                f.write(f"### ❌ Falha no Quality Gate de Seguranca\n\nErro de scanner: JSON corrompido ou invalido ({e}) (Fail-Closed).\n")
        sys.exit(1)

    if not isinstance(scan_data, dict):
        print(f"❌ ERRO FATAL: Formato invalido de relatorio do scanner.", file=sys.stderr)
        sys.exit(1)

    baseline_cves = load_baseline(args.baseline)

    # 2. Extracao e Classificacao de Vulnerabilidades
    severity_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0, "UNKNOWN": 0}
    actionable_criticals = []
    known_criticals = []
    new_criticals = []

    results = scan_data.get("Results", [])
    for res in results:
        target = res.get("Target", "desconhecido")
        for vuln in res.get("Vulnerabilities", []):
            sev = (vuln.get("Severity") or "UNKNOWN").upper()
            if sev in severity_counts:
                severity_counts[sev] += 1
            else:
                severity_counts["UNKNOWN"] += 1

            vuln_id = (vuln.get("VulnerabilityID") or "").strip().upper()
            pkg = vuln.get("PkgName") or "pacote"
            installed = vuln.get("InstalledVersion") or "desconhecida"
            fixed = vuln.get("FixedVersion")

            # Regra: CRITICA com correcao disponivel
            if sev == "CRITICAL" and fixed and fixed.strip() and fixed.lower() != "none":
                item = {
                    "id": vuln_id,
                    "pkg": pkg,
                    "installed": installed,
                    "fixed": fixed,
                    "target": target,
                    "title": vuln.get("Title") or ""
                }
                actionable_criticals.append(item)
                if vuln_id in baseline_cves:
                    known_criticals.append(item)
                else:
                    new_criticals.append(item)

    # 3. Geracao de Relatorio Markdown
    summary_lines = []
    summary_lines.append("### 🛡️ Relatório de Política de Promoção de Segurança")
    summary_lines.append(f"- **Modo de Execução:** `{args.mode.upper()}`")
    summary_lines.append(f"- **Total de Achados:** CRITICAL: {severity_counts['CRITICAL']} | HIGH: {severity_counts['HIGH']} | MEDIUM: {severity_counts['MEDIUM']} | LOW: {severity_counts['LOW']}")
    summary_lines.append(f"- **Críticas com Correção (Acionáveis):** {len(actionable_criticals)} (Conhecidas na baseline: {len(known_criticals)}, Novas: {len(new_criticals)})")
    summary_lines.append("")

    if known_criticals:
        summary_lines.append("#### ℹ️ Vulnerabilidades Críticas Preexistentes (Toleradas pela Baseline)")
        summary_lines.append("| CVE | Pacote | Versão Atual | Correção | Alvo |")
        summary_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for k in known_criticals:
            summary_lines.append(f"| {k['id']} | `{k['pkg']}` | `{k['installed']}` | `{k['fixed']}` | `{k['target']}` |")
        summary_lines.append("")

    if new_criticals:
        summary_lines.append("#### 🚨 NOVAS Vulnerabilidades Críticas com Correção Disponível")
        summary_lines.append("| CVE | Pacote | Versão Atual | Correção | Alvo |")
        summary_lines.append("| :--- | :--- | :--- | :--- | :--- |")
        for n in new_criticals:
            summary_lines.append(f"| {n['id']} | `{n['pkg']}` | `{n['installed']}` | `{n['fixed']}` | `{n['target']}` |")
        summary_lines.append("")

    # 4. Decisao de Promocao
    has_blocking_findings = len(new_criticals) > 0

    if has_blocking_findings:
        if args.mode == "enforce":
            summary_lines.append(f"❌ **PROMOÇÃO BLOQUEADA:** Foram detectadas {len(new_criticals)} novas vulnerabilidades críticas com correção disponível.")
            print(f"❌ PROMOÇÃO BLOQUEADA ({args.mode}): {len(new_criticals)} novas vulnerabilidades críticas acionáveis encontradas.", file=sys.stderr)
            exit_code = 1
        else:
            summary_lines.append(f"⚠️ **AVISO (MODO AUDIT):** Detectadas {len(new_criticals)} novas vulnerabilidades críticas acionáveis. Promoção não bloqueada no modo informativo.")
            print(f"⚠️ AVISO ({args.mode}): {len(new_criticals)} novas vulnerabilidades críticas acionáveis encontradas. Permitido em modo audit.")
            exit_code = 0
    else:
        summary_lines.append("✅ **PROMOÇÃO APROVADA:** Nenhuma nova vulnerabilidade crítica com correção disponível foi detectada.")
        print(f"✅ PROMOÇÃO APROVADA: Zero novas vulnerabilidades críticas acionáveis.")
        exit_code = 0

    if args.output_summary:
        with open(args.output_summary, "w", encoding="utf-8") as f:
            f.write("\n".join(summary_lines) + "\n")

    sys.exit(exit_code)

if __name__ == "__main__":
    evaluate()
