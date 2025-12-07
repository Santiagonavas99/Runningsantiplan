export function calculateRewards(progress) {
  const rewards = [];

  if (progress.daysCompleted >= 3)
    rewards.push("🏅 3 días completados");

  if (progress.daysCompleted === 7)
    rewards.push("🥇 Semana perfecta");

  if (progress.longRunDone)
    rewards.push("🏆 Rodaje largo completado");

  if (progress.strengthDays >= 2 && progress.runDays >= 2)
    rewards.push("🔥 Semana balanceada");

  return rewards;
}