const calculateRounding = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    const remainder = amount % 10;
    if (remainder < 1.0) {
        return Math.floor(amount / 10) * 10;
    } else {
        return Math.ceil(amount / 10) * 10;
    }
};

const testCases = [
    { input: 10000.68, expected: 10000.00 },
    { input: 10001.02, expected: 10010.00 },
    { input: 10000.00, expected: 10000.00 },
    { input: 10000.99, expected: 10000.00 },
    { input: 10001.00, expected: 10010.00 },
    { input: 10005.50, expected: 10010.00 },
    { input: 10000.01, expected: 10000.00 },
];

console.log("--- Testing Rounding Logic ---");
testCases.forEach(({input, expected}) => {
    const result = calculateRounding(input);
    const pass = result === expected;
    console.log(`Input: ${input.toFixed(2)} | Expected: ${expected.toFixed(2)} | Result: ${result.toFixed(2)} | ${pass ? '✅ PASS' : '❌ FAIL'}`);
});
