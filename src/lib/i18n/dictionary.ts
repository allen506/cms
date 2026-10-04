export type Locale = "en" | "es";
export type Currency = "USD" | "CRC";

export const LOCALES: Locale[] = ["en", "es"];
export const CURRENCIES: Currency[] = ["USD", "CRC"];

type Dict = Record<string, string>;

export const messages: Record<Locale, Dict> = {
  en: {
    // Nav
    "nav.products": "Products",
    "nav.signOut": "Sign out",
    "nav.signingOut": "Signing out...",
    "nav.language": "Language",
    "nav.currency": "Currency",

    // Design request form
    "design.requestTitle": "Request Custom Design",
    "design.requestSubtitle":
      "Submit your design requirements and our designers will create custom designs for your team.",
    "design.titleLabel": "Design Title",
    "design.titleHint": "Give your design a descriptive name",
    "design.titlePlaceholder": "e.g., Team Jersey 2026 - Black & Red",
    "design.categoryLabel": "Product Category",
    "design.categoryHint":
      "Selecting a category unlocks the matching products once this design is approved.",
    "design.categoryAll": "All / Not sure yet",
    "design.catEnduro": "Enduro Jerseys (BMX / Enduro / DH)",
    "design.catCycling": "Cycling Jerseys",
    "design.catBib": "Bibs / Licras",
    "design.descLabel": "Design Requirements",
    "design.descHint":
      "Be as detailed as possible to help designers understand your vision",
    "design.descPlaceholder":
      "Describe what you want in your design. Include style preferences, colors, team name, logos, etc.",
    "design.filesLabel": "Upload Reference Files (Optional)",
    "design.filesHint":
      "Upload logos, inspiration images, or any reference files (PNG, JPG, PDF)",
    "design.uploadedFiles": "Uploaded Files:",
    "design.remove": "Remove",
    "design.submit": "Submit Design Request",
    "design.submitting": "Submitting...",
    "design.success":
      "Design request submitted successfully! Designers will review and submit their proposals.",
    "design.whatsNext": "What happens next?",
    "design.next1": "Our design team reviews your request",
    "design.next2": "Designers submit their design proposals",
    "design.next3": "You review and provide feedback",
    "design.next4": "Once approved, you can select products and place your order",
    "design.errTitle": "Please enter a title for your design request",
    "design.errDesc": "Please enter a description",

    // Products / order
    "products.selectProducts": "Select Products",
    "products.loading": "Loading products...",
    "products.none":
      "No products available for your team yet. Please contact your administrator.",
    "products.locked": "Locked",
    "products.lockedHint":
      "Available once a design for this product category has been approved for your team.",
    "products.pricingTiers": "Pricing Tiers:",
    "products.noPricing": "No pricing available",
    "products.addons": "Add-ons:",
    "products.quantity": "Quantity:",
    "products.unitPrice": "Unit Price:",
    "products.subtotal": "Subtotal:",
    "products.discountApplied": "discount applied",
    "products.specialPricing": "Special pricing applied",
    "products.notesLabel": "Additional Notes (Optional)",
    "products.notesPlaceholder":
      "Any special requests or notes for this order...",
    "products.orderSummary": "Order Summary",
    "products.itemsSelected": "Items Selected:",
    "products.totalQuantity": "Total Quantity:",
    "products.total": "Total:",
    "products.continuePayment": "Continue to Payment",
    "products.selectItems": "Select items",
    "products.creatingOrder": "Creating Order...",
    "products.orderSuccess":
      "Order created successfully! Proceed to payment to complete your order.",
    "products.selectAtLeastOne": "Please select at least one product",

    // Exchange rate reference
    "fx.reference": "Reference: BCCR sell rate",
    "fx.asOf": "as of",
    "fx.estimated": "estimated rate",
  },
  es: {
    // Nav
    "nav.products": "Productos",
    "nav.signOut": "Cerrar sesión",
    "nav.signingOut": "Cerrando sesión...",
    "nav.language": "Idioma",
    "nav.currency": "Moneda",

    // Design request form
    "design.requestTitle": "Solicitar Diseño Personalizado",
    "design.requestSubtitle":
      "Envíe los requisitos de su diseño y nuestros diseñadores crearán diseños personalizados para su equipo.",
    "design.titleLabel": "Título del Diseño",
    "design.titleHint": "Dele un nombre descriptivo a su diseño",
    "design.titlePlaceholder": "ej., Jersey del Equipo 2026 - Negro y Rojo",
    "design.categoryLabel": "Categoría de Producto",
    "design.categoryHint":
      "Seleccionar una categoría desbloquea los productos correspondientes una vez aprobado este diseño.",
    "design.categoryAll": "Todos / Aún no estoy seguro",
    "design.catEnduro": "Jerseys Enduro (BMX / Enduro / DH)",
    "design.catCycling": "Jerseys de Ciclismo",
    "design.catBib": "Licras / Bibs",
    "design.descLabel": "Requisitos del Diseño",
    "design.descHint":
      "Sea lo más detallado posible para ayudar a los diseñadores a entender su visión",
    "design.descPlaceholder":
      "Describa lo que desea en su diseño. Incluya preferencias de estilo, colores, nombre del equipo, logos, etc.",
    "design.filesLabel": "Subir Archivos de Referencia (Opcional)",
    "design.filesHint":
      "Suba logos, imágenes de inspiración o cualquier archivo de referencia (PNG, JPG, PDF)",
    "design.uploadedFiles": "Archivos Subidos:",
    "design.remove": "Eliminar",
    "design.submit": "Enviar Solicitud de Diseño",
    "design.submitting": "Enviando...",
    "design.success":
      "¡Solicitud de diseño enviada con éxito! Los diseñadores la revisarán y enviarán sus propuestas.",
    "design.whatsNext": "¿Qué sigue?",
    "design.next1": "Nuestro equipo de diseño revisa su solicitud",
    "design.next2": "Los diseñadores envían sus propuestas de diseño",
    "design.next3": "Usted revisa y da su opinión",
    "design.next4":
      "Una vez aprobado, puede seleccionar productos y realizar su pedido",
    "design.errTitle": "Por favor ingrese un título para su solicitud de diseño",
    "design.errDesc": "Por favor ingrese una descripción",

    // Products / order
    "products.selectProducts": "Seleccionar Productos",
    "products.loading": "Cargando productos...",
    "products.none":
      "Aún no hay productos disponibles para su equipo. Por favor contacte a su administrador.",
    "products.locked": "Bloqueado",
    "products.lockedHint":
      "Disponible una vez que se apruebe un diseño para esta categoría de producto para su equipo.",
    "products.pricingTiers": "Niveles de Precio:",
    "products.noPricing": "Precio no disponible",
    "products.addons": "Complementos:",
    "products.quantity": "Cantidad:",
    "products.unitPrice": "Precio Unitario:",
    "products.subtotal": "Subtotal:",
    "products.discountApplied": "de descuento aplicado",
    "products.specialPricing": "Precio especial aplicado",
    "products.notesLabel": "Notas Adicionales (Opcional)",
    "products.notesPlaceholder":
      "Cualquier solicitud especial o nota para este pedido...",
    "products.orderSummary": "Resumen del Pedido",
    "products.itemsSelected": "Artículos Seleccionados:",
    "products.totalQuantity": "Cantidad Total:",
    "products.total": "Total:",
    "products.continuePayment": "Continuar al Pago",
    "products.selectItems": "Seleccione artículos",
    "products.creatingOrder": "Creando Pedido...",
    "products.orderSuccess":
      "¡Pedido creado con éxito! Proceda al pago para completar su pedido.",
    "products.selectAtLeastOne": "Por favor seleccione al menos un producto",

    // Exchange rate reference
    "fx.reference": "Referencia: tipo de cambio de venta BCCR",
    "fx.asOf": "al",
    "fx.estimated": "tipo estimado",
  },
};

export function translate(locale: Locale, key: string): string {
  return messages[locale]?.[key] ?? messages.en[key] ?? key;
}
