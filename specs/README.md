# Especificações de Negócio e Contratos por Capability (L2)

As especificações nesta pasta são contratos duradouros por capability da plataforma **Pro Patch BR**. Todo código novo e testes devem responder aos critérios de aceite (`AC-001`, `AC-002`...) definidos aqui.

---

## 1. Princípios da Camada L2 (Specs)

1. **Contratos Duradouros (*Spec-Anchored*):**  
   Ao contrário de planos de implementação efêmeros (L3) que são descartados após a entrega, as especificações nesta pasta documentam os requisitos permanentes, regras de negócio e contratos de segurança do Pro Patch BR.
2. **Critérios de Aceite Numerados:**  
   Todo comportamento esperado deve ser expresso como um critério de aceite rastreável (`AC-001`, `AC-002`, etc.).
3. **Ancoragem em Testes (TDD):**  
   Nenhum código de produção deve ser escrito sem que haja validações ou testes automatizados vinculados explicitamente ao critério de aceite correspondente.
4. **Organização por Capability:**  
   Cada capability reside em sua própria pasta sob `specs/<capability>/`, com seu arquivo principal `specs/<capability>/<capability>.md`.

---

## 2. Estrutura Recomendada

```text
specs/
├── README.md
├── TEMPLATE.md
├── checkout-pix/
│   └── checkout-pix.md
└── protected-downloads/
    └── protected-downloads.md
```

Para novas capabilities ou refatorações de regras de negócio, utilize o modelo fornecido em [TEMPLATE.md](TEMPLATE.md).
