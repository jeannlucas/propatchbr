# Spec: [Nome da Capability]

- **Identificador:** `SPEC-[XXX]`
- **Módulo:** [ex: Checkout / Downloads / Auth / Licenciamento / Catálogo]
- **Status:** [DRAFT | APROVADO | EM IMPLEMENTAÇÃO | CONCLUÍDO]
- **Data:** [YYYY-MM-DD]
- **Autor/Responsável:** [Nome / Papel]

---

## 1. Visão Geral e Contexto de Negócio

[Descreva sucintamente o problema resolvido, o valor gerado para o cliente e o comportamento esperado do sistema no Pro Patch BR.]

### Classificação de Declarações
- `[FATO]`: Informações comprovadas pelo código, schema Drizzle ou documentação existente.
- `[REQUISITO DO PRODUTO]`: Regras de negócio do Pro Patch BR (ex: vitrine menor preço, concessão de licenças, ISO de Winning Eleven 10).
- `[REQUISITO DE SEGURANÇA]`: Contratos de proteção (Zero-Trust de preços, idempotência de webhooks, links assinados temporários).
- `[PENDÊNCIA]`: Decisões ou validações pendentes.

---

## 2. Invariantes e Restrições de Segurança

1. **Autoridade do Servidor (*Zero-Trust*):** O FRONTEND ENCANTA. O BACKEND DECIDE E PROTEGE. Preços, prazos de validade e concessão de licenças são computados exclusivamente no servidor.
2. **Fail-Closed:** Na ausência de credencial válida, assinatura incorreta de webhook ou licença expirada, o sistema rejeita imediatamente a operação (HTTP 401, 403 ou 400).
3. **Downloads Protegidos:** Mídias ISO nunca são expostas publicamente. Toda entrega exige token JWT assinado temporário com revalidação de licença ativa no banco.
4. **Idempotência:** Processamento de webhooks de pagamento (`checkout.completed`) deve garantir idempotência transacional, evitando extensão duplicada de licenças.

---

## 3. Critérios de Aceite (Acceptance Criteria)

> [!IMPORTANT]
> Cada critério abaixo deve ser coberto por testes ou evidências determinísticas referenciando seu ID exato.

### `AC-001`: [Título do Critério - Fluxo Principal]
- **Dado:** [Contexto inicial / Pré-condições / Estado do banco]
- **Quando:** [Ação realizada pelo usuário ou webhook]
- **Então:** [Resultado determinístico esperado / Código HTTP / Estado alterado]

### `AC-002`: [Título do Critério - Validação de Regra de Negócio]
- **Dado:** [Pré-condições]
- **Quando:** [Ação realizada]
- **Então:** [Resultado determinístico esperado]

### `AC-003`: [Título do Critério - Cenário Negativo / Fail-Closed]
- **Dado:** [Tentativa de acesso não autorizado, licença vencida ou webhook com assinatura inválida]
- **Quando:** [Ação executada]
- **Então:** [Rejeição estrita com erro apropriado (ex: 401 Unauthorized, 403 Forbidden, 400 Bad Request)]

---

## 4. Fora de Escopo (Anti-Requisitos)

- [O que explicitamente NÃO será construído ou tratado nesta entrega?]
- [YAGNI: Features ou abstrações prematuras bloqueadas]

---

## 5. Matriz de Rastreabilidade de Testes

| Critério de Aceite | Tipo de Teste / Validação | Arquivo de Teste / Evidência |
| :--- | :--- | :--- |
| `AC-001` | Integração / Unitário | `...` |
| `AC-002` | Unitário | `...` |
| `AC-003` | Segurança (Fail-Closed) | `...` |
