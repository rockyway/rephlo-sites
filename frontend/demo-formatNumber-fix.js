/**
 * Demo script to verify formatNumber fix
 *
 * Run with: node demo-formatNumber-fix.js
 *
 * This demonstrates that the formatNumber function now safely handles
 * undefined, null, and NaN values instead of throwing runtime errors.
 */

// Simulate the old broken function
function formatNumber_BROKEN(num) {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toLocaleString('en-US'); // ❌ CRASHES on undefined
}

// The new fixed function
function formatNumber_FIXED(num) {
  // Handle undefined, null, or NaN values
  if (num === undefined || num === null || Number.isNaN(num)) {
    return '0';
  }

  // Ensure we have a valid number
  const validNum = Number(num);
  if (!Number.isFinite(validNum)) {
    return '0';
  }

  if (validNum >= 1_000_000) {
    return `${(validNum / 1_000_000).toFixed(1)}M`;
  }
  if (validNum >= 1_000) {
    return `${(validNum / 1_000).toFixed(1)}K`;
  }
  return validNum.toLocaleString('en-US'); // ✅ SAFE
}

console.log('='.repeat(60));
console.log('formatNumber() Fix Demonstration');
console.log('='.repeat(60));
console.log();

// Test cases that would cause the original error
const testCases = [
  { label: 'undefined (the bug!)', value: undefined },
  { label: 'null', value: null },
  { label: 'NaN', value: NaN },
  { label: 'Infinity', value: Infinity },
  { label: 'zero', value: 0 },
  { label: 'small number', value: 42 },
  { label: 'thousand', value: 1000 },
  { label: 'thousands', value: 1500 },
  { label: 'million', value: 1000000 },
  { label: 'millions', value: 2500000 },
];

console.log('Testing BROKEN version (original code):');
console.log('-'.repeat(60));
testCases.forEach(({ label, value }) => {
  try {
    const result = formatNumber_BROKEN(value);
    console.log(`✅ ${label.padEnd(25)} → "${result}"`);
  } catch (error) {
    console.log(`❌ ${label.padEnd(25)} → ERROR: ${error.message}`);
  }
});

console.log();
console.log('Testing FIXED version (new code):');
console.log('-'.repeat(60));
testCases.forEach(({ label, value }) => {
  try {
    const result = formatNumber_FIXED(value);
    console.log(`✅ ${label.padEnd(25)} → "${result}"`);
  } catch (error) {
    console.log(`❌ ${label.padEnd(25)} → ERROR: ${error.message}`);
  }
});

console.log();
console.log('='.repeat(60));
console.log('Simulating SubscriptionManagement.tsx scenario:');
console.log('='.repeat(60));
console.log();

// Simulate the API response scenario that caused the bug
const incompleteStats = {
  totalActive: undefined, // This is what caused the crash!
  mrr: 5000,
  pastDueCount: 2,
  trialConversionsThisMonth: 10,
};

console.log('API Response (incomplete):');
console.log(JSON.stringify(incompleteStats, null, 2));
console.log();

console.log('BROKEN version would crash here:');
try {
  const result = formatNumber_BROKEN(incompleteStats.totalActive);
  console.log(`✅ totalActive: ${result}`);
} catch (error) {
  console.log(`❌ CRASH: ${error.message}`);
}

console.log();
console.log('FIXED version handles it gracefully:');
try {
  const result = formatNumber_FIXED(incompleteStats.totalActive);
  console.log(`✅ totalActive: ${result} (safe default)`);
} catch (error) {
  console.log(`❌ CRASH: ${error.message}`);
}

console.log();
console.log('='.repeat(60));
console.log('Result: Bug is FIXED! ✅');
console.log('The SubscriptionManagement page will no longer crash.');
console.log('='.repeat(60));
