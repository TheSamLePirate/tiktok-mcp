/**
 * Test file for error tracking system
 * 
 * This file demonstrates how the error tracking system works
 * Run this with: node test-errors.js
 */

import { errorLogs } from './app.js';

// Note: In production, you would use the MCP tools instead
// This is just for demonstration purposes

console.log('Testing Error Tracking System\n');
console.log('=' .repeat(50));

// Simulate some test scenarios
async function testErrorTracking() {
  console.log('\n📊 Initial state:');
  console.log(`Total errors logged: ${errorLogs.length}`);
  
  if (errorLogs.length > 0) {
    console.log('\n🔍 Sample errors:');
    errorLogs.slice(-5).forEach((err, index) => {
      console.log(`\n[${index + 1}]`);
      console.log(`  Timestamp: ${err.timestamp}`);
      console.log(`  Type: ${err.type}`);
      console.log(`  Source: ${err.source}`);
      console.log(`  Message: ${err.message}`);
    });
    
    // Statistics
    console.log('\n📈 Statistics by type:');
    const stats = errorLogs.reduce((acc, err) => {
      acc[err.type] = (acc[err.type] || 0) + 1;
      return acc;
    }, {});
    
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
  } else {
    console.log('\n✅ No errors logged - system is running smoothly!');
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('\n💡 Tips:');
  console.log('  - Use "show-errors" MCP tool to view errors from your chat client');
  console.log('  - Use "clear-errors" MCP tool to reset the error log');
  console.log('  - Errors are automatically captured from all tools and connections');
}

// Run the test
testErrorTracking().catch(console.error);
