const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Password hashes
  const superAdminHash = await bcrypt.hash("superadmin123", 10);
  const adminHash = await bcrypt.hash("password", 10);
  const clientHash = await bcrypt.hash("password", 10);

  // USERS
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@reviewdeask.local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "superadmin@reviewdeask.local",
      password: superAdminHash,
      role: "super_admin",
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@review.local" },
    update: {},
    create: {
      name: "Admin Team",
      email: "admin@review.local",
      password: adminHash,
      role: "admin",
    },
  });

  const clientUser1 = await prisma.user.upsert({
    where: { email: "client@cognesense.com" },
    update: {},
    create: {
      name: "Cognesense Client",
      email: "client@cognesense.com",
      password: clientHash,
      role: "client",
      company: "Cognesense",
    },
  });

  const clientUser2 = await prisma.user.upsert({
    where: { email: "marketing@northstar.example" },
    update: {},
    create: {
      name: "Northstar Marketing",
      email: "marketing@northstar.example",
      password: clientHash,
      role: "client",
      company: "Northstar Labs",
    },
  });

  // PROMOTION TYPES
  const socialType = await prisma.promotionType.create({
    data: {
      name: "Social Media Campaign",
      description: "Banners, captions",
    },
  });

  const emailType = await prisma.promotionType.create({
    data: {
      name: "Email Campaign",
      description: "Email previews",
    },
  });

  // CLIENT TABLE
  await prisma.client.createMany({
    data: [
      {
        name: "Cognesense Client",
        email: "client@cognesense.com",
        company: "Cognesense",
        password: clientHash,
      },
      {
        name: "Northstar Marketing",
        email: "marketing@northstar.example",
        company: "Northstar Labs",
        password: clientHash,
      },
    ],
    skipDuplicates: true,
  });

  // PROJECTS
  const project1 = await prisma.project.create({
    data: {
      name: "Cognesense Projects",
      client: "Cognesense",
      owner: "Growth Team",
      description: "Marketing approvals",
      clientUsers: ["client@cognesense.com"],
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: "Northstar Product Rollout",
      client: "Northstar Labs",
      owner: "Growth Team",
      description: "Launch promotions",
      clientUsers: ["marketing@northstar.example"],
    },
  });

  // PROMOTIONS
  const promo1 = await prisma.promotion.create({
    data: {
      projectId: project1.id,
      typeId: socialType.id,
      title: "AI Workflow Launch",
      scheduledDate: new Date("2026-04-25"),
      status: "Pending_Approval",
    },
  });

  const promo2 = await prisma.promotion.create({
    data: {
      projectId: project1.id,
      typeId: emailType.id,
      title: "April Newsletter",
      scheduledDate: new Date("2026-04-28"),
      status: "Revision_Required",
    },
  });

  // VERSIONS
  const ver1 = await prisma.version.create({
    data: {
      promotionId: promo1.id,
      version: 1,
      label: "Initial banner",
      fileName: "file.png",
      fileType: "image",
      uploadedBy: "Admin",
    },
  });

  const ver2 = await prisma.version.create({
    data: {
      promotionId: promo1.id,
      version: 2,
      label: "Updated CTA",
      fileName: "file2.png",
      fileType: "image",
      uploadedBy: "Admin",
    },
  });

  // LINK CURRENT VERSION
  await prisma.promotion.update({
    where: { id: promo1.id },
    data: { currentVersionId: ver2.id },
  });

  // COMMENTS
  await prisma.comment.createMany({
    data: [
      {
        promotionId: promo1.id,
        authorId: clientUser1.id,
        author: "Client",
        role: "client",
        body: "Looks good",
      },
      {
        promotionId: promo1.id,
        authorId: adminUser.id,
        author: "Admin",
        role: "admin",
        body: "Updated CTA",
      },
    ],
  });

  console.log("Seed completed successfully");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
