import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { prisma } from './src/lib/prisma';

async function main() {
  // Find all approved applications
  const apps = await prisma.businessApplication.findMany({
    where: { status: 'APPROVED' }
  });

  console.log(`Found ${apps.length} approved applications.`);

  for (const app of apps) {
    // Check if the user already has a store
    const existingStores = await prisma.store.findMany({
      where: { ownerId: app.userId }
    });

    if (existingStores.length === 0) {
      console.log(`Creating store for user ${app.userId}...`);
      await prisma.store.create({
        data: {
          ownerId: app.userId,
          name: app.businessName,
          address: app.address,
          contact: app.contact,
          representativeName: app.representativeName,
          businessRegNo: app.businessRegNo
        }
      });
      console.log(`Successfully created store: ${app.businessName}`);
    } else {
      console.log(`User ${app.userId} already has ${existingStores.length} store(s). Updating...`);
      for (const store of existingStores) {
        if (!store.address && app.address) {
          await prisma.store.update({
            where: { id: store.id },
            data: {
              address: app.address,
              contact: app.contact,
              representativeName: app.representativeName,
              businessRegNo: app.businessRegNo
            }
          });
          console.log(`Updated store: ${app.businessName} with application details`);
        }
      }
    }
  }

  console.log('Done fixing stores.');
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
