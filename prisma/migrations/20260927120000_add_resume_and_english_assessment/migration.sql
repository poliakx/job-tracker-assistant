-- CreateTable
CREATE TABLE "Resume" (
    "id" TEXT NOT NULL,
    "vacancyId" TEXT,
    "content" JSONB NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Resume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnglishAssessment" (
    "id" TEXT NOT NULL,
    "overallLevel" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "quizScore" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnglishAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Resume_vacancyId_key" ON "Resume"("vacancyId");

-- AddForeignKey
ALTER TABLE "Resume" ADD CONSTRAINT "Resume_vacancyId_fkey" FOREIGN KEY ("vacancyId") REFERENCES "Vacancy"("id") ON DELETE CASCADE ON UPDATE CASCADE;

