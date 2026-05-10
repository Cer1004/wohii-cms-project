/*
  Warnings:

  - A unique constraint covering the columns `[userId,questionId]` on the table `play` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX `play_userId_questionId_key` ON `play`(`userId`, `questionId`);
