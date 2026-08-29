/**
 * Mapping an unlock percentage onto a rarity tier.
 */

// =========================================
//      Cleanup previous injections
// =========================================
// =========================================
//     Rarity Tier Helper
// =========================================
export function getRarityTier(percentage) {
  if (percentage >= 50) return { label: 'Common', color: '#a3a3a3', bg: 'rgba(163,163,163,0.12)' };
  if (percentage >= 25) return { label: 'Uncommon', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
  if (percentage >= 10) return { label: 'Rare', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
  if (percentage >= 5)  return { label: 'Very Rare', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' };
  if (percentage >= 2)  return { label: 'Ultra Rare', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  return { label: 'Legendary', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' };
}
