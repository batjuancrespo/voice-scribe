// Radiology Medical Dictionary - Common terms in radiology reports
export const RADIOLOGY_DICTIONARY: Record<string, string> = {
    // Anatomía General
    "tórax": "tórax",
    "abdomen": "abdomen",
    "pelvis": "pelvis",
    "cráneo": "cráneo",
    "columna": "columna",
    "cervical": "cervical",
    "dorsal": "dorsal",
    "lumbar": "lumbar",
    "sacro": "sacro",

    // Estructuras Anatómicas
    "parénquima": "parénquima",
    "mediastino": "mediastino",
    "hilio": "hilio",
    "pleura": "pleura",
    "pericardio": "pericardio",
    "diafragma": "diafragma",
    "aorta": "aorta",
    "vena cava": "vena cava",
    "arteria pulmonar": "arteria pulmonar",

    // Hallazgos Comunes
    "normal": "normal",
    "patológico": "patológico",
    "lesión": "lesión",
    "masa": "masa",
    "nódulo": "nódulo",
    "quiste": "quiste",
    "calcificación": "calcificación",
    "derrame": "derrame",
    "enfisema": "enfisema",
    "atelectasia": "atelectasia",
    "condensación": "condensación",
    "infiltrado": "infiltrado",
    "neumonía": "neumonía",
    "edema": "edema",
    "fibrosis": "fibrosis",
    "neumotórax": "neumotórax",
    "hemotórax": "hemotórax",

    // Descriptores
    "hipodensidad": "hipodensidad",
    "hiperdensidad": "hiperdensidad",
    "isodensidad": "isodensidad",
    "heterogéneo": "heterogéneo",
    "homogéneo": "homogéneo",
    "bilateral": "bilateral",
    "unilateral": "unilateral",
    "difuso": "difuso",
    "focal": "focal",
    "periférico": "periférico",
    "central": "central",
    "proximal": "proximal",
    "distal": "distal",

    // Tamaños y Medidas (números romanos comunes en radiología)
    "milímetros": "mm",
    "centímetros": "cm",
    "romano uno": "I",
    "romano dos": "II",
    "romano tres": "III",
    "romano cuatro": "IV",
    "romano cinco": "V",
    "romano seis": "VI",
    "romano siete": "VII",
    "romano ocho": "VIII",
    "romano nueve": "IX",
    "romano diez": "X",

    // Proyecciones y Técnicas
    "radiografía": "radiografía",
    "tomografía": "tomografía",
    "resonancia": "resonancia",
    "ecografía": "ecografía",
    "posteroanterior": "posteroanterior",
    "lateral": "lateral",
    "axial": "axial",
    "coronal": "coronal",
    "sagital": "sagital",
    "contraste": "contraste",
    "gadolinio": "gadolinio",

    // Patología Específica
    "fractura": "fractura",
    "luxación": "luxación",
    "espondilolistesis": "espondilolistesis",
    "hernia discal": "hernia discal",
    "protrusión": "protrusión",
    "estenosis": "estenosis",
    "dilatación": "dilatación",
    "oclusión": "oclusión",
    "trombosis": "trombosis",
    "embolia": "embolia",
    "aneurisma": "aneurisma",
    "disección": "disección",

    // Órganos Abdominales
    "hígado": "hígado",
    "vesícula": "vesícula",
    "páncreas": "páncreas",
    "bazo": "bazo",
    "riñón": "riñón",
    "vejiga": "vejiga",
    "próstata": "próstata",
    "útero": "útero",
    "ovario": "ovario",

    // Conclusiones
    "compatible con": "compatible con",
    "sugestivo de": "sugestivo de",
    "hallazgos compatibles": "hallazgos compatibles",
    "sin alteraciones": "sin alteraciones",
    "sin cambios": "sin cambios",
    "estable": "estable",
    "evolutivo": "evolutivo",
    "se recomienda": "se recomienda",
    "control evolutivo": "control evolutivo",

    // Abreviaturas comunes (expandidas al dictarse)
    "TAC": "TC",
    "resonancia magnética": "RM",
    "radiografía simple": "Rx",
};

// Medical hints for Web Speech API - palabras que usa frecuentemente
export const RADIOLOGY_HINTS = [
    "tórax", "abdomen", "pelvis", "cráneo", "columna",
    "nódulo", "masa", "lesión", "derrame", "neumotórax",
    "fractura", "hernia", "estenosis", "dilatación",
    "hígado", "páncreas", "riñón", "vejiga",
    "normal", "patológico", "compatible", "sugestivo",
    "milímetros", "centímetros", "bilateral", "unilateral",
    "hipodensidad", "hiperdensidad", "heterogéneo", "homogéneo"
];
