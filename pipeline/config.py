"""Single place for every rule, weight and threshold the pipeline uses.

Nothing here is hidden inside the code paths: an analyst can read this file and
reproduce any rating the pipeline produces. Change a number here and the whole
pipeline (and the Rubric / Evidence Log sheets in the output workbook) follows.
"""
import re

# --------------------------------------------------------------------------
# 1. CRITICALITY RUBRIC  (role 01: "criteria clear enough that another analyst
#    arrives at the same rating")
# --------------------------------------------------------------------------
# Each factor is scored 1-4 from the provided columns, then weighted.
CRITICALITY_WEIGHTS = {
    "data_sensitivity": 0.30,
    "operational_dependency": 0.25,
    "payment_flow": 0.15,
    "regulatory_exposure": 0.15,
    "data_volume": 0.15,
}

# score >= threshold  -> tier  (checked top-down)
TIER_THRESHOLDS = [("Critical", 3.00), ("High", 2.50), ("Medium", 1.90), ("Low", 0.0)]  # calibrated on benchmark V-000
TIER_RANK = {"Low": 1, "Medium": 2, "High": 3, "Critical": 4}

DEPENDENCY_SCORE = {"total": 4, "critical": 4, "high": 3, "moderate": 2, "low": 1}

# keyword -> score for data sensitivity (highest match wins)
DATA_SENSITIVITY_RULES = [
    (4, r"tax identifier|\btax id\b|\bssn\b|\bTIN\b|full customer master|dates? of birth|\bhealth|vulnerab|call audio|government"),
    (3, r"customer|client|account (number|identifier)s?|\bnames\b|addresses|balances|portfolio|holdings|compensation|"
        r"payment instruction|counterparty|credential|privileged|configuration"),
    (2, r"in transit|transaction|payment message"),
    (1, r"no direct customer data|not applicable|none"),
]
# 'No direct customer data. Privileged access ... credentials' must not be read as 1.
DATA_SENSITIVITY_FLOOR_PATTERN = r"credential|privileged"

PAYMENT_PATTERN = r"\bpayments?\b|\brtp\b|\bach\b|\bclearing\b|\bsettlement\b|\bcards?\b|\btransfers?\b|\bwire\b"
PAYMENT_CATEGORY_PATTERN = r"\bpayments?\b"
REGULATORY_RULES = [
    (4, r"\bregulatory\b|\btax\b|\bIRS\b|core banking|core account|\bclearing\b|\bsettlement\b|\bpayments?\b"),
    (3, r"\bstatements?\b|\bcompliance\b|\breporting\b"),
    (2, r"core systems|\bbatch\b|\bcustomers?\b"),
]
# volume thresholds (max number found in volume + data columns)
VOLUME_STEPS = [(100_000_000, 4), (10_000_000, 3), (1_000_000, 2), (0, 1)]

# Hard floors: a single factor can lift the tier regardless of the weighted score.
TIER_FLOORS = [
    ("dependency_total_or_critical", "Critical",
     "Operational dependency is Critical/Total: single point of failure for a core Meridian process."),
    ("privileged_access", "High",
     "Vendor holds privileged access / credentials to production systems even without customer data."),
    ("top_data_sensitivity", "High",
     "Vendor accesses the most sensitive data class (tax IDs, full customer master, vulnerability data)."),
]

# --------------------------------------------------------------------------
# 2. ASSESSMENT DEPTH MATRIX  (role 02)
# --------------------------------------------------------------------------
DEPTH_MATRIX = {
    "Critical": {
        "label": "Full review",
        "max_pages": 14,
        "min_docs_for_negative": 4,
        "sources": ["regulatory_filing", "vendor_technical_docs", "vendor_press", "exec_statement",
                    "vendor_blog", "job_posting", "third_party_media", "vendor_marketing"],
        "manual": "Trust-centre / sub-processor review, contract & DPA review, direct vendor questionnaire.",
        "stop_rule": "Stop when a primary source (filing, technical docs or press release) confirms AI use AND "
                     "model provider status is resolved or explicitly undisclosed; otherwise exhaust all source classes.",
    },
    "High": {
        "label": "Full review",
        "max_pages": 9,
        "min_docs_for_negative": 3,
        "sources": ["vendor_technical_docs", "vendor_press", "exec_statement", "vendor_blog", "job_posting",
                    "third_party_media"],
        "manual": "Trust-centre review and targeted questionnaire where AI is detected.",
        "stop_rule": "Stop once two independent source classes agree, or when three source classes return nothing.",
    },
    "Medium": {
        "label": "Targeted review",
        "max_pages": 5,
        "min_docs_for_negative": 2,
        "sources": ["vendor_technical_docs", "vendor_press", "vendor_blog", "job_posting"],
        "manual": "Marketing-claim vs capability check; questionnaire only if AI is indicated.",
        "stop_rule": "Stop after product/technical pages and newsroom; further sweeps rarely change the rating.",
    },
    "Low": {
        "label": "Light-touch review",
        "max_pages": 3,
        "min_docs_for_negative": 1,
        "sources": ["vendor_technical_docs", "vendor_press"],
        "manual": "Annual attestation only.",
        "stop_rule": "Stop after homepage, trust and newsroom pages.",
    },
}

# --------------------------------------------------------------------------
# 3. SOURCE STRATEGY & EVIDENTIARY WEIGHT  (role 03)
# --------------------------------------------------------------------------
# class -> (weight 0-1, why)
SOURCE_CLASSES = {
    "regulatory_filing":     (1.00, "Legally accountable disclosure (10-K, regulatory comment letters, prospectus)."),
    "vendor_technical_docs": (0.90, "Product documentation, trust centre, sub-processor lists: describes real capability."),
    "vendor_press":          (0.80, "Official press release / newsroom: vendor-approved statement of deployment."),
    "exec_statement":        (0.70, "Executive post, interview or earnings call: reliable on fact of use, vague on detail."),
    "vendor_blog":           (0.55, "Vendor blog / thought leadership: mixes real capability with positioning."),
    "job_posting":           (0.50, "Technical job posts reveal stack and intent, but not necessarily production use."),
    "third_party_media":     (0.45, "Press / analyst coverage: corroborates but is second-hand."),
    "vendor_marketing":      (0.30, "Home / product marketing pages: high noise, aspirational language."),
    "unknown":               (0.20, "Unclassified source."),
}

# URL / title hints -> class (first match wins)
SOURCE_URL_HINTS = [
    ("regulatory_filing", r"sec\.gov|edgar|10-?k|annual-report|investor-relations|/regulat|comment-letter|prospectus|treasury\.gov"),
    ("vendor_technical_docs", r"docs?\.|/docs?/|developer|trust|security|subprocessor|sub-processor|privacy|"
                              r"compliance|whitepaper|technical|api\."),
    ("job_posting", r"career|jobs?\b|hiring|greenhouse|lever\.co|workday|recruit"),
    ("vendor_press", r"news|press|media-room|newsroom|release|announce"),
    ("exec_statement", r"linkedin\.com/posts|interview|earnings|keynote|ceo"),
    ("vendor_blog", r"blog|insight|resource|article|thought|perspective|stories"),
]

# Signal types -> multiplier on the source weight
SIGNAL_TYPES = {
    "DEPLOYED_USE":      1.00,   # "has deployed / powered by / now live"
    "PRODUCT_FEATURE":   0.80,   # AI embedded in the product
    "PARTNERSHIP":       0.70,   # collaborating / integrating with a model provider
    "HIRING":            0.50,   # job-post references AI work
    "ROADMAP":           0.40,   # will / plans / pilot
    "MENTION":           0.20,   # AI mentioned, role unclear
    "READINESS_MARKETING": 0.15, # "AI-ready", "whether or not you adopt AI"
    "ADVOCACY":          0.10,   # urges others to adopt AI
    "NEGATION":          0.00,   # explicit statement of no AI use
}
# Provenance discount for evidence typed in by an analyst rather than machine-fetched.
ANALYST_RECORDED_TRUST = 0.90
# A source that describes a SUPPLIER's product rather than the vendor's own use.
SUPPLIER_ATTRIBUTION_TRUST = 0.60

# Evidence tags (what the stakeholder sees). Evaluated top-down.
TAG_RULES = [
    ("Confirmed",      0.75),
    ("Probable",       0.50),
    ("Indicative",     0.25),
    ("Marketing-only", 0.0),   # signals exist, but too weak / only readiness language
]

# --------------------------------------------------------------------------
# 4. SIGNAL PATTERNS
# --------------------------------------------------------------------------
AI_TERMS = re.compile(
    r"\b(AI|A\.I\.|artificial intelligence|machine learning|ML|LLMs?|large language models?|generative|GenAI|"
    r"gen AI|agentic|AI[- ]agents?|copilots?|foundation models?|neural|NLP|model context protocol|MCP|"
    r"deep learning|computer vision|predictive model|SLMs?)\b"
)
AGENTIC = re.compile(r"agentic|AI[- ]agents?|autonomous|digital workers?|without human|agent orchestration|"
                     r"agents? (that|built|on)|multi-agent|multi-step", re.I)
GENERATIVE = re.compile(r"generative|GenAI|gen AI|LLM|large language|copilot|assistant|foundation model|"
                        r"summaris|summariz|draft", re.I)
ANALYTIC = re.compile(r"machine learning|ML\b|anomaly|fraud (scoring|detection)|predictive|classif|scoring", re.I)

SIGNAL_PATTERNS = [
    ("NEGATION", re.compile(r"\b(do(es)? not|don't|never|without)\b.{0,40}\b(use|uses|using|train)\b.{0,40}"
                            r"\b(AI|artificial intelligence|machine learning|customer data)", re.I)),
    ("READINESS_MARKETING", re.compile(r"AI[- ]ready|AI readiness|ready for AI|whether or not|foundation (for|first)|"
                                       r"prepare[sd]? .{0,30}AI|can only reason over|enable[sd]? .{0,20}AI", re.I)),
    ("ADVOCACY", re.compile(r"\b(encourage|advocat|urge|call(s)? on|recommend)\w*\b.{0,80}"
                            r"\b(banks?|institutions?|regulator|adopt)", re.I)),
    ("ROADMAP", re.compile(r"\b(will|plans? to|planning|roadmap|exploring|pilot(ing)?|upcoming|soon|"
                           r"expected to|intends? to)\b", re.I)),
    ("DEPLOYED_USE", re.compile(r"\b(has|have|had)\s+(now\s+)?(deployed|launched|rolled out|integrated|built)|"
                                r"\b(is|are)\s+(now\s+)?(using|powered|built|live|running)|powered by|now (live|available)|"
                                r"newly launched|deploys?|deployed|in production|built on|handle[sd]?|draft|summaris|"
                                r"progress routine", re.I)),
    ("PARTNERSHIP", re.compile(r"collaborat|partner|integrat|alliance|in collaboration with|working with", re.I)),
    ("PRODUCT_FEATURE", re.compile(r"\b(feature|assistant|embedded|native|introduc|offers?|includes?|"
                                   r"AI jobs?|connection objects?|framework|platform|operating system|automation)\b", re.I)),
]

# model providers / sub-processors  ->  canonical name
PROVIDERS = [
    (r"azure openai|microsoft foundry|azure ai|microsoft (365 )?copilot|github copilot|\bmicrosoft\b", "Microsoft (Azure OpenAI / Foundry / Copilot)"),
    (r"\bopenai\b|chatgpt|\bgpt-?\d", "OpenAI"),
    (r"anthropic|\bclaude\b", "Anthropic"),
    (r"google cloud|gemini|vertex ai|\bgoogle\b", "Google Cloud (Gemini / Vertex AI)"),
    (r"\baws\b|amazon web services|bedrock|sagemaker|amazon q", "Amazon Web Services (Bedrock / SageMaker)"),
    (r"mistral", "Mistral AI"),
    (r"cohere", "Cohere"),
    (r"\bllama\b|meta ai", "Meta (Llama)"),
    (r"hugging ?face", "Hugging Face"),
    (r"\bibm\b|watsonx", "IBM (watsonx)"),
    (r"nvidia", "NVIDIA"),
]
# Software suppliers that are NOT model providers (never listed as AI sub-processors).
NOT_MODEL_PROVIDERS = re.compile(r"broadcom|automic|appworx|uc4", re.I)

# --------------------------------------------------------------------------
# 5. AI SECURITY RISK  (role 05)
# --------------------------------------------------------------------------
# severity = 0.4*tier + 0.4*data_sensitivity + 0.2*ai_role   (each 1-4)
RISK_WEIGHTS = {"tier": 0.4, "data": 0.4, "ai_role": 0.2}
AI_ROLE_SCORE = {"agentic": 4, "generative": 3, "analytic": 2, "unspecified": 1, "none": 0}
RISK_THRESHOLDS = [("Critical", 3.70), ("High", 2.70), ("Medium", 1.90), ("Low", 0.0)]
# A weak evidence tag caps how severe the *classification* can be (confidence axis).
CONFIDENCE_CAP = {"Confirmed": "Critical", "Probable": "High", "Indicative": "Medium", "Marketing-only": "Medium"}

ACTION_SLA = {"Critical": "within 15 business days", "High": "within 30 business days",
              "Medium": "at the next scheduled vendor review", "Low": "at annual review"}
