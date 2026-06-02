const { Client } = require('pg');

async function fixStores() {
  const connectionString = "postgresql://postgres.uwovtvdaikzblybuzmmo:harugkfn13gkfn@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  try {
    // Get all approved applications
    const appsRes = await client.query(`SELECT * FROM "BusinessApplication" WHERE status = 'APPROVED'`);
    const apps = appsRes.rows;

    console.log(`Found ${apps.length} approved applications.`);

    for (const app of apps) {
      // Check if store exists
      const storesRes = await client.query(`SELECT * FROM "Store" WHERE "ownerId" = $1`, [app.userId]);
      
      if (storesRes.rows.length === 0) {
        console.log(`Creating store for user ${app.userId}...`);
        
        // Generate CUID (or just a random string for ID since it's a test)
        const id = 'store_' + Math.random().toString(36).substr(2, 9);
        const now = new Date();

        await client.query(`
          INSERT INTO "Store" (id, "ownerId", name, address, contact, "representativeName", "businessRegNo", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [id, app.userId, app.businessName, app.address, app.contact, app.representativeName, app.businessRegNo, now, now]);

        console.log(`Successfully created store: ${app.businessName}`);
      } else {
        console.log(`User ${app.userId} already has ${storesRes.rows.length} store(s). Updating...`);
        for (const store of storesRes.rows) {
          if (!store.address && app.address) {
            await client.query(`
              UPDATE "Store" SET address = $1, contact = $2, "representativeName" = $3, "businessRegNo" = $4
              WHERE id = $5
            `, [app.address, app.contact, app.representativeName, app.businessRegNo, store.id]);
            console.log(`Updated store: ${store.name}`);
          }
        }
      }
    }
  } finally {
    await client.end();
  }
}

fixStores().catch(console.error);
