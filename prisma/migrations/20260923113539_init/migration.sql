-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('applied', 'interview', 'technical_task', 'offer', 'no_answer', 'rejected');

-- CreateEnum
CREATE TYPE "ApplicationSource" AS ENUM ('linkedin', 'justjoinit', 'nofluffjobs', 'pracuj', 'company_website', 'other');

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "jobUrl" TEXT,
    "status" "ApplicationStatus" NOT NULL,
    "source" "ApplicationSource" NOT NULL,
    "appliedDate" TIMESTAMP(3) NOT NULL,
    "followUpDate" TIMESTAMP(3),
    "contactPerson" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("id")
);
