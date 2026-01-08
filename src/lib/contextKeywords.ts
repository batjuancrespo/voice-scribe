// Context Keywords for Automatic Detection
// Maps specific medical contexts to their unique triggering keywords and associated boost terms.

export interface ContextDefinition {
    id: string;
    name: string;
    keywords: string[]; // Words that trigger this context
    boostTerms: string[]; // Words to prioritize when this context is active
}

export const CONTEXT_DEFINITIONS: Record<string, ContextDefinition> = {
    abdomen: {
        id: 'abdomen',
        name: 'Abdomen y Pelvis',
        keywords: [
            'hígado', 'vesícula', 'páncreas', 'bazo', 'riñón', 'adrenal', 'suprarrenal',
            'aorta abdominal', 'vena cava', 'retroperitoneo', 'peritoneo', 'mesenterio',
            'estómago', 'duodeno', 'yeyuno', 'íleon', 'ciego', 'colon', 'recto',
            'vejiga', 'próstata', 'útero', 'ovario', 'anejo', 'anejos', 'douglas',
            'morrison', 'gerota', 'segmento hepático', 'vía biliar', 'colédoco'
        ],
        boostTerms: [
            'hígado', 'vesícula biliar', 'páncreas', 'bazo', 'riñón', 'glándula suprarrenal',
            'colédoco', 'cístico', 'wirsung', 'santorini', 'segmento', 'lóbulo caudado',
            'vena porta', 'vena esplénica', 'ganglios retroperitoneales', 'líquido libre',
            'ascitis', 'esteatosis', 'cirrosis', 'litiasis', 'colelitiasis', 'barro biliar',
            'pancreatitis', 'cholecistitis', 'pielonefritis', 'hidronefrosis', 'nefrocalcinosis',
            'angiomiolipoma', 'quiste renal', 'bosniak', 'diverticulitis', 'apendicitis',
            'crohn', 'ileítis', 'adenopatías mesentéricas', 'útero en anteversión',
            'mioma', 'endometrio', 'quiste ovárico', 'folículo', 'próstata', 'zona periférica',
            'hiperplasia benigna', 'vesículas seminales'
        ]
    },
    torax: {
        id: 'torax',
        name: 'Tórax',
        keywords: [
            'pulmón', 'pulmones', 'pleura', 'mediastino', 'hilio', 'corazón', 'aorta torácica',
            'tráquea', 'bronquio', 'alvéolo', 'intersticio', 'diafragma', 'costilla',
            'pared torácica', 'axila', 'neumotórax', 'derrame pleural'
        ],
        boostTerms: [
            'parénquima pulmonar', 'lóbulo superior', 'lóbulo medio', 'lóbulo inferior',
            'lingula', 'cisura mayor', 'cisura menor', 'hilio pulmonar', 'mediastino',
            'carina', 'bronquio principal', 'bronquiectasias', 'vidrio deslustrado',
            'nódulo pulmonar', 'masa pulmonar', 'atelectasia', 'consolidación',
            'derrame pleural', 'engrosamiento pleural', 'neumotórax', 'bulla', 'enfisema',
            'patrón reticular', 'patrón intersticial', 'adenopatías hiliares',
            'silueta cardíaca', 'botón aórtico', 'tronco de la pulmonar'
        ]
    },
    neuro: {
        id: 'neuro',
        name: 'Neurorradiología',
        keywords: [
            'cráneo', 'cerebro', 'encéfalo', 'cerebelo', 'tallo', 'tronco', 'médula',
            'ventrículo', 'cisterna', 'surco', 'circunvolución', 'sustancia blanca',
            'sustancia gris', 'polígono de willis', 'carótida', 'seno venoso'
        ],
        boostTerms: [
            'parénquima cerebral', 'lóbulo frontal', 'lóbulo temporal', 'lóbulo parietal', 'lóbulo occipital',
            'ganglios basales', 'tálamo', 'núcleo caudado', 'lenticular', 'cápsula interna',
            'cuerpo calloso', 'ventrículos laterales', 'tercer ventrículo', 'cuarto ventrículo',
            'cisterna magna', 'silla turca', 'hipófisis', 'seno cavernoso', 'ángulo pontocerebeloso',
            'mesencéfalo', 'protuberancia', 'bulbo raquídeo', 'vermis', 'amígdala cerebelosa',
            'sustancia blanca periventricular', 'centro semioval', 'corona radiada',
            'infarto agudo', 'hemorragia', 'hematoma', 'subdural', 'epidural', 'subaracnoidea',
            'gliosis', 'leucoaraiosis', 'atrofia cortical', 'hidrocefalia', 'edema citotóxico', 'vasogénico'
        ]
    },
    mama: {
        id: 'mama',
        name: 'Patología Mamaria',
        keywords: [
            'mama', 'seno', 'pezón', 'areola', 'cuadrante', 'axila', 'bi-rads',
            'birads', 'implante', 'prótesis', 'ganglio axilar'
        ],
        boostTerms: [
            'mama derecha', 'mama izquierda', 'tejido fibroglandular', 'patrón graso',
            'densidad mamaria', 'cuadrante superoexterno', 'cuadrante superointerno',
            'cuadrante inferoexterno', 'cuadrante inferointerno', 'región retroareolar',
            'cola de spence', 'plano muscular', 'piel', 'complejo areola-pezón',
            'nódulo', 'asimetría', 'distorsión', 'microcalcificaciones', 'macrocalcificaciones',
            'pleomórficas', 'benignas', 'sospechosas', 'bi-rads 0', 'bi-rads 1', 'bi-rads 2',
            'bi-rads 3', 'bi-rads 4', 'bi-rads 5', 'bi-rads 6', 'quiste simple',
            'quiste complicado', 'fibroadenoma', 'ganglio intramamario', 'adenopatía axilar'
        ]
    },
    musculo: {
        id: 'musculo',
        name: 'Músculo-Esquelético',
        keywords: [
            'hueso', 'articulación', 'músculo', 'tendón', 'ligamento', 'cartílago',
            'fractura', 'luxación', 'fisura', 'corteza', 'medular', 'periostio',
            'húmero', 'radio', 'cúbito', 'fémur', 'tibia', 'peroné', 'rodilla', 'hombro'
        ],
        boostTerms: [
            'fractura conminuta', 'trazo de fractura', 'callo óseo', 'pseudoartrosis',
            'luxación', 'subluxación', 'derrame articular', 'sinovitis', 'bursitis',
            'tendinosis', 'tendinitis', 'rotura tendinosa', 'desgarro muscular',
            'ligamento cruzado anterior', 'ligamento cruzado posterior', 'menisco interno',
            'menisco externo', 'manguito rotador', 'supraespinoso', 'infraespinoso',
            'labrum', 'cartílago articular', 'condropatía', 'artrosis', 'osteofitos',
            'esclerosis subcondral', 'geoda', 'edema óseo', 'metástasis ósea'
        ]
    }
};
