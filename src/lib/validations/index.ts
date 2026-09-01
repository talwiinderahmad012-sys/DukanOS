import { z } from 'zod';
import { PaymentMethod, CommunicationChannel } from '@/generated/prisma/client';

export const productSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  categoryId: z.string().uuid().optional().nullable(),
  sku: z.string().max(50).optional().nullable(),
  barcode: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  unit: z.string().min(1).max(20).default("pcs"),
  purchasePrice: z.number().min(0),
  sellingPrice: z.number().min(0),
  minStockThreshold: z.number().int().min(0).default(5),
});

export const customerSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const saleItemSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int("Quantity must be an integer").positive("Quantity must be greater than 0"),
  sellingPrice: z.number().min(0, "Price cannot be negative").optional(),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
});

export const saleSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional().nullable(),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  items: z.array(saleItemSchema).min(1, "At least one product item is required in cart"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  paidAmount: z.number().min(0, "Paid amount cannot be negative").default(0),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().max(500).optional().nullable(),
  clientTransactionId: z.string().uuid("Invalid client transaction ID").optional().nullable(),
});

export const customerPaymentSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  amount: z.number().positive("Payment amount must be greater than 0"),
  method: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().max(500).optional().nullable(),
});

export const saleCancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required").max(250),
});

export const saleFilterSchema = z.object({
  search: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['COMPLETED', 'CANCELLED', 'REFUNDED', 'ALL']).optional(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID', 'ALL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().uuid(),
  delta: z.number().int("Adjustment must be a whole number of units").refine((v) => v !== 0, { message: "Adjustment quantity must not be zero" }),
  reason: z.string().min(5).max(200),
});

export const expenseSchema = z.object({
  category: z.string().min(2).max(100),
  amount: z.number().positive(),
  date: z.date().optional(),
  description: z.string().max(300).optional().nullable(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  branchId: z.string().uuid().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(300).optional().nullable(),
});

export const supplierSchema = z.object({
  name: z.string().min(2).max(100),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const purchaseItemInputSchema = z.object({
  productId: z.string().uuid("Invalid product ID"),
  quantity: z.number().int("Quantity must be an integer").positive("Quantity must be greater than 0"),
  purchasePrice: z.number().min(0, "Purchase price cannot be negative"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
});

export const purchaseCreateSchema = z.object({
  supplierId: z.string().uuid("Invalid supplier ID").optional().nullable(),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  invoiceNumber: z.string().max(50).optional().nullable(),
  purchaseDate: z.union([z.string(), z.date()]).optional(),
  notes: z.string().max(500).optional().nullable(),
  items: z.array(purchaseItemInputSchema).min(1, "At least one product item is required"),
  discount: z.number().min(0, "Discount cannot be negative").default(0),
  paidAmount: z.number().min(0, "Paid amount cannot be negative").default(0),
});

export const purchaseCancelSchema = z.object({
  reason: z.string().min(3, "Cancellation reason is required").max(250),
});

export const purchaseFilterSchema = z.object({
  search: z.string().optional(),
  supplierId: z.string().optional(),
  status: z.enum(['RECEIVED', 'CANCELLED', 'ALL']).optional(),
  paymentStatus: z.enum(['PAID', 'PARTIAL', 'UNPAID', 'ALL']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
});

// ----------------------------------------
// Employee & Staff Management Schemas
// ----------------------------------------
export const createEmployeeSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  employeeCode: z.string().max(30).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),
  position: z.string().min(2, "Position is required").max(100),
  department: z.string().max(100).optional().nullable(),
  joiningDate: z.union([z.string(), z.date()]).optional(),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY']).default('MONTHLY'),
  basicSalary: z.number().min(0, "Basic salary cannot be negative").default(0),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().max(500).optional().nullable(),
});

export const updateEmployeeSchema = createEmployeeSchema.partial();

export const employeeFilterSchema = z.object({
  search: z.string().optional(),
  branchId: z.string().optional(),
  position: z.string().optional(),
  status: z.enum(['ACTIVE', 'ON_LEAVE', 'SUSPENDED', 'INACTIVE', 'ALL']).optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
});

export const recordAttendanceSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  date: z.union([z.string(), z.date()]).optional(),
  status: z.enum(['PRESENT', 'ABSENT', 'LATE', 'LEAVE']).default('PRESENT'),
  checkIn: z.union([z.string(), z.date()]).optional().nullable(),
  checkOut: z.union([z.string(), z.date()]).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
  branchId: z.string().uuid().optional().nullable(),
});

export const createLeaveRequestSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  leaveType: z.enum(['CASUAL', 'SICK', 'ANNUAL', 'UNPAID', 'OTHER']).default('CASUAL'),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
  daysCount: z.number().int().positive().default(1),
  reason: z.string().min(3, "Reason must be at least 3 characters").max(500),
});

export const reviewLeaveSchema = z.object({
  leaveId: z.string().uuid("Invalid leave ID"),
  status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']),
  approvalNotes: z.string().max(300).optional().nullable(),
});

export const createSalaryRecordSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  period: z.string().regex(/^\d{4}-\d{2}$/, "Period must be in YYYY-MM format (e.g. 2026-08)"),
  baseSalary: z.number().min(0, "Base salary cannot be negative"),
  overtime: z.number().min(0).default(0),
  bonus: z.number().min(0).default(0),
  deductions: z.number().min(0).default(0),
  advance: z.number().min(0).default(0),
  notes: z.string().max(500).optional().nullable(),
});

export const recordSalaryPaymentSchema = z.object({
  salaryId: z.string().uuid("Invalid salary record ID"),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.CASH),
  notes: z.string().max(300).optional().nullable(),
});

export const createComplaintSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  category: z.string().min(2).max(50).default("WORKPLACE"),
  description: z.string().min(10, "Description must be at least 10 characters").max(1000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

export const resolveComplaintSchema = z.object({
  complaintId: z.string().uuid("Invalid complaint ID"),
  status: z.enum(['IN_REVIEW', 'RESOLVED', 'REJECTED']),
  resolutionNote: z.string().min(3, "Resolution note is required").max(500),
});

// ----------------------------------------
// Employee Self-Service & Advanced HR Schemas (Step 30)
// ----------------------------------------
export const selfAttendanceSchema = z.object({
  date: z.union([z.string(), z.date()]).optional(),
});

export const employeeCheckInSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID").optional(),
  date: z.union([z.string(), z.date()]).optional(),
});

export const cancelLeaveSchema = z.object({
  leaveId: z.string().uuid("Invalid leave ID"),
  reason: z.string().max(300).optional().nullable(),
});

export const updateSalaryStructureSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  basicSalary: z.number().min(0, "Basic salary cannot be negative"),
  salaryType: z.enum(['MONTHLY', 'DAILY', 'HOURLY']).optional(),
  effectiveDate: z.union([z.string(), z.date()]).optional(),
  reason: z.string().max(300).optional().nullable(),
});

export const assignBranchSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  branchId: z.string().uuid("Invalid branch ID").nullable(),
});

export const payrollPeriodSchema = z.object({
  periodName: z.string().min(3, "Period name must be at least 3 characters").max(50),
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
});

export const payrollActionSchema = z.object({
  payrollId: z.string().uuid("Invalid payroll ID"),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  reason: z.string().min(3, "Reason is required").max(300).optional(),
});

export const notifyEmployeeSchema = z.object({
  employeeId: z.string().uuid("Invalid employee ID"),
  title: z.string().min(3, "Title must be at least 3 characters").max(150),
  message: z.string().min(3, "Message must be at least 3 characters").max(1000),
});

// ----------------------------------------
// Customer Experience & Feedback Schemas (Step 11)
// ----------------------------------------
export const updateCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email("Invalid email address").optional().nullable().or(z.literal("")),
  address: z.string().max(300).optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).optional(),
});

export const customerFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED', 'ALL']).optional(),
  hasOutstanding: z.boolean().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(25),
});

export const submitFeedbackSchema = z.object({
  token: z.string().min(10, "Invalid feedback token"),
  rating: z.number().int("Rating must be an integer").min(1, "Rating must be at least 1 star").max(5, "Rating cannot exceed 5 stars"),
  category: z.enum(['SERVICE', 'PRODUCT', 'PRICE', 'STAFF', 'CLEANLINESS', 'DELIVERY', 'OTHER']).default('SERVICE'),
  message: z.string().min(3, "Feedback message must be at least 3 characters").max(1000, "Message cannot exceed 1000 characters"),
  isAnonymous: z.boolean().default(false),
});

export const generateFeedbackTokenSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID").optional().nullable(),
  saleId: z.string().uuid("Invalid sale ID").optional().nullable(),
});

export const updateFeedbackStatusSchema = z.object({
  feedbackId: z.string().uuid("Invalid feedback ID"),
  status: z.enum(['NEW', 'REVIEWING', 'RESOLVED', 'ARCHIVED']),
  resolutionNote: z.string().max(500).optional().nullable(),
});

export const feedbackFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum(['NEW', 'REVIEWING', 'RESOLVED', 'ARCHIVED', 'ALL']).optional(),
  rating: z.number().int().min(1).max(5).optional(),
  category: z.enum(['SERVICE', 'PRODUCT', 'PRICE', 'STAFF', 'CLEANLINESS', 'DELIVERY', 'OTHER', 'ALL']).optional(),
  customerId: z.string().uuid().optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().default(20),
});

// ----------------------------------------
// Internal Communication & Announcements Schemas (Step 12)
// ----------------------------------------
export const createConversationSchema = z.object({
  targetUserId: z.string().uuid("Invalid target user ID"),
  initialMessage: z.string().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters").optional(),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().uuid("Invalid conversation ID"),
  content: z.string().min(1, "Message cannot be empty").max(2000, "Message cannot exceed 2000 characters"),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(150, "Title cannot exceed 150 characters"),
  message: z.string().min(5, "Announcement body must be at least 5 characters").max(3000, "Message cannot exceed 3000 characters"),
  priority: z.enum(['NORMAL', 'IMPORTANT', 'URGENT']).default('NORMAL'),
  targetRole: z.enum(['ALL', 'OWNER', 'MANAGER', 'CASHIER', 'EMPLOYEE']).default('ALL'),
  branchId: z.string().uuid("Invalid branch ID").optional().nullable(),
  expiresAt: z.string().optional().nullable(),
});

export const updateBusinessStatusSchema = z.object({
  isOpen: z.boolean(),
  operatingHours: z.string().max(200).optional().nullable(),
});

// ----------------------------------------
// Customer Communications (Step 28)
// ----------------------------------------
export const sendCustomerMessageSchema = z.object({
  customerId: z.string().uuid("Invalid customer ID"),
  channel: z.nativeEnum(CommunicationChannel).default(CommunicationChannel.WHATSAPP),
  messageType: z.string().default('TRANSACTIONAL'),
  templateType: z.string().optional().nullable(),
  content: z.string().min(1, "Message content is required").max(4000),
});

export const createMessageTemplateSchema = z.object({
  type: z.string().min(1, "Type is required").max(50),
  channel: z.nativeEnum(CommunicationChannel),
  name: z.string().min(3, "Name must be at least 3 characters").max(100),
  subject: z.string().max(200).optional().nullable(),
  body: z.string().min(1, "Body is required").max(4000),
  isEnabled: z.boolean().default(true),
  isDefault: z.boolean().default(false),
});

export const toggleAutomationSchema = z.object({
  automationId: z.string().uuid("Invalid automation ID"),
  isEnabled: z.boolean(),
});





 
