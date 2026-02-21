//Se almacena jugadores
let NAMES = [];

// Temas predefinidos
const TOPICS = [
  {
    id: "navidad",
    label: "Navidad",
    sets: [
      { word: "PESEBRE", category: "Navidad", clue: "Representa un nacimiento" },
      { word: "VILLANCICO", category: "Navidad", clue: "Se escucha mucho en diciembre" },
      { word: "RENOS", category: "Navidad", clue: "Acompañan un viaje especial" },
      { word: "TRINEO", category: "Navidad", clue: "Se asocia con la nieve" },
      { word: "NOCHEBUENA", category: "Navidad", clue: "Ocurre antes del día principal" },
      { word: "REGALOS", category: "Navidad", clue: "Se entregan con emoción" },
      { word: "ÁRBOL DE NAVIDAD", category: "Navidad", clue: "Se adorna con algo brillante" },
      { word: "LUCES", category: "Navidad", clue: "Brillan en casas y calles" },
      { word: "BASTÓN DE CARAMELO", category: "Navidad", clue: "Es dulce y decorativo" },
      { word: "CORONA NAVIDEÑA", category: "Navidad", clue: "Suele colgarse en una puerta" },
      { word: "MANTEL NAVIDEÑO", category: "Navidad", clue: "Aparece en una mesa especial" },
      { word: "CHIMENEA", category: "Navidad", clue: "Se asocia con una visita nocturna" },
      { word: "ESFERAS", category: "Navidad", clue: "Cuelgan y brillan" },
      { word: "PAPEL ENVOLTORIO", category: "Navidad", clue: "Cubre una sorpresa" },
      { word: "NIEVE", category: "Navidad", clue: "Cae en climas fríos" }
    ]
  },
  {
    id: "belleza",
    label: "Belleza y cuidado personal",
    sets: [
      { word: "RUTINA DE SKINCARE", category: "Belleza", clue: "Suele hacerse por pasos" },
      { word: "PROTECTOR SOLAR", category: "Belleza", clue: "Se usa en la playa" },
      { word: "SHAMPOO", category: "Belleza", clue: "Se usa al ducharse" },
      { word: "LABIAL", category: "Belleza", clue: "Puede cambiar todo un look" },
      { word: "MASCARILLA FACIAL", category: "Belleza", clue: "Se deja actuar unos minutos" },
      { word: "MANICURA", category: "Belleza", clue: "Implica uñas y detalle" },
      { word: "PERFUME", category: "Belleza", clue: "Deja una impresión" },
      { word: "PESTAÑINA", category: "Belleza", clue: "Resalta la mirada" }
    ]
  },
  {
    id: "moda",
    label: "Moda y estilo",
    sets: [
      { word: "VESTIDO", category: "Moda", clue: "Una sola prenda puede armar el outfit" },
      { word: "TACONES", category: "Moda", clue: "Aumentan altura, no siempre comodidad" },
      { word: "BLAZER", category: "Moda", clue: "Eleva un look básico" },
      { word: "BOLSO", category: "Moda", clue: "Combina función y estilo" },
      { word: "ACCESORIOS", category: "Moda", clue: "Pequeños, pero hacen diferencia" },
      { word: "ZAPATILLAS", category: "Moda", clue: "Comodidad en clave urbana" },
      { word: "JEANS", category: "Moda", clue: "Un clásico de todos los días" },
      { word: "JOYERÍA", category: "Moda", clue: "Brilla y se hereda" }
    ]
  },
  {
    id: "amistad",
    label: "Amistad y planes",
    sets: [
      { word: "BRUNCH", category: "Planes", clue: "Entre desayuno y almuerzo" },
      { word: "CAFÉ", category: "Planes", clue: "Acompaña conversaciones largas" },
      { word: "CHISME", category: "Planes", clue: "Se comparte con confianza" },
      { word: "FOTOS", category: "Planes", clue: "Se guardan recuerdos en el celular" },
      { word: "SPOT INSTAGRAMABLE", category: "Planes", clue: "Bonito para una foto" },
      { word: "PICNIC", category: "Planes", clue: "Se hace al aire libre" },
      { word: "KARAOKE", category: "Planes", clue: "Se canta aunque no se cante" },
      { word: "NOCHE DE CHICAS", category: "Planes", clue: "Plan típico de grupo" }
    ]
  },
  {
    id: "series",
    label: "Series, pelis y cultura pop",
    sets: [
      { word: "MARATÓN", category: "Series", clue: "No se detiene hasta terminar" },
      { word: "SPOILER", category: "Series", clue: "Arruina la sorpresa" },
      { word: "TEMPORADA", category: "Series", clue: "Viene por partes" },
      { word: "EPISODIO FINAL", category: "Series", clue: "Divide opiniones" },
      { word: "NETFLIX", category: "Pelis", clue: "Logo rojo" },
      { word: "MICKEY MOUSE", category: "Series", clue: "Dibujos Animados" },
      { word: "PROTAGONISTA", category: "Pelis", clue: "Lleva el peso de la historia" },
      { word: "BANDA SONORA", category: "Pelis", clue: "Música" }
    ]
  },
  {
    id: "bienestar",
    label: "Bienestar y autocuidado",
    sets: [
      { word: "YOGA", category: "Bienestar", clue: "Se asocia con respiración y estiramiento" },
      { word: "MEDITACIÓN", category: "Bienestar", clue: "Silencio y enfoque" },
      { word: "DINERO", category: "Bienestar", clue: "Riqueza" },
      { word: "SPA", category: "Bienestar", clue: "Relajación en versión premium" },
      { word: "DESCANSO", category: "Bienestar", clue: "No siempre se prioriza" },
      { word: "HIDRATACIÓN", category: "Bienestar", clue: "Importa más de lo que parece" },
      { word: "CAMINATA", category: "Bienestar", clue: "Simple y efectiva" },
      { word: "SIESTA", category: "Bienestar", clue: "Recarga rápida" }
    ]
  }
];

// Pool global (modo mezclado)
const MIXED_POOL = TOPICS.flatMap(t => t.sets.map(s => ({...s})));