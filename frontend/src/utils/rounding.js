/**
 * Custom rounding logic for LP Mueblería
 * - If remainder < 1.0 (cents/pesos): Round DOWN to nearest 10.
 * - If remainder >= 1.0 (cents/pesos): Round UP to next 10.
 * 
 * Example:
 * 10,000.68 -> 10,000.00
 * 10,001.02 -> 10,010.00
 */
export const calculateRounding = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    
    const remainder = amount % 10;
    
    if (remainder < 1.0) {
        // Round down to the multiple of 10
        return Math.floor(amount / 10) * 10;
    } else {
        // Round up to the multiple of 10
        return Math.ceil(amount / 10) * 10;
    }
};

export const getRoundingAdjustment = (originalAmount) => {
    const rounded = calculateRounding(originalAmount);
    return rounded - originalAmount;
};
