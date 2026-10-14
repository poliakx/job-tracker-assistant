import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` to avoid TS complaints in development with HMR
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma

export default prisma
