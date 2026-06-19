/**
 * Map UnbelievaBoat shop item names to Discord role IDs.
 *
 * Key:   The exact item name as it appears in the UnbelievaBoat shop log embed.
 *        Matching is case-insensitive.
 *
 * Value: The Discord role ID to assign when that item is purchased.
 *        To map one item to multiple roles use an array:
 *        "Bundle Deal": ["111111111111111111", "222222222222222222"]
 */
export const SHOP_ROLE_MAP: Record<string, string | string[]> = {
  "XP Boost":       "1517343488549716070",
  "Inversionista":  "1517344933562810368",
  "Destacado":      "1517343616559747235",
  "Ticket Premium": "1517343390100881458",
  "Ticket Plus":    "1517343312816640070",
  "Anti-Robo":      "1517343204377366609",
  "Ejecutivo":      "1517344887614210203",
  "Trabajador":     "1517344835114237972",
};
