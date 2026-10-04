/*
  Warnings:

  - You are about to drop the column `employeeId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastLoginAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `roleId` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `AIInsight` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `AIWorkflow` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Account` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Attendance` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BillOfMaterials` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BlogPost` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomDashboard` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CustomModule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Customer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Department` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Employee` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Expense` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Invoice` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `InvoiceLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Lead` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LeaveRequest` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ManufacturingOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `MedicalAppointment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Opportunity` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POSConfig` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POSOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POSOrderLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `POSSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Page` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Patient` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Permission` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Product` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ProductCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Project` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PurchaseOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Quotation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Role` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrder` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalesOrderLine` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `StockMove` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Subscription` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SubscriptionPlan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Task` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Timesheet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Warehouse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WorkCenter` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_PermissionToRole` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AIInsight" DROP CONSTRAINT "AIInsight_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "AIWorkflow" DROP CONSTRAINT "AIWorkflow_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BillOfMaterials" DROP CONSTRAINT "BillOfMaterials_productId_fkey";

-- DropForeignKey
ALTER TABLE "BillOfMaterials" DROP CONSTRAINT "BillOfMaterials_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CustomDashboard" DROP CONSTRAINT "CustomDashboard_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "CustomModule" DROP CONSTRAINT "CustomModule_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Customer" DROP CONSTRAINT "Customer_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Department" DROP CONSTRAINT "Department_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_departmentId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_managerId_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Expense" DROP CONSTRAINT "Expense_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "InvoiceLine" DROP CONSTRAINT "InvoiceLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_approvedById_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "LeaveRequest" DROP CONSTRAINT "LeaveRequest_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ManufacturingOrder" DROP CONSTRAINT "ManufacturingOrder_bomId_fkey";

-- DropForeignKey
ALTER TABLE "ManufacturingOrder" DROP CONSTRAINT "ManufacturingOrder_productId_fkey";

-- DropForeignKey
ALTER TABLE "ManufacturingOrder" DROP CONSTRAINT "ManufacturingOrder_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalAppointment" DROP CONSTRAINT "MedicalAppointment_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalAppointment" DROP CONSTRAINT "MedicalAppointment_patientId_fkey";

-- DropForeignKey
ALTER TABLE "MedicalAppointment" DROP CONSTRAINT "MedicalAppointment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Opportunity" DROP CONSTRAINT "Opportunity_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "POSConfig" DROP CONSTRAINT "POSConfig_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "POSConfig" DROP CONSTRAINT "POSConfig_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "POSOrder" DROP CONSTRAINT "POSOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "POSOrder" DROP CONSTRAINT "POSOrder_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "POSOrder" DROP CONSTRAINT "POSOrder_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "POSOrderLine" DROP CONSTRAINT "POSOrderLine_orderId_fkey";

-- DropForeignKey
ALTER TABLE "POSOrderLine" DROP CONSTRAINT "POSOrderLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "POSSession" DROP CONSTRAINT "POSSession_posConfigId_fkey";

-- DropForeignKey
ALTER TABLE "POSSession" DROP CONSTRAINT "POSSession_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "POSSession" DROP CONSTRAINT "POSSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "Page" DROP CONSTRAINT "Page_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_invoiceId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Permission" DROP CONSTRAINT "Permission_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "ProductCategory" DROP CONSTRAINT "ProductCategory_parentId_fkey";

-- DropForeignKey
ALTER TABLE "Project" DROP CONSTRAINT "Project_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "PurchaseOrder" DROP CONSTRAINT "PurchaseOrder_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Role" DROP CONSTRAINT "Role_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_customerId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrder" DROP CONSTRAINT "SalesOrder_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_productId_fkey";

-- DropForeignKey
ALTER TABLE "SalesOrderLine" DROP CONSTRAINT "SalesOrderLine_salesOrderId_fkey";

-- DropForeignKey
ALTER TABLE "StockMove" DROP CONSTRAINT "StockMove_productId_fkey";

-- DropForeignKey
ALTER TABLE "StockMove" DROP CONSTRAINT "StockMove_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "StockMove" DROP CONSTRAINT "StockMove_warehouseId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_customerId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_planId_fkey";

-- DropForeignKey
ALTER TABLE "Subscription" DROP CONSTRAINT "Subscription_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "SubscriptionPlan" DROP CONSTRAINT "SubscriptionPlan_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assigneeId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Timesheet" DROP CONSTRAINT "Timesheet_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_roleId_fkey";

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "WorkCenter" DROP CONSTRAINT "WorkCenter_tenantId_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_A_fkey";

-- DropForeignKey
ALTER TABLE "_PermissionToRole" DROP CONSTRAINT "_PermissionToRole_B_fkey";

-- DropIndex
DROP INDEX "User_employeeId_key";

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "videoUrl" TEXT,
ADD COLUMN     "viewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "virtualTourUrl" TEXT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "employeeId",
DROP COLUMN "lastLoginAt",
DROP COLUMN "roleId";

-- DropTable
DROP TABLE "AIInsight";

-- DropTable
DROP TABLE "AIWorkflow";

-- DropTable
DROP TABLE "Account";

-- DropTable
DROP TABLE "Attendance";

-- DropTable
DROP TABLE "BillOfMaterials";

-- DropTable
DROP TABLE "BlogPost";

-- DropTable
DROP TABLE "CustomDashboard";

-- DropTable
DROP TABLE "CustomModule";

-- DropTable
DROP TABLE "Customer";

-- DropTable
DROP TABLE "Department";

-- DropTable
DROP TABLE "Employee";

-- DropTable
DROP TABLE "Expense";

-- DropTable
DROP TABLE "Invoice";

-- DropTable
DROP TABLE "InvoiceLine";

-- DropTable
DROP TABLE "Lead";

-- DropTable
DROP TABLE "LeaveRequest";

-- DropTable
DROP TABLE "ManufacturingOrder";

-- DropTable
DROP TABLE "MedicalAppointment";

-- DropTable
DROP TABLE "Opportunity";

-- DropTable
DROP TABLE "POSConfig";

-- DropTable
DROP TABLE "POSOrder";

-- DropTable
DROP TABLE "POSOrderLine";

-- DropTable
DROP TABLE "POSSession";

-- DropTable
DROP TABLE "Page";

-- DropTable
DROP TABLE "Patient";

-- DropTable
DROP TABLE "Payment";

-- DropTable
DROP TABLE "Permission";

-- DropTable
DROP TABLE "Product";

-- DropTable
DROP TABLE "ProductCategory";

-- DropTable
DROP TABLE "Project";

-- DropTable
DROP TABLE "PurchaseOrder";

-- DropTable
DROP TABLE "Quotation";

-- DropTable
DROP TABLE "Role";

-- DropTable
DROP TABLE "SalesOrder";

-- DropTable
DROP TABLE "SalesOrderLine";

-- DropTable
DROP TABLE "StockMove";

-- DropTable
DROP TABLE "Subscription";

-- DropTable
DROP TABLE "SubscriptionPlan";

-- DropTable
DROP TABLE "Task";

-- DropTable
DROP TABLE "Timesheet";

-- DropTable
DROP TABLE "Warehouse";

-- DropTable
DROP TABLE "WorkCenter";

-- DropTable
DROP TABLE "_PermissionToRole";

-- DropEnum
DROP TYPE "AccountType";

-- DropEnum
DROP TYPE "AttendanceStatus";

-- DropEnum
DROP TYPE "CustomerType";

-- DropEnum
DROP TYPE "EmployeeStatus";

-- DropEnum
DROP TYPE "ExpenseStatus";

-- DropEnum
DROP TYPE "InvoiceStatus";

-- DropEnum
DROP TYPE "InvoiceType";

-- DropEnum
DROP TYPE "LeadStatus";

-- DropEnum
DROP TYPE "LeaveStatus";

-- DropEnum
DROP TYPE "LeaveType";

-- DropEnum
DROP TYPE "MoveType";

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "ProductType";

-- DropEnum
DROP TYPE "ProjectStatus";

-- DropEnum
DROP TYPE "QuoteStatus";

-- DropEnum
DROP TYPE "TaskStatus";

-- CreateTable
CREATE TABLE "PropertyFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "frequency" TEXT NOT NULL DEFAULT 'DAILY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedSearch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VirtualTour" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "tourType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "embedCode" TEXT,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "thumbnail" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VirtualTour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NeighborhoodInsight" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "walkScore" INTEGER,
    "transitScore" INTEGER,
    "bikeScore" INTEGER,
    "medianIncome" DOUBLE PRECISION,
    "populationCount" INTEGER,
    "medianAge" DOUBLE PRECISION,
    "crimeRate" TEXT,
    "schools" JSONB,
    "amenities" JSONB,
    "pointsOfInterest" JSONB,
    "publicTransport" JSONB,
    "additionalData" JSONB,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NeighborhoodInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyView" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "source" TEXT,
    "referrer" TEXT,
    "sessionId" TEXT,
    "duration" INTEGER,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyComparison" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PropertyComparison_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PropertyFavorite_userId_idx" ON "PropertyFavorite"("userId");

-- CreateIndex
CREATE INDEX "PropertyFavorite_propertyId_idx" ON "PropertyFavorite"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "PropertyFavorite_userId_propertyId_key" ON "PropertyFavorite"("userId", "propertyId");

-- CreateIndex
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- CreateIndex
CREATE INDEX "SavedSearch_isActive_idx" ON "SavedSearch"("isActive");

-- CreateIndex
CREATE INDEX "VirtualTour_propertyId_idx" ON "VirtualTour"("propertyId");

-- CreateIndex
CREATE INDEX "NeighborhoodInsight_propertyId_idx" ON "NeighborhoodInsight"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "NeighborhoodInsight_propertyId_key" ON "NeighborhoodInsight"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyView_propertyId_idx" ON "PropertyView"("propertyId");

-- CreateIndex
CREATE INDEX "PropertyView_userId_idx" ON "PropertyView"("userId");

-- CreateIndex
CREATE INDEX "PropertyView_viewedAt_idx" ON "PropertyView"("viewedAt");

-- CreateIndex
CREATE INDEX "PropertyComparison_userId_idx" ON "PropertyComparison"("userId");

-- CreateIndex
CREATE INDEX "Property_propertyType_idx" ON "Property"("propertyType");

-- CreateIndex
CREATE INDEX "Property_listingType_idx" ON "Property"("listingType");

-- CreateIndex
CREATE INDEX "Property_price_idx" ON "Property"("price");

-- CreateIndex
CREATE INDEX "Property_bedrooms_idx" ON "Property"("bedrooms");

-- CreateIndex
CREATE INDEX "Property_featured_idx" ON "Property"("featured");

-- CreateIndex
CREATE INDEX "Property_createdAt_idx" ON "Property"("createdAt");

-- AddForeignKey
ALTER TABLE "PropertyFavorite" ADD CONSTRAINT "PropertyFavorite_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VirtualTour" ADD CONSTRAINT "VirtualTour_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NeighborhoodInsight" ADD CONSTRAINT "NeighborhoodInsight_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PropertyView" ADD CONSTRAINT "PropertyView_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
