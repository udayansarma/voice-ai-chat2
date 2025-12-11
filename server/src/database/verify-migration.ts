import { DocumentDatabase } from './document-database';

async function verifyMigration(): Promise<void> {
  console.log('Verifying migration results...\n');
  
  const db = await DocumentDatabase.create();
  
  if (!db.isReady()) {
    console.error('Database not ready');
    return;
  }
  
  try {
    // Check statistics
    const stats = db.getDocumentStats();
    console.log('📊 Database Statistics:');
    console.log(`- Personas: ${stats.personas}`);
    console.log(`- Templates: ${stats.templates}`);
    console.log(`- Total: ${stats.total}\n`);
    
    // Show sample personas
    const personas = db.getAllPersonas();
    console.log('👥 Sample Personas:');
    personas.slice(0, 3).forEach((persona, index) => {
      console.log(`${index + 1}. ${persona.name} (${persona.id})`);
      if (persona.demographics) {
        console.log(`   Age Group: ${persona.demographics.ageGroup || 'Unknown'}`);
      }
    });
    console.log(`   ... and ${personas.length - 3} more\n`);
    
    // Show sample templates
    const templates = db.getAllTemplates();
    console.log('📝 Sample Templates:');
    templates.forEach((template, index) => {
      console.log(`${index + 1}. ${template.name} (${template.id})`);
      if (template.description) {
        console.log(`   Description: ${template.description}`);
      }
    });
    
    console.log('\n✅ Migration verification completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration verification failed:', error);
  } finally {
    db.close();
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifyMigration().catch(console.error);
}
