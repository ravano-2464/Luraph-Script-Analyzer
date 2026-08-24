import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      passwordHash,
      role: 'ADMIN',
    },
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Default admin user upserted:', admin.username);
  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  });
