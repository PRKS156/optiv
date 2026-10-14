window.PIPELINE_CONFIG = {
 "criticality_weights": {
  "data_sensitivity": 0.3,
  "operational_dependency": 0.25,
  "payment_flow": 0.15,
  "regulatory_exposure": 0.15,
  "data_volume": 0.15
 },
 "tier_thresholds": [
  [
   "Critical",
   3.0
  ],
  [
   "High",
   2.5
  ],
  [
   "Medium",
   1.9
  ],
  [
   "Low",
   0.0
  ]
 ],
 "depth": {
  "Critical": {
   "label": "Full review",
   "max_pages": 14,
   "min_docs_for_negative": 4,
   "sources": [
    "regulatory_filing",
    "vendor_technical_docs",
    "vendor_press",
    "exec_statement",
    "vendor_blog",
    "job_posting",
    "third_party_media",
    "vendor_marketing"
   ],
   "manual": "Trust-centre / sub-processor review, contract & DPA review, direct vendor questionnaire.",
   "stop_rule": "Stop when a primary source (filing, technical docs or press release) confirms AI use AND model provider status is resolved or explicitly undisclosed; otherwise exhaust all source classes."
  },
  "High": {
   "label": "Full review",
   "max_pages": 9,
   "min_docs_for_negative": 3,
   "sources": [
    "vendor_technical_docs",
    "vendor_press",
    "exec_statement",
    "vendor_blog",
    "job_posting",
    "third_party_media"
   ],
   "manual": "Trust-centre review and targeted questionnaire where AI is detected.",
   "stop_rule": "Stop once two independent source classes agree, or when three source classes return nothing."
  },
  "Medium": {
   "label": "Targeted review",
   "max_pages": 5,
   "min_docs_for_negative": 2,
   "sources": [
    "vendor_technical_docs",
    "vendor_press",
    "vendor_blog",
    "job_posting"
   ],
   "manual": "Marketing-claim vs capability check; questionnaire only if AI is indicated.",
   "stop_rule": "Stop after product/technical pages and newsroom; further sweeps rarely change the rating."
  },
  "Low": {
   "label": "Light-touch review",
   "max_pages": 3,
   "min_docs_for_negative": 1,
   "sources": [
    "vendor_technical_docs",
    "vendor_press"
   ],
   "manual": "Annual attestation only.",
   "stop_rule": "Stop after homepage, trust and newsroom pages."
  }
 },
 "source_classes": {
  "regulatory_filing": {
   "weight": 1.0,
   "why": "Legally accountable disclosure (10-K, regulatory comment letters, prospectus)."
  },
  "vendor_technical_docs": {
   "weight": 0.9,
   "why": "Product documentation, trust centre, sub-processor lists: describes real capability."
  },
  "vendor_press": {
   "weight": 0.8,
   "why": "Official press release / newsroom: vendor-approved statement of deployment."
  },
  "exec_statement": {
   "weight": 0.7,
   "why": "Executive post, interview or earnings call: reliable on fact of use, vague on detail."
  },
  "vendor_blog": {
   "weight": 0.55,
   "why": "Vendor blog / thought leadership: mixes real capability with positioning."
  },
  "job_posting": {
   "weight": 0.5,
   "why": "Technical job posts reveal stack and intent, but not necessarily production use."
  },
  "third_party_media": {
   "weight": 0.45,
   "why": "Press / analyst coverage: corroborates but is second-hand."
  },
  "vendor_marketing": {
   "weight": 0.3,
   "why": "Home / product marketing pages: high noise, aspirational language."
  },
  "unknown": {
   "weight": 0.2,
   "why": "Unclassified source."
  }
 },
 "signal_types": {
  "DEPLOYED_USE": 1.0,
  "PRODUCT_FEATURE": 0.8,
  "PARTNERSHIP": 0.7,
  "HIRING": 0.5,
  "ROADMAP": 0.4,
  "MENTION": 0.2,
  "READINESS_MARKETING": 0.15,
  "ADVOCACY": 0.1,
  "NEGATION": 0.0
 },
 "tag_rules": [
  [
   "Confirmed",
   0.75
  ],
  [
   "Probable",
   0.5
  ],
  [
   "Indicative",
   0.25
  ],
  [
   "Marketing-only",
   0.0
  ]
 ],
 "risk_weights": {
  "tier": 0.4,
  "data": 0.4,
  "ai_role": 0.2
 },
 "risk_thresholds": [
  [
   "Critical",
   3.7
  ],
  [
   "High",
   2.7
  ],
  [
   "Medium",
   1.9
  ],
  [
   "Low",
   0.0
  ]
 ],
 "confidence_cap": {
  "Confirmed": "Critical",
  "Probable": "High",
  "Indicative": "Medium",
  "Marketing-only": "Medium"
 },
 "floors": [
  {
   "id": "dependency_total_or_critical",
   "tier": "Critical",
   "why": "Operational dependency is Critical/Total: single point of failure for a core Meridian process."
  },
  {
   "id": "privileged_access",
   "tier": "High",
   "why": "Vendor holds privileged access / credentials to production systems even without customer data."
  },
  {
   "id": "top_data_sensitivity",
   "tier": "High",
   "why": "Vendor accesses the most sensitive data class (tax IDs, full customer master, vulnerability data)."
  }
 ]
};
