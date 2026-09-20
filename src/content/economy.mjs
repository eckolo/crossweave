// Build-time extraction of unchanged CO-01A input 0.1. No historical modules in the browser.
const data={
  "affixes": {
    "max_count": 3,
    "family_limit": 1,
    "card": {
      "heavy": {
        "label": "重い",
        "kinds": [
          "attack"
        ],
        "family": "tempo",
        "benefit": true,
        "delta": {
          "power": 2,
          "cost": 1
        }
      },
      "light": {
        "label": "軽い",
        "kinds": [
          "attack",
          "guard",
          "heal"
        ],
        "family": "tempo",
        "benefit": true,
        "delta": {
          "power": -1,
          "cost": -1
        }
      },
      "precise": {
        "label": "精密な",
        "kinds": [
          "attack"
        ],
        "family": "aim",
        "benefit": true,
        "delta": {
          "hit": 20,
          "power": -1
        }
      },
      "echoing": {
        "label": "響く",
        "kinds": [
          "attack"
        ],
        "family": "field",
        "benefit": true,
        "delta": {
          "field_hit": 20,
          "hit": -10
        }
      },
      "sturdy": {
        "label": "堅い",
        "kinds": [
          "guard"
        ],
        "family": "guard",
        "benefit": true,
        "delta": {
          "power": 2,
          "evasion": -10
        }
      },
      "rich": {
        "label": "濃い",
        "kinds": [
          "heal"
        ],
        "family": "concentration",
        "benefit": true,
        "delta": {
          "power": 4,
          "cost": 2
        }
      },
      "dull": {
        "label": "鈍い",
        "kinds": [
          "attack"
        ],
        "family": "aim",
        "benefit": false,
        "delta": {
          "hit": -20
        }
      },
      "frail": {
        "label": "短命な",
        "kinds": [
          "attack",
          "guard",
          "heal"
        ],
        "family": "life",
        "benefit": false,
        "delta": {
          "life": -1
        }
      }
    },
    "passive": {
      "borrowed": {
        "label": "借り技の",
        "bases": [
          "PS01",
          "PS02",
          "PS03",
          "PS04"
        ],
        "family": "origin",
        "benefit": true,
        "strength": 1,
        "gate": "borrowed"
      },
      "focused_B": {
        "label": "B属性に専心する",
        "bases": [
          "PS01",
          "PS02",
          "PS03",
          "PS04"
        ],
        "family": "attribute",
        "benefit": true,
        "strength": 1,
        "gate": "attribute_B"
      },
      "swift": {
        "label": "速効の",
        "bases": [
          "PS02",
          "PS03",
          "PS04"
        ],
        "family": "tempo",
        "benefit": true,
        "strength": -1,
        "discount": 1
      },
      "forceful": {
        "label": "強引な",
        "bases": [
          "PS02",
          "PS03",
          "PS04"
        ],
        "family": "tempo",
        "benefit": true,
        "strength": 1,
        "discount": -1
      },
      "sluggish": {
        "label": "鈍重な",
        "bases": [
          "PS01",
          "PS02",
          "PS03",
          "PS04"
        ],
        "family": "tempo",
        "benefit": false,
        "strength": 0,
        "discount": -1
      }
    },
    "passive_strength_units": {
      "PS01": 1,
      "PS02": 10,
      "PS03": 1,
      "PS04": 2
    },
    "invalid": [
      "life < 1",
      "power < 0",
      "duplicate affix",
      "same family",
      "incompatible kind/base",
      "passive attribute_B with no eligible trigger card"
    ],
    "passive_exclusions": {
      "PS04": [
        "focused_B"
      ]
    },
    "blueprint": {
      "version": "AO1",
      "fields": [
        "version",
        "kind",
        "base",
        "affixes",
        "key"
      ],
      "affix_order": "ascending ID",
      "key": "AO1:{kind}:{base}[:{sorted affixes}]",
      "registry_binding": "save content_set_id + card_registry_id; same IDs with changed values require new registry/content version; no old save automatic acceptance"
    }
  },
  "offers": {
    "version": "CW-M1-offers-0.1",
    "namespace": "crossweave:CW-M1-offers-0.1",
    "generator_reference": "AT.generate fixed weighted selection order; inject this catalogue/config; no call of old global AT generator",
    "tiers": {
      "I": {
        "rank": 1,
        "count": [
          2,
          4
        ],
        "affix_count_weights": [
          6,
          4,
          0,
          0
        ]
      },
      "II": {
        "rank": 2,
        "count": [
          3,
          5
        ],
        "affix_count_weights": [
          3,
          5,
          2,
          0
        ]
      },
      "III": {
        "rank": 3,
        "count": [
          4,
          6
        ],
        "affix_count_weights": [
          2,
          3,
          4,
          1
        ]
      }
    },
    "reachable_tiers": [
      "I"
    ],
    "kind_weights": {
      "card": 1,
      "passive": 1
    },
    "passive_base_weights": {
      "A": {
        "PS01": 2,
        "PS02": 4,
        "PS03": 1,
        "PS04": 1
      }
    },
    "card_base_weight": 1,
    "price_units": 400,
    "value_band": "ordinary",
    "max_purchases_per_batch": 1,
    "card_pool": "all known registry bases in profile.unlocked after settlement; exclude weak/filler runtime supply types; do not include borrowed observations alone",
    "passive_pool": [
      "PS01",
      "PS02",
      "PS03",
      "PS04"
    ],
    "variant_pool": "AO-compatible plain or at least one beneficial affix; tier gives nonzero affix-count weight; no numeric reroll",
    "deduplicate": "blueprint performance key within batch; second choice different kind:base if available; across-return duplicates allowed",
    "new_cards_guaranteed": false,
    "batch_id": "JSON.stringify(['CW-M1-offer-1',run,content_set_id])",
    "candidate_id": "choice-{zero-based-index}",
    "purchase_uid": "JSON.stringify(['AT1',batch_id,candidate_id])",
    "source_fields": [
      "run",
      "index",
      "seed",
      "case_id",
      "mode",
      "target_set_id",
      "content_set_id",
      "reward_ledger_keys",
      "reward_ids",
      "source_event_ids",
      "target_ids",
      "catalogue_versions",
      "tier",
      "card_bases"
    ],
    "tier_rule": "maximum rank of retained completed authored reward events; all five SCN rewards are I; II/III configured but unreachable in M1",
    "generate_after": "settlement unlock union and points/materials update; same atomic write as receipt and case change",
    "replace_current": "next return with at least one retained rated reward source; replace even unpurchased old candidates",
    "retain_current": [
      "defeat",
      "withdrawal with no retained authored source",
      "inspect",
      "preview",
      "skip",
      "purchase",
      "conversion",
      "respec",
      "depart",
      "resume",
      "ack_return"
    ],
    "no_new_batch": {
      "initial": "current null -> status none",
      "ineligible_return": "keep prior current including purchased status; set carried_from_previous_return iff prior batch remains",
      "empty_eligible_pool": "valid qualifying return with zero eligible blueprints replaces current with an empty recorded batch; status none, reason no_eligible_offer; preserve receipt; no fallback/free grant",
      "short_pool": "stop at exhausted pool; zero through requested count allowed; no duplicate filling",
      "empty_eligible_pool_reachability": "Configured M1 has four eligible passive bases, so qualifying empty pool is not a normal reachable case; distinguish a valid later empty pool from malformed registry/version, which is rejected rather than treated as empty."
    },
    "freshness": "stored context, candidates, purchased receipt and config version survive all reads; stale view rejected; next eligible return changes batch",
    "purchase_conditions": [
      "phase home after ack_return",
      "current batch, not already purchased",
      "current view_token/revision and choice handle",
      "unspent units >= candidate price",
      "explicit commit_preparation plan; no hidden cancellation"
    ],
    "no_purchase_conditions": [
      "policy skipped candidate is not a ban",
      "learning/equipment/deck suitability is separate from purchasing; retained purchased item may remain unused"
    ],
    "natural_individual_grants": [],
    "disable_AR_generatedRewards_for_scn_unlocks": true,
    "event_tiers": {
      "SCN-001-ACT01-TRAVERSED": "I",
      "SCN-001-ACT02-DEFEATED": "I",
      "SCN-001-ACT03-TRAVERSED": "I",
      "SCN-001-ACT04-TRAVERSED": "I",
      "SCN-001-ACT05-TRAVERSED": "I"
    },
    "generation_context_mapping": {
      "seed": "active.seed",
      "index": "active.index",
      "route": "A",
      "tier": "maximum retained rated source rank",
      "sources": "sorted reward ledger keys; keys include run/RW/source event",
      "card_bases": "sorted unlocked registry base IDs after kept unlock union"
    }
  },
  "source": {
    "path": "docs/仕様案/接続データ/co-01a/m1-input.v0.1.json",
    "sha256": "5e030a86aa67c5029a4e2b54236bd99b459cacc3c69755d4e04f704942d436d6"
  }
};
function freeze(x){if(x&&typeof x==="object"){Object.values(x).forEach(freeze);Object.freeze(x);}return x;}
export default freeze(data);
