export function getRealLifeTip() {
  const tips = [
    "Mantén una buena hidratación durante todo el día",
    "Duerme 7-9 horas para una mejor recuperación",
    "Come proteína después de entrenamientos de fuerza",
    "Estira 5-10 minutos después de cada sesión",
    "Escucha a tu cuerpo y respeta los días de descanso",
    "Calienta 5-7 minutos antes de cada entrenamiento",
    "Mantén un ritmo sostenible en entrenamientos Z2",
    "Anota tus sensaciones para mejorar el plan"
  ];
  
  return tips[Math.floor(Math.random() * tips.length)];
}
