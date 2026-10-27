// ANA LAB · Catálogo de módulos y temas.
// Añadir un módulo o publicar un material = editar estos datos, no el HTML.
// estado: "pendiente" | "preparacion" | "listo"
// Cada material: { tipo, titulo, url } — sin url aparece como «próximamente».

window.CATALOGO = {
  modulos: [
    {
      codigo: "3038",
      titulo: "Procesos básicos de preparación de alimentos y bebidas",
      ambito: "Bar y cafetería",
      curso: "1.º CFGB Cocina y Restauración · 2026-2027",
      color: "var(--m3038)",
      url: "modulos/3038/",
      temas: [
        { n: 1, titulo: "Acopio y distribución de géneros en el área de bar", ra: ["RA1"], estado: "listo",
          resumen: "El viaje del género: del pedido a su sitio en la barra, en buen estado y listo para el servicio.",
          materiales: { clase: "t1/clase/", juegos: "t1/juegos/", ficha: "t1/ficha/" } },
        { n: 2, titulo: "Equipos, útiles y menaje", ra: [], estado: "pendiente" },
        { n: 3, titulo: "Bebidas", ra: [], estado: "pendiente" },
        { n: 4, titulo: "Comidas rápidas", ra: [], estado: "pendiente" },
        { n: 5, titulo: "Servicio en barra", ra: [], estado: "pendiente" }
      ]
    }
  ]
};
