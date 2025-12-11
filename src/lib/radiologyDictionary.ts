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
    "hipointenso": "hipointenso",
    "hiperintenso": "hiperintenso",
    "isointenso": "isointenso",
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
    "anterior": "anterior",
    "posterior": "posterior",
    "superior": "superior",
    "inferior": "inferior",
    "medial": "medial",
    "lateral": "lateral",

    // Tamaños y Medidas (números romanos comunes en radiología)
    "milímetros": "mm",
    "centímetros": "cm",
    "metros": "m",
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
    "romano once": "XI",
    "romano doce": "XII",

    // === TC (Tomografía Computarizada) ===
    "tomografía computarizada": "TC",
    "TAC": "TC",
    "escáner": "TC",

    // TC - Técnica
    "sin contraste": "sin contraste",
    "con contraste": "con contraste",
    "contraste intravenoso": "contraste i.v.",
    "contraste oral": "contraste oral",
    "fase arterial": "fase arterial",
    "fase venosa": "fase venosa",
    "fase portal": "fase portal",
    "fase tardía": "fase tardía",
    "angio TC": "angio-TC",
    "uro TC": "uro-TC",

    // TC - Hallazgos
    "unidades Hounsfield": "UH",
    "densidad agua": "densidad agua",
    "densidad grasa": "densidad grasa",
    "captación de contraste": "captación de contraste",
    "realce": "realce",
    "sin realce": "sin realce",
    "realce homogéneo": "realce homogéneo",
    "realce heterogéneo": "realce heterogéneo",
    "nivel hidroaéreo": "nivel hidroaéreo",
    "aire libre": "neumoperitoneo",

    // TC - Ventanas
    "ventana de pulmón": "ventana de pulmón",
    "ventana de mediastino": "ventana de mediastino",
    "ventana de tejidos blandos": "ventana de tejidos blandos",
    "ventana ósea": "ventana ósea",

    // === RM (Resonancia Magnética) ===
    "resonancia magnética": "RM",

    // RM - Secuencias
    "secuencia T1": "T1",
    "secuencia T2": "T2",
    "T1 con gadolinio": "T1+Gd",
    "T uno": "T1",
    "T dos": "T2",
    "FLAIR": "FLAIR",
    "difusión": "difusión",
    "DWI": "DWI",
    "ADC": "ADC",
    "STIR": "STIR",
    "gradiente": "gradiente",
    "eco de gradiente": "eco de gradiente",
    "secuencia ponderada": "secuencia ponderada",

    // RM - Contraste
    "gadolinio": "gadolinio",
    "sin gadolinio": "sin gadolinio",
    "con gadolinio": "con gadolinio",

    // RM - Hallazgos
    "hiperintensidad": "hiperintensidad",
    "hipointensidad": "hipointensidad",
    "isointensidad": "isointensidad",
    "restricción a la difusión": "restricción a la difusión",
    "sin restricción": "sin restricción",
    "coeficiente de difusión": "coeficiente de difusión",

    // RM - Neurología
    "sustancia blanca": "sustancia blanca",
    "sustancia gris": "sustancia gris",
    "núcleos grises": "núcleos de la base",
    "ganglios basales": "ganglios basales",
    "tálamo": "tálamo",
    "hipocampo": "hipocampo",
    "cerebelo": "cerebelo",
    "tronco cerebral": "tronco cerebral",
    "médula espinal": "médula espinal",
    "ventrículo": "ventrículo",
    "ventrículos laterales": "ventrículos laterales",
    "tercer ventrículo": "tercer ventrículo",
    "cuarto ventrículo": "cuarto ventrículo",

    // Proyecciones y Técnicas Generales
    "radiografía": "radiografía",
    "tomografía": "tomografía",
    "resonancia": "resonancia",
    "ecografía": "ecografía",
    "posteroanterior": "posteroanterior",
    "PA": "PA",

    "axial": "axial",
    "coronal": "coronal",
    "sagital": "sagital",
    "oblicuo": "oblicuo",
    "tridimensional": "3D",
    "reconstrucción multiplanar": "reconstrucción multiplanar",
    "MPR": "MPR",
    "MIP": "MIP",
    "volumen rendering": "volumen rendering",

    // Patología Específica
    "fractura": "fractura",
    "luxación": "luxación",
    "espondilolistesis": "espondilolistesis",
    "hernia discal": "hernia discal",
    "protrusión": "protrusión",
    "extrusión": "extrusión",
    "secuestro": "secuestro",
    "estenosis": "estenosis",
    "estenosis del canal": "estenosis del canal",
    "dilatación": "dilatación",
    "oclusión": "oclusión",
    "trombosis": "trombosis",
    "embolia": "embolia",
    "aneurisma": "aneurisma",
    "disección": "disección",
    "neoplasia": "neoplasia",
    "tumor": "tumor",
    "metástasis": "metástasis",
    "adenopatía": "adenopatía",
    "linfadenopatía": "linfadenopatía",

    // Órganos Abdominales
    "hígado": "hígado",
    "vesícula": "vesícula biliar",
    "vesícula biliar": "vesícula biliar",
    "vía biliar": "vía biliar",
    "conducto biliar": "conducto biliar",
    "colédoco": "colédoco",
    "páncreas": "páncreas",
    "bazo": "bazo",
    "riñón": "riñón",
    "riñón derecho": "riñón derecho",
    "riñón izquierdo": "riñón izquierdo",
    "uréter": "uréter",
    "vejiga": "vejiga",
    "próstata": "próstata",
    "útero": "útero",
    "ovario": "ovario",
    "intestino": "intestino",
    "colon": "colon",
    "recto": "recto",
    "estómago": "estómago",
    "duodeno": "duodeno",

    // Conclusiones
    "compatible con": "compatible con",
    "sugestivo de": "sugestivo de",
    "sospechoso de": "sospechoso de",
    "hallazgos compatibles": "hallazgos compatibles",
    "sin alteraciones": "sin alteraciones significativas",
    "sin cambios": "sin cambios significativos",
    "estable": "estable",
    "evolutivo": "en evolución",
    "se recomienda": "se recomienda",
    "control evolutivo": "control evolutivo",
    "correlación clínica": "correlación clínica",
    "valoración clínica": "valoración clínica",
    "estudio comparativo": "estudio comparativo",

    // Abreviaturas comunes
    "líquido cefalorraquídeo": "LCR",
};

// Medical hints for Web Speech API - palabras que usa frecuentemente
export const RADIOLOGY_HINTS = [
    // Anatomía básica
    "tórax", "abdomen", "pelvis", "cráneo", "columna",

    // Hallazgos
    "nódulo", "masa", "lesión", "derrame", "neumotórax",
    "fractura", "hernia", "estenosis", "dilatación",

    // Órganos
    "hígado", "páncreas", "riñón", "vejiga", "bazo",

    // TC específico
    "tomografía", "contraste", "captación", "realce",
    "hipodensidad", "hiperdensidad", "fase arterial", "angio",

    // RM específico
    "resonancia", "gadolinio", "T1", "T2", "FLAIR", "difusión",
    "hiperintenso", "hipointenso", "sustancia blanca",

    // Descriptores
    "normal", "patológico", "compatible", "sugestivo",
    "bilateral", "unilateral", "heterogéneo", "homogéneo",

    // Medidas
    "milímetros", "centímetros"
];
