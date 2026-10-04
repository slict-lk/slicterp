/*
  Warnings:

  - You are about to drop the column `authorId` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `categories` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `metaDescription` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `metaTitle` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `viewCount` on the `BlogPost` table. All the data in the column will be lost.
  - You are about to drop the column `latitude` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `longitude` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Property` table. All the data in the column will be lost.
  - You are about to drop the column `yearBuilt` on the `Property` table. All the data in the column will be lost.
  - The `status` column on the `Property` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `PropertyViewing` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `isSystem` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `permissions` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `ApiUsage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AuditLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AutomationExecution` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AutomationRule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CalendarEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Cart` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CartItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Company` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ConstructionJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Contact` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Course` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CourseEnrollment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CourseLesson` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EmailCampaign` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `EventRegistration` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ForumPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ForumTopic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `HotelRoom` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntegrationAccount` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `IntegrationLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `JobMaterial` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `KnowledgeArticle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LessonCompletion` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LiveChat` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyMember` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyProgram` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyTier` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoyaltyTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MarketingEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Message` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `OAuthToken` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentGateway` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PaymentTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Presentation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QualityCheck` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestaurantOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RestaurantTable` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RoomBooking` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SMSCampaign` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ScheduledAction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Shipment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subcontract` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Survey` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SurveyResponse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SyncJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TableReservation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketAttachment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TicketComment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebPage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Webhook` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WebhookDelivery` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_EventAttendees` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[tenantId,slug]` on the table `BlogPost` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `propertyType` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `listingType` on the `Property` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ApiUsage" DROP CONSTRAINT "ApiUsage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationExecution" DROP CONSTRAINT "AutomationExecution_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "AutomationRule" DROP CONSTRAINT "AutomationRule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_customerId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_organizerId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_projectId_fkey";

-- DropForeignKey
ALTER TABLE "CalendarEvent" DROP CONSTRAINT "CalendarEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_productId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_chatId_fkey";

-- DropForeignKey
ALTER TABLE "Company" DROP CONSTRAINT "Company_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ConstructionJob" DROP CONSTRAINT "ConstructionJob_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_companyId_fkey";

-- DropForeignKey
ALTER TABLE "Contact" DROP CONSTRAINT "Contact_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Course" DROP CONSTRAINT "Course_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CourseEnrollment" DROP CONSTRAINT "CourseEnrollment_courseId_fkey";

-- DropForeignKey
ALTER TABLE "CourseLesson" DROP CONSTRAINT "CourseLesson_courseId_fkey";

-- DropForeignKey
ALTER TABLE "EmailCampaign" DROP CONSTRAINT "EmailCampaign_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "EventRegistration" DROP CONSTRAINT "EventRegistration_eventId_fkey";

-- DropForeignKey
ALTER TABLE "ForumPost" DROP CONSTRAINT "ForumPost_topicId_fkey";

-- DropForeignKey
ALTER TABLE "ForumTopic" DROP CONSTRAINT "ForumTopic_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "HotelRoom" DROP CONSTRAINT "HotelRoom_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationAccount" DROP CONSTRAINT "IntegrationAccount_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationLog" DROP CONSTRAINT "IntegrationLog_integrationAccountId_fkey";

-- DropForeignKey
ALTER TABLE "IntegrationLog" DROP CONSTRAINT "IntegrationLog_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "JobMaterial" DROP CONSTRAINT "JobMaterial_jobId_fkey";

-- DropForeignKey
ALTER TABLE "KnowledgeArticle" DROP CONSTRAINT "KnowledgeArticle_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LessonCompletion" DROP CONSTRAINT "LessonCompletion_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "LiveChat" DROP CONSTRAINT "LiveChat_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "LiveChat" DROP CONSTRAINT "LiveChat_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyMember" DROP CONSTRAINT "LoyaltyMember_programId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyProgram" DROP CONSTRAINT "LoyaltyProgram_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTier" DROP CONSTRAINT "LoyaltyTier_programId_fkey";

-- DropForeignKey
ALTER TABLE "LoyaltyTransaction" DROP CONSTRAINT "LoyaltyTransaction_memberId_fkey";

-- DropForeignKey
ALTER TABLE "MarketingEvent" DROP CONSTRAINT "MarketingEvent_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_integrationAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "OAuthToken" DROP CONSTRAINT "OAuthToken_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "OAuthToken" DROP CONSTRAINT "OAuthToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentGateway" DROP CONSTRAINT "PaymentGateway_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_customerId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_gatewayId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentTransaction" DROP CONSTRAINT "PaymentTransaction_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Presentation" DROP CONSTRAINT "Presentation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "QualityCheck" DROP CONSTRAINT "QualityCheck_inspectorId_fkey";

-- DropForeignKey
ALTER TABLE "QualityCheck" DROP CONSTRAINT "QualityCheck_productId_fkey";

-- DropForeignKey
ALTER TABLE "QualityCheck" DROP CONSTRAINT "QualityCheck_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantOrder" DROP CONSTRAINT "RestaurantOrder_tableId_fkey";

-- DropForeignKey
ALTER TABLE "RestaurantTable" DROP CONSTRAINT "RestaurantTable_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "RoomBooking" DROP CONSTRAINT "RoomBooking_roomId_fkey";

-- DropForeignKey
ALTER TABLE "SMSCampaign" DROP CONSTRAINT "SMSCampaign_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ScheduledAction" DROP CONSTRAINT "ScheduledAction_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_integrationAccountId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Shipment" DROP CONSTRAINT "Shipment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Subcontract" DROP CONSTRAINT "Subcontract_jobId_fkey";

-- DropForeignKey
ALTER TABLE "Survey" DROP CONSTRAINT "Survey_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_surveyId_fkey";

-- DropForeignKey
ALTER TABLE "SurveyResponse" DROP CONSTRAINT "SurveyResponse_userId_fkey";

-- DropForeignKey
ALTER TABLE "SyncJob" DROP CONSTRAINT "SyncJob_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TableReservation" DROP CONSTRAINT "TableReservation_tableId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_assignedToId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "TicketAttachment" DROP CONSTRAINT "TicketAttachment_uploadedById_fkey";

-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_authorId_fkey";

-- DropForeignKey
ALTER TABLE "TicketComment" DROP CONSTRAINT "TicketComment_ticketId_fkey";

-- DropForeignKey
ALTER TABLE "WebPage" DROP CONSTRAINT "WebPage_parentId_fkey";

-- DropForeignKey
ALTER TABLE "WebPage" DROP CONSTRAINT "WebPage_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Webhook" DROP CONSTRAINT "Webhook_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WebhookDelivery" DROP CONSTRAINT "WebhookDelivery_webhookId_fkey";

-- DropForeignKey
ALTER TABLE "_EventAttendees" DROP CONSTRAINT "_EventAttendees_A_fkey";

-- DropForeignKey
ALTER TABLE "_EventAttendees" DROP CONSTRAINT "_EventAttendees_B_fkey";

-- DropIndex
DROP INDEX "BlogPost_authorId_idx";

-- DropIndex
DROP INDEX "BlogPost_isPublished_idx";

-- DropIndex
DROP INDEX "BlogPost_slug_idx";

-- DropIndex
DROP INDEX "BlogPost_slug_key";

-- AlterTable
ALTER TABLE "BlogPost" DROP COLUMN "authorId",
DROP COLUMN "categories",
DROP COLUMN "metaDescription",
DROP COLUMN "metaTitle",
DROP COLUMN "viewCount",
ALTER COLUMN "tags" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Property" DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "videoUrl",
DROP COLUMN "yearBuilt",
DROP COLUMN "propertyType",
ADD COLUMN     "propertyType" TEXT NOT NULL,
DROP COLUMN "listingType",
ADD COLUMN     "listingType" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'AVAILABLE';

-- AlterTable
ALTER TABLE "PropertyViewing" DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'SCHEDULED';

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "isSystem",
DROP COLUMN "permissions";

-- DropTable
DROP TABLE "ApiUsage";

-- DropTable
DROP TABLE "AuditLog";

-- DropTable
DROP TABLE "AutomationExecution";

-- DropTable
DROP TABLE "AutomationRule";

-- DropTable
DROP TABLE "CalendarEvent";

-- DropTable
DROP TABLE "Cart";

-- DropTable
DROP TABLE "CartItem";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "Company";

-- DropTable
DROP TABLE "ConstructionJob";

-- DropTable
DROP TABLE "Contact";

-- DropTable
DROP TABLE "Course";

-- DropTable
DROP TABLE "CourseEnrollment";

-- DropTable
DROP TABLE "CourseLesson";

-- DropTable
DROP TABLE "EmailCampaign";

-- DropTable
DROP TABLE "EventRegistration";

-- DropTable
DROP TABLE "ForumPost";

-- DropTable
DROP TABLE "ForumTopic";

-- DropTable
DROP TABLE "HotelRoom";

-- DropTable
DROP TABLE "IntegrationAccount";

-- DropTable
DROP TABLE "IntegrationLog";

-- DropTable
DROP TABLE "JobMaterial";

-- DropTable
DROP TABLE "KnowledgeArticle";

-- DropTable
DROP TABLE "LessonCompletion";

-- DropTable
DROP TABLE "LiveChat";

-- DropTable
DROP TABLE "LoyaltyMember";

-- DropTable
DROP TABLE "LoyaltyProgram";

-- DropTable
DROP TABLE "LoyaltyTier";

-- DropTable
DROP TABLE "LoyaltyTransaction";

-- DropTable
DROP TABLE "MarketingEvent";

-- DropTable
DROP TABLE "Message";

-- DropTable
DROP TABLE "OAuthToken";

-- DropTable
DROP TABLE "PaymentGateway";

-- DropTable
DROP TABLE "PaymentTransaction";

-- DropTable
DROP TABLE "Presentation";

-- DropTable
DROP TABLE "QualityCheck";

-- DropTable
DROP TABLE "RestaurantOrder";

-- DropTable
DROP TABLE "RestaurantTable";

-- DropTable
DROP TABLE "RoomBooking";

-- DropTable
DROP TABLE "SMSCampaign";

-- DropTable
DROP TABLE "ScheduledAction";

-- DropTable
DROP TABLE "Shipment";

-- DropTable
DROP TABLE "Subcontract";

-- DropTable
DROP TABLE "Survey";

-- DropTable
DROP TABLE "SurveyResponse";

-- DropTable
DROP TABLE "SyncJob";

-- DropTable
DROP TABLE "TableReservation";

-- DropTable
DROP TABLE "Ticket";

-- DropTable
DROP TABLE "TicketAttachment";

-- DropTable
DROP TABLE "TicketComment";

-- DropTable
DROP TABLE "WebPage";

-- DropTable
DROP TABLE "Webhook";

-- DropTable
DROP TABLE "WebhookDelivery";

-- DropTable
DROP TABLE "_EventAttendees";

-- DropEnum
DROP TYPE "BookingStatus";

-- DropEnum
DROP TYPE "CampaignStatus";

-- DropEnum
DROP TYPE "ChatStatus";

-- DropEnum
DROP TYPE "ContactType";

-- DropEnum
DROP TYPE "ContractStatus";

-- DropEnum
DROP TYPE "CourseLevel";

-- DropEnum
DROP TYPE "DeliveryStatus";

-- DropEnum
DROP TYPE "EnrollmentStatus";

-- DropEnum
DROP TYPE "EventType";

-- DropEnum
DROP TYPE "ExecutionStatus";

-- DropEnum
DROP TYPE "ForumStatus";

-- DropEnum
DROP TYPE "IntegrationPlatform";

-- DropEnum
DROP TYPE "JobStatus";

-- DropEnum
DROP TYPE "ListingType";

-- DropEnum
DROP TYPE "LogStatus";

-- DropEnum
DROP TYPE "MessageDirection";

-- DropEnum
DROP TYPE "MessagePlatform";

-- DropEnum
DROP TYPE "MessageStatus";

-- DropEnum
DROP TYPE "MessageType";

-- DropEnum
DROP TYPE "PaymentProvider";

-- DropEnum
DROP TYPE "PropertyStatus";

-- DropEnum
DROP TYPE "PropertyType";

-- DropEnum
DROP TYPE "QualityStatus";

-- DropEnum
DROP TYPE "QualityType";

-- DropEnum
DROP TYPE "RegistrationStatus";

-- DropEnum
DROP TYPE "ReservationStatus";

-- DropEnum
DROP TYPE "RoomStatus";

-- DropEnum
DROP TYPE "RoomType";

-- DropEnum
DROP TYPE "ShipmentStatus";

-- DropEnum
DROP TYPE "SurveyStatus";

-- DropEnum
DROP TYPE "TableStatus";

-- DropEnum
DROP TYPE "TicketPriority";

-- DropEnum
DROP TYPE "TicketStatus";

-- DropEnum
DROP TYPE "TransactionStatus";

-- DropEnum
DROP TYPE "TransactionType";

-- DropEnum
DROP TYPE "ViewingStatus";

-- CreateTable
CREATE TABLE "PropertyDocument" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAmenity" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "PropertyAmenity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyLease" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "tenantName" TEXT NOT NULL,
    "tenantEmail" TEXT NOT NULL,
    "tenantPhone" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "monthlyRent" DOUBLE PRECISION NOT NULL,
    "securityDeposit" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "contractUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyLease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyMaintenance" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT,
    "cost" DOUBLE PRECISION,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PropertyMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyInquiry" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "licenseNumber" TEXT,
    "commission" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyAgentAssignment" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PRIMARY',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyAgentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyDocument_propertyId_idx" ON "PropertyDocument"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAmenity_propertyId_idx" ON "PropertyAmenity"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyLease_propertyId_idx" ON "PropertyLease"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyLease_status_idx" ON "PropertyLease"("status");

-- CreateIndex
CREATE INDEX "PropertyMaintenance_propertyId_idx" ON "PropertyMaintenance"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyMaintenance_status_idx" ON "PropertyMaintenance"("status");

-- CreateIndex
CREATE INDEX "PropertyInquiry_propertyId_idx" ON "PropertyInquiry"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyInquiry_status_idx" ON "PropertyInquiry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyAgent_userId_key" ON "PropertyAgent"("userId");

-- CreateIndex
CREATE INDEX "PropertyAgent_tenantId_idx" ON "PropertyAgent"("tenantId");

-- CreateIndex
CREATE INDEX "PropertyAgent_email_idx" ON "PropertyAgent"("email");

-- CreateIndex
CREATE INDEX "PropertyAgentAssignment_propertyId_idx" ON "PropertyAgentAssignment"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyAgentAssignment_agentId_idx" ON "PropertyAgentAssignment"("agentId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_tenantId_slug_key" ON "BlogPost"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- AddForeignKey
ALTER TABLE "PropertyDocument" ADD CONSTRAINT "PropertyDocument_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAmenity" ADD CONSTRAINT "PropertyAmenity_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyLease" ADD CONSTRAINT "PropertyLease_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyMaintenance" ADD CONSTRAINT "PropertyMaintenance_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyInquiry" ADD CONSTRAINT "PropertyInquiry_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgent" ADD CONSTRAINT "PropertyAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgent" ADD CONSTRAINT "PropertyAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAssignment" ADD CONSTRAINT "PropertyAgentAssignment_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyAgentAssignment" ADD CONSTRAINT "PropertyAgentAssignment_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "PropertyAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
