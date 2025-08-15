const { db } = require('./index.ts');
const { users } = require('./schema-postgres.ts');

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test a simple query
    const result = await db().select().from(users).limit(1);
    console.log('✅ Database connection successful!');
    console.log('Query result:', result);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
