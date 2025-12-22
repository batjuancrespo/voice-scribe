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
    'coma cero': '.0',
    'coma uno': '.1',
    'coma dos': '.2',
    'coma tres': '.3',
    'coma cuatro': '.4',
    'coma cinco': '.5',
    'coma seis': '.6',
    'coma siete': '.7',
    'coma ocho': '.8',
    'coma nueve': '.9',
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
    result = result.replace(/(\d+)(mm|cm|m)\b/g, '$1 $2');

    // 8. Convert "de X por Y mm" → "de XxY mm"
    result = result.replace(/de\s+(\d+)\s*x\s*(\d+)\s*(mm|cm)/gi, 'de $1x$2 $3');

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

    return result;
}
