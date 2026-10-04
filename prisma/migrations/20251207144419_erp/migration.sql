-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('CHAT_ASSISTANT', 'SALES', 'INVENTORY', 'FINANCIAL', 'HR', 'CUSTOMER_SERVICE', 'MARKETING', 'QUALITY', 'PROJECT', 'WORKFLOW');

-- CreateEnum
CREATE TYPE "AgentExecutionStatus" AS ENUM ('SUCCESS', 'FAILED', 'RUNNING', 'CANCELLED');

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Conversation" DROP CONSTRAINT "Conversation_userId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMessage" DROP CONSTRAINT "ConversationMessage_conversationId_fkey";

-- DropForeignKey
ALTER TABLE "ConversationMessage" DROP CONSTRAINT "ConversationMessage_tenantId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ALTER COLUMN "title" DROP NOT NULL;

-- CreateTable
CREATE TABLE "AIAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AgentType" NOT NULL,
    "description" TEXT,
    "config" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentExecution" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "status" "AgentExecutionStatus" NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "duration" INTEGER,
    "tenantId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isActioned" BOOLEAN NOT NULL DEFAULT false,
    "actionedBy" TEXT,
    "actionedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLModel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "modelPath" TEXT,
    "metrics" JSONB,
    "trainedOn" TIMESTAMP(3),
    "trainingData" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MLModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prediction" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "prediction" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION,
    "actualValue" JSONB,
    "isCorrect" BOOLEAN,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Prediction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AIAgent_tenantId_idx" ON "AIAgent"("tenantId");

-- CreateIndex
CREATE INDEX "AIAgent_type_idx" ON "AIAgent"("type");

-- CreateIndex
CREATE INDEX "AIAgent_isActive_idx" ON "AIAgent"("isActive");

-- CreateIndex
CREATE INDEX "AgentExecution_agentId_idx" ON "AgentExecution"("agentId");

-- CreateIndex
CREATE INDEX "AgentExecution_status_idx" ON "AgentExecution"("status");

-- CreateIndex
CREATE INDEX "AgentExecution_tenantId_idx" ON "AgentExecution"("tenantId");

-- CreateIndex
CREATE INDEX "AIInsight_tenantId_idx" ON "AIInsight"("tenantId");

-- CreateIndex
CREATE INDEX "AIInsight_type_idx" ON "AIInsight"("type");

-- CreateIndex
CREATE INDEX "AIInsight_severity_idx" ON "AIInsight"("severity");

-- CreateIndex
CREATE INDEX "AIInsight_isRead_idx" ON "AIInsight"("isRead");

-- CreateIndex
CREATE INDEX "MLModel_tenantId_idx" ON "MLModel"("tenantId");

-- CreateIndex
CREATE INDEX "MLModel_type_idx" ON "MLModel"("type");

-- CreateIndex
CREATE INDEX "MLModel_isActive_idx" ON "MLModel"("isActive");

-- CreateIndex
CREATE INDEX "Prediction_modelId_idx" ON "Prediction"("modelId");

-- CreateIndex
CREATE INDEX "Prediction_entityType_idx" ON "Prediction"("entityType");

-- CreateIndex
CREATE INDEX "Prediction_tenantId_idx" ON "Prediction"("tenantId");

-- CreateIndex
CREATE INDEX "ConversationMessage_tenantId_idx" ON "ConversationMessage"("tenantId");

-- AddForeignKey
ALTER TABLE "AgentExecution" ADD CONSTRAINT "AgentExecution_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AIAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MLModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
