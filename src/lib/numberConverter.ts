// Number conversion utilities for Spanish medical dictation

const UNITS: Record<string, number> = {
    'cero': 0, 'uno': 1, 'dos': 2, 'tres': 3, 'cuatro': 4,
    'cinco': 5, 'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9,
    'diez': 10, 'once': 11, 'doce': 12, 'trece': 13, 'catorce': 14,
    'quince': 15, 'dieciséis': 16, 'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
    'veinte': 20, 'veintiuno': 21, 'veintidós': 22, 'veintitrés': 23, 'veinticuatro': 24,
    'veinticinco': 25, 'veintiséis': 26, 'veintisiete': 27, 'veintiocho': 28, 'veintinueve': 29,
    'treinta': 30, 'cuarenta': 40, 'cincuenta': 50, 'sesenta': 60,
    'setenta': 70, 'ochenta': 80, 'noventa': 90,
    'cien': 100, 'ciento': 100, 'doscientos': 200, 'trescientos': 300,
    'cuatrocientos': 400, 'quinientos': 500, 'seiscientos': 600,
    'setecientos': 700, 'ochocientos': 800, 'novecientos': 900,
    'mil': 1000, 'millón': 1000000
};

const DECIMALS: Record<string, string> = {
    'coma cero': '.0', 'coma uno': '.1', 'coma dos': '.2', 'coma tres': '.3', 'coma cuatro': '.4',
    'coma cinco': '.5', 'coma seis': '.6', 'coma siete': '.7', 'coma ocho': '.8', 'coma nueve': '.9',
    'punto cero': '.0', 'punto uno': '.1', 'punto dos': '.2', 'punto tres': '.3', 'punto cuatro': '.4',
    'punto cinco': '.5', 'punto seis': '.6', 'punto siete': '.7', 'punto ocho': '.8', 'punto nueve': '.9',
};

// Convert text numbers to digits
export function convertTextNumbersToDigits(text: string): string {
    let result = text;

    const boundaryStart = '(?<![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';
    const boundaryEnd = '(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';

    // 1. Convert common decimal patterns
    Object.entries(DECIMALS).forEach(([textNum, digit]) => {
        const regex = new RegExp(`${boundaryStart}${textNum}${boundaryEnd}`, 'gi');
        result = result.replace(regex, digit);
    });

    // 2. Convert individual text numbers (simple cases)
    Object.entries(UNITS).sort((a, b) => b[0].length - a[0].length).forEach(([textNum, digit]) => {
        // Only replace if it's a standalone number (word boundaries)
        const regex = new RegExp(`${boundaryStart}${textNum}${boundaryEnd}`, 'gi');
        result = result.replace(regex, digit.toString());
    });

    // 3. Convert compound numbers like "treinta y cinco" → "35"
    result = result.replace(new RegExp(`${boundaryStart}(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\\s+y\\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)${boundaryEnd}`, "gi"),
        (match, tens, units) => {
            const tensValue = UNITS[tens.toLowerCase()] || 0;
            const unitsValue = UNITS[units.toLowerCase()] || 0;
            return (tensValue + unitsValue).toString();
        });

    // 4. Convert measurement patterns
    // "X por Y" (dimensions) → "XxY"
    result = result.replace(/(\d+)\s+por\s+(\d+)/gi, '$1x$2');

    // 5. Convert percentage
    result = result.replace(new RegExp(`${boundaryStart}por\\s+ciento${boundaryEnd}`, "gi"), '%');

    // 6. Convert mathematical symbols
    result = result.replace(new RegExp(`${boundaryStart}más\\s+menos${boundaryEnd}`, "gi"), '±');
    result = result.replace(new RegExp(`${boundaryStart}menor\\s+que${boundaryEnd}`, "gi"), '<');
    result = result.replace(new RegExp(`${boundaryStart}mayor\\s+que${boundaryEnd}`, "gi"), '>');
    result = result.replace(new RegExp(`${boundaryStart}grados${boundaryEnd}`, "gi"), '°');

    // 7. Measurement patterns - "de X milímetros" → "de X mm" (already handled by dictionary)
    // But ensure spacing: "15mm" → "15 mm"
    result = result.replace(/(\d+)(mm|cm|m|uh|cc)\b/gi, '$1 $2');

    // 8. Convert "de X por Y mm" → "de XxY mm"
    result = result.replace(/de\s+(\d+)\s*x\s*(\d+)\s*(mm|cm|uh|cc)/gi, 'de $1x$2 $3');

    return result;
}

// Convert "te uno a" or "té 1 b" to "T1a", "T1b"
export function processTNMStaging(text: string): string {
    let result = text;
    const boundaryStart = '(?<![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';
    const boundaryEnd = '(?![a-záéíóúüñA-ZÁÉÍÓÚÜÑ0-9])';

    // T matching: te, té, t
    // N matching: ene, ne, n
    // M matching: eme, me, m

    const patterns = [
        { search: '(?:estadio\\s+)?(?:t[ée]|t)', prefix: 'T' },
        { search: '(?:estadio\\s+)?(?:ene|ne|n)', prefix: 'N' },
        { search: '(?:estadio\\s+)?(?:eme|me|m)', prefix: 'M' }
    ];

    patterns.forEach(({ search, prefix }) => {
        // Match: boundary + phonetic prefix + number + optional letter (a, b, c, x)
        // Example: "te uno a" -> "T1a", "te 2 b" -> "T2b"
        // Support digits (1) or words transformed to digits (which happens before this call)
        const regex = new RegExp(`${boundaryStart}${search}\\s*(\\d)\\s*([abcix])?${boundaryEnd}`, 'gi');

        result = result.replace(regex, (match, num, sub) => {
            const subStage = sub ? sub.toLowerCase() : '';
            return `${prefix}${num}${subStage}`;
        });
    });

    return result;
}

// Convert ranges: "de quince a veinte" → "de 15 a 20"
export function convertNumberRanges(text: string): string {
    // This is already handled by individual number conversion above
    return text;
}

// Post-process for medical measurement patterns
export function processMedicalMeasurements(text: string): string {
    let result = text;

    // "mide X mm" patterns
    result = result.replace(/mide\s+(\d+)\s+mm/gi, 'mide $1 mm');
    result = result.replace(/mide\s+(\d+)\s+cm/gi, 'mide $1 cm');

    // "de aproximadamente X mm"
    result = result.replace(/aproximadamente\s+(\d+)/gi, '≈$1');

    // Units normalization (fallback if dictionary misses it)
    result = result.replace(/(\d+)\s+unidades\s+hounsfield/gi, '$1 UH');
    result = result.replace(/(\d+)\s+centímetros\s+cúbicos/gi, '$1 cc');
    result = result.replace(/(\d+)\s+milímetros/gi, '$1 mm');
    result = result.replace(/(\d+)\s+centímetros/gi, '$1 cm');

    // TNM Staging
    result = processTNMStaging(result);

    return result;
}
