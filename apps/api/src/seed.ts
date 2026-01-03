import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const alice = await prisma.user.upsert({
    where: { username: 'alice' },
    update: {},
    create: {
      username: 'alice',
      name: 'Alice',
    },
  })
  
  const bob = await prisma.user.upsert({
    where: { username: 'bob' },
    update: {},
    create: {
      username: 'bob',
      name: 'Bob',
    },
  })

  // Create Default Document
  const doc = await prisma.document.upsert({
    where: { id: 'doc-1' },
    update: {},
    create: {
      id: 'doc-1',
      title: 'Project Proposal',
      content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.\nSed do eiusmod tempor incididunt ut labore et dolore magna aliqua.\nUt enim ad minim veniam, quis nostrud exercitation ullamco.'
    }
  })

  console.log({ alice, bob, doc })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
