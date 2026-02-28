
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.19.1
 * Query Engine version: 69d742ee20b815d88e17e54db4a2a7a3b30324e3
 */
Prisma.prismaVersion = {
  client: "5.19.1",
  engine: "69d742ee20b815d88e17e54db4a2a7a3b30324e3"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  username: 'username',
  email: 'email',
  password: 'password',
  roleId: 'roleId',
  deviceApprovalStatus: 'deviceApprovalStatus',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RoleScalarFieldEnum = {
  id: 'id',
  name: 'name',
  status: 'status',
  category: 'category',
  permissions: 'permissions',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  defaultPassword: 'defaultPassword'
};

exports.Prisma.RolePermissionScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  module: 'module',
  submodule: 'submodule',
  action: 'action',
  granted: 'granted',
  createdAt: 'createdAt',
  createdBy: 'createdBy'
};

exports.Prisma.PermissionAuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  actorUsername: 'actorUsername',
  roleId: 'roleId',
  roleName: 'roleName',
  permissionPath: 'permissionPath',
  oldValue: 'oldValue',
  newValue: 'newValue',
  changeType: 'changeType',
  context: 'context',
  createdAt: 'createdAt'
};

exports.Prisma.ActionAuditLogScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  username: 'username',
  roleId: 'roleId',
  roleName: 'roleName',
  permissionUsed: 'permissionUsed',
  action: 'action',
  entityType: 'entityType',
  entityId: 'entityId',
  requestPath: 'requestPath',
  requestMethod: 'requestMethod',
  requestContext: 'requestContext',
  result: 'result',
  createdAt: 'createdAt'
};

exports.Prisma.RoleLifecycleAuditLogScalarFieldEnum = {
  id: 'id',
  actorId: 'actorId',
  actorUsername: 'actorUsername',
  roleId: 'roleId',
  roleName: 'roleName',
  previousStatus: 'previousStatus',
  newStatus: 'newStatus',
  affectedUsers: 'affectedUsers',
  reassignmentMap: 'reassignmentMap',
  reason: 'reason',
  context: 'context',
  createdAt: 'createdAt'
};

exports.Prisma.RoleInviteLinkScalarFieldEnum = {
  id: 'id',
  roleId: 'roleId',
  username: 'username',
  email: 'email',
  password: 'password',
  message: 'message',
  token: 'token',
  status: 'status',
  createdAt: 'createdAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.DeviceApprovalScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  deviceInfo: 'deviceInfo',
  status: 'status',
  requestedAt: 'requestedAt',
  approvedAt: 'approvedAt'
};

exports.Prisma.NotificationScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  title: 'title',
  message: 'message',
  type: 'type',
  read: 'read',
  createdAt: 'createdAt'
};

exports.Prisma.PropertyScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  address: 'address',
  location: 'location',
  status: 'status',
  imageUrl: 'imageUrl',
  description: 'description',
  yearBuilt: 'yearBuilt',
  totalArea: 'totalArea',
  totalUnits: 'totalUnits',
  dealerId: 'dealerId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  propertyCode: 'propertyCode',
  city: 'city',
  documents: 'documents',
  ownerName: 'ownerName',
  ownerPhone: 'ownerPhone',
  previousTenants: 'previousTenants',
  rentAmount: 'rentAmount',
  rentEscalationPercentage: 'rentEscalationPercentage',
  securityDeposit: 'securityDeposit',
  size: 'size',
  title: 'title',
  locationId: 'locationId',
  manualUniqueId: 'manualUniqueId',
  propertySubsidiary: 'propertySubsidiary',
  amenities: 'amenities',
  salePrice: 'salePrice',
  subsidiaryOptionId: 'subsidiaryOptionId',
  tid: 'tid',
  category: 'category'
};

exports.Prisma.LocationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  parentId: 'parentId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isActive: 'isActive',
  isLeaf: 'isLeaf'
};

exports.Prisma.PropertySubsidiaryScalarFieldEnum = {
  id: 'id',
  locationId: 'locationId',
  name: 'name',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  isActive: 'isActive',
  logoPath: 'logoPath'
};

exports.Prisma.SubsidiaryOptionScalarFieldEnum = {
  id: 'id',
  propertySubsidiaryId: 'propertySubsidiaryId',
  name: 'name',
  sortOrder: 'sortOrder',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BlockScalarFieldEnum = {
  id: 'id',
  name: 'name',
  propertyId: 'propertyId',
  description: 'description',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FloorScalarFieldEnum = {
  id: 'id',
  name: 'name',
  floorNumber: 'floorNumber',
  propertyId: 'propertyId',
  description: 'description',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.UnitScalarFieldEnum = {
  id: 'id',
  unitName: 'unitName',
  propertyId: 'propertyId',
  blockId: 'blockId',
  status: 'status',
  monthlyRent: 'monthlyRent',
  description: 'description',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  floorId: 'floorId',
  maintenanceHistory: 'maintenanceHistory',
  unitType: 'unitType',
  sizeSqFt: 'sizeSqFt',
  securityDeposit: 'securityDeposit',
  utilitiesIncluded: 'utilitiesIncluded',
  tid: 'tid'
};

exports.Prisma.TenantScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  unitId: 'unitId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  cnic: 'cnic',
  tenantCode: 'tenantCode',
  advanceBalance: 'advanceBalance',
  cnicDocumentUrl: 'cnicDocumentUrl',
  isActive: 'isActive',
  lastLoginAt: 'lastLoginAt',
  outstandingBalance: 'outstandingBalance',
  password: 'password',
  profilePhotoUrl: 'profilePhotoUrl',
  tid: 'tid'
};

exports.Prisma.LeaseScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  unitId: 'unitId',
  leaseStart: 'leaseStart',
  leaseEnd: 'leaseEnd',
  rent: 'rent',
  status: 'status',
  notes: 'notes',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy',
  leaseDocumentUrl: 'leaseDocumentUrl',
  leaseNumber: 'leaseNumber',
  noticePeriod: 'noticePeriod',
  renewalDate: 'renewalDate',
  renewalHistory: 'renewalHistory',
  rentTerms: 'rentTerms',
  securityDeposit: 'securityDeposit',
  termsAndConditions: 'termsAndConditions',
  updatedBy: 'updatedBy',
  tid: 'tid'
};

exports.Prisma.SaleScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  saleValue: 'saleValue',
  commission: 'commission',
  commissionRate: 'commissionRate',
  saleDate: 'saleDate',
  status: 'status',
  notes: 'notes',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  actualPropertyValue: 'actualPropertyValue',
  buyerId: 'buyerId',
  dealerId: 'dealerId',
  documents: 'documents',
  profit: 'profit',
  tid: 'tid'
};

exports.Prisma.SaleInstallmentScalarFieldEnum = {
  id: 'id',
  saleId: 'saleId',
  installmentNumber: 'installmentNumber',
  amount: 'amount',
  dueDate: 'dueDate',
  paidDate: 'paidDate',
  status: 'status',
  paidAmount: 'paidAmount',
  notes: 'notes',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.BuyerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  address: 'address',
  propertyId: 'propertyId',
  saleId: 'saleId',
  buyStatus: 'buyStatus',
  buyValue: 'buyValue',
  notes: 'notes',
  tid: 'tid',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ActivityScalarFieldEnum = {
  id: 'id',
  type: 'type',
  action: 'action',
  entityId: 'entityId',
  entityName: 'entityName',
  message: 'message',
  userId: 'userId',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.MessageScalarFieldEnum = {
  id: 'id',
  content: 'content',
  senderId: 'senderId',
  senderName: 'senderName',
  senderRole: 'senderRole',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  senderEmail: 'senderEmail'
};

exports.Prisma.DepartmentScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.EmployeeScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  name: 'name',
  email: 'email',
  phone: 'phone',
  position: 'position',
  department: 'department',
  salary: 'salary',
  joinDate: 'joinDate',
  status: 'status',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  cnic: 'cnic',
  address: 'address',
  attendanceQRCode: 'attendanceQRCode',
  bankAccountNumber: 'bankAccountNumber',
  bankBranch: 'bankBranch',
  bankName: 'bankName',
  basicSalary: 'basicSalary',
  benefitsEligible: 'benefitsEligible',
  bloodGroup: 'bloodGroup',
  city: 'city',
  cnicDocumentUrl: 'cnicDocumentUrl',
  country: 'country',
  dateOfBirth: 'dateOfBirth',
  departmentCode: 'departmentCode',
  education: 'education',
  emergencyContactName: 'emergencyContactName',
  emergencyContactPhone: 'emergencyContactPhone',
  emergencyContactRelation: 'emergencyContactRelation',
  employeeType: 'employeeType',
  experience: 'experience',
  gender: 'gender',
  iban: 'iban',
  insuranceEligible: 'insuranceEligible',
  maritalStatus: 'maritalStatus',
  nationality: 'nationality',
  postalCode: 'postalCode',
  probationEndDate: 'probationEndDate',
  probationPeriod: 'probationPeriod',
  profilePhotoUrl: 'profilePhotoUrl',
  reportingManagerId: 'reportingManagerId',
  role: 'role',
  shiftTimings: 'shiftTimings',
  workLocation: 'workLocation',
  tid: 'tid',
  trackingId: 'trackingId'
};

exports.Prisma.AttendanceScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  date: 'date',
  checkIn: 'checkIn',
  checkOut: 'checkOut',
  status: 'status',
  hours: 'hours',
  totalWorkDuration: 'totalWorkDuration',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  checkInLocation: 'checkInLocation',
  checkOutLocation: 'checkOutLocation',
  deviceId: 'deviceId',
  graceMinutes: 'graceMinutes',
  isManualOverride: 'isManualOverride',
  isNightShift: 'isNightShift',
  isSuspicious: 'isSuspicious',
  lateMinutes: 'lateMinutes',
  overrideBy: 'overrideBy',
  overrideReason: 'overrideReason',
  overtimeHours: 'overtimeHours',
  shiftId: 'shiftId',
  suspiciousReason: 'suspiciousReason'
};

exports.Prisma.AttendanceCorrectionScalarFieldEnum = {
  id: 'id',
  attendanceId: 'attendanceId',
  employeeId: 'employeeId',
  requestedDate: 'requestedDate',
  originalCheckIn: 'originalCheckIn',
  originalCheckOut: 'originalCheckOut',
  requestedCheckIn: 'requestedCheckIn',
  requestedCheckOut: 'requestedCheckOut',
  reason: 'reason',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PayrollScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  month: 'month',
  baseSalary: 'baseSalary',
  bonus: 'bonus',
  deductions: 'deductions',
  netPay: 'netPay',
  paidAmount: 'paidAmount',
  remainingBalance: 'remainingBalance',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  advanceDeduction: 'advanceDeduction',
  allowances: 'allowances',
  basicSalary: 'basicSalary',
  epfAmount: 'epfAmount',
  etfAmount: 'etfAmount',
  financeLinked: 'financeLinked',
  grossSalary: 'grossSalary',
  insuranceAmount: 'insuranceAmount',
  journalEntryId: 'journalEntryId',
  notes: 'notes',
  overtimeAmount: 'overtimeAmount',
  paymentDate: 'paymentDate',
  paymentMethod: 'paymentMethod',
  paymentStatus: 'paymentStatus',
  payslipUrl: 'payslipUrl',
  taxAmount: 'taxAmount',
  taxPercent: 'taxPercent',
  financeLedgerId: 'financeLedgerId'
};

exports.Prisma.PayrollAllowanceScalarFieldEnum = {
  id: 'id',
  payrollId: 'payrollId',
  employeeId: 'employeeId',
  type: 'type',
  amount: 'amount',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.PayrollDeductionScalarFieldEnum = {
  id: 'id',
  payrollId: 'payrollId',
  employeeId: 'employeeId',
  type: 'type',
  amount: 'amount',
  description: 'description',
  createdAt: 'createdAt'
};

exports.Prisma.PayrollPaymentScalarFieldEnum = {
  id: 'id',
  payrollId: 'payrollId',
  amount: 'amount',
  paymentDate: 'paymentDate',
  paymentMethod: 'paymentMethod',
  referenceNumber: 'referenceNumber',
  transactionId: 'transactionId',
  notes: 'notes',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SalaryHistoryScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  previousSalary: 'previousSalary',
  newSalary: 'newSalary',
  effectiveDate: 'effectiveDate',
  reason: 'reason',
  approvedBy: 'approvedBy',
  notes: 'notes',
  createdAt: 'createdAt'
};

exports.Prisma.LeaveRequestScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  type: 'type',
  startDate: 'startDate',
  endDate: 'endDate',
  days: 'days',
  reason: 'reason',
  status: 'status',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvalLevel: 'approvalLevel',
  approvalReason: 'approvalReason',
  approvedAt: 'approvedAt',
  approvedBy: 'approvedBy',
  halfDayType: 'halfDayType',
  isHalfDay: 'isHalfDay',
  leaveBalance: 'leaveBalance',
  payrollDeduction: 'payrollDeduction',
  proofDocumentUrl: 'proofDocumentUrl',
  rejectedAt: 'rejectedAt',
  rejectedBy: 'rejectedBy',
  rejectionReason: 'rejectionReason'
};

exports.Prisma.LeaveBalanceScalarFieldEnum = {
  id: 'id',
  employeeId: 'employeeId',
  leaveType: 'leaveType',
  totalAllocated: 'totalAllocated',
  used: 'used',
  pending: 'pending',
  available: 'available',
  carryForward: 'carryForward',
  year: 'year',
  accrualRate: 'accrualRate',
  maxCarryForward: 'maxCarryForward',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PublicHolidayScalarFieldEnum = {
  id: 'id',
  name: 'name',
  date: 'date',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.LeadScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  source: 'source',
  interest: 'interest',
  budget: 'budget',
  notes: 'notes',
  status: 'status',
  assignedTo: 'assignedTo',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  address: 'address',
  cnic: 'cnic',
  leadCode: 'leadCode',
  assignedToUserId: 'assignedToUserId',
  attachments: 'attachments',
  budgetMax: 'budgetMax',
  budgetMin: 'budgetMin',
  city: 'city',
  communicationPreference: 'communicationPreference',
  convertedAt: 'convertedAt',
  convertedToClientId: 'convertedToClientId',
  country: 'country',
  createdBy: 'createdBy',
  expectedCloseDate: 'expectedCloseDate',
  followUpDate: 'followUpDate',
  interestType: 'interestType',
  isDeleted: 'isDeleted',
  latitude: 'latitude',
  leadSourceDetails: 'leadSourceDetails',
  longitude: 'longitude',
  postalCode: 'postalCode',
  priority: 'priority',
  score: 'score',
  tags: 'tags',
  temperature: 'temperature',
  updatedBy: 'updatedBy',
  manualUniqueId: 'manualUniqueId',
  assignedDealerId: 'assignedDealerId',
  tid: 'tid'
};

exports.Prisma.LeadImportBatchScalarFieldEnum = {
  id: 'id',
  fileName: 'fileName',
  fileHash: 'fileHash',
  filePath: 'filePath',
  rowCount: 'rowCount',
  readyCount: 'readyCount',
  duplicateCount: 'duplicateCount',
  invalidCount: 'invalidCount',
  status: 'status',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  committedAt: 'committedAt',
  errorSummary: 'errorSummary'
};

exports.Prisma.LeadImportRowScalarFieldEnum = {
  id: 'id',
  batchId: 'batchId',
  rowNumber: 'rowNumber',
  fullName: 'fullName',
  phone: 'phone',
  email: 'email',
  cnic: 'cnic',
  leadSource: 'leadSource',
  sourceDetails: 'sourceDetails',
  dealerTid: 'dealerTid',
  dealerEmail: 'dealerEmail',
  notes: 'notes',
  status: 'status',
  errors: 'errors',
  duplicateOfLeadId: 'duplicateOfLeadId',
  duplicateOfClientId: 'duplicateOfClientId',
  resolvedDealerId: 'resolvedDealerId',
  assignmentMode: 'assignmentMode',
  createdLeadId: 'createdLeadId',
  createdAt: 'createdAt'
};

exports.Prisma.ClientScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  address: 'address',
  clientCode: 'clientCode',
  clientNo: 'clientNo',
  cnic: 'cnic',
  srNo: 'srNo',
  assignedAgentId: 'assignedAgentId',
  assignedDealerId: 'assignedDealerId',
  attachments: 'attachments',
  billingAddress: 'billingAddress',
  city: 'city',
  clientCategory: 'clientCategory',
  clientType: 'clientType',
  cnicDocumentUrl: 'cnicDocumentUrl',
  convertedFromLeadId: 'convertedFromLeadId',
  country: 'country',
  createdBy: 'createdBy',
  isDeleted: 'isDeleted',
  postalCode: 'postalCode',
  propertyInterest: 'propertyInterest',
  tags: 'tags',
  updatedBy: 'updatedBy',
  manualUniqueId: 'manualUniqueId',
  propertySubsidiary: 'propertySubsidiary',
  tid: 'tid'
};

exports.Prisma.ContactPersonScalarFieldEnum = {
  id: 'id',
  clientId: 'clientId',
  name: 'name',
  email: 'email',
  phone: 'phone',
  position: 'position',
  department: 'department',
  isPrimary: 'isPrimary',
  notes: 'notes',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealerScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  phone: 'phone',
  company: 'company',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  commissionRate: 'commissionRate',
  address: 'address',
  cnic: 'cnic',
  dealerCode: 'dealerCode',
  agreementContractUrl: 'agreementContractUrl',
  assignedRegion: 'assignedRegion',
  bankAccountNumber: 'bankAccountNumber',
  bankBranch: 'bankBranch',
  bankName: 'bankName',
  city: 'city',
  cnicImageUrl: 'cnicImageUrl',
  country: 'country',
  createdBy: 'createdBy',
  currentPipelineValue: 'currentPipelineValue',
  experienceYears: 'experienceYears',
  iban: 'iban',
  isActive: 'isActive',
  isDeleted: 'isDeleted',
  notes: 'notes',
  postalCode: 'postalCode',
  qualifications: 'qualifications',
  rating: 'rating',
  settlementHistory: 'settlementHistory',
  tags: 'tags',
  totalCommissionEarned: 'totalCommissionEarned',
  totalDealsClosed: 'totalDealsClosed',
  updatedBy: 'updatedBy',
  manualUniqueId: 'manualUniqueId',
  tid: 'tid'
};

exports.Prisma.DealerReviewScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  rating: 'rating',
  comment: 'comment',
  reviewedBy: 'reviewedBy',
  createdAt: 'createdAt'
};

exports.Prisma.DealScalarFieldEnum = {
  id: 'id',
  title: 'title',
  dealAmount: 'dealAmount',
  listingPriceSnapshot: 'listingPriceSnapshot',
  varianceAmount: 'varianceAmount',
  varianceType: 'varianceType',
  stage: 'stage',
  clientId: 'clientId',
  dealerId: 'dealerId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  actualClosingDate: 'actualClosingDate',
  approvedAt: 'approvedAt',
  approvedBy: 'approvedBy',
  attachments: 'attachments',
  commissionAmount: 'commissionAmount',
  commissionRate: 'commissionRate',
  createdBy: 'createdBy',
  dealCode: 'dealCode',
  dealType: 'dealType',
  expectedClosingDate: 'expectedClosingDate',
  expectedRevenue: 'expectedRevenue',
  isDeleted: 'isDeleted',
  notes: 'notes',
  probability: 'probability',
  propertyId: 'propertyId',
  requiresApproval: 'requiresApproval',
  tags: 'tags',
  updatedBy: 'updatedBy',
  valueBreakdown: 'valueBreakdown',
  role: 'role',
  dealDate: 'dealDate',
  status: 'status',
  totalPaid: 'totalPaid',
  unitId: 'unitId',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  manualUniqueId: 'manualUniqueId',
  locationId: 'locationId',
  subsidiaryOptionId: 'subsidiaryOptionId',
  tid: 'tid'
};

exports.Prisma.DealAgentScalarFieldEnum = {
  id: 'id',
  dealId: 'dealId',
  agentId: 'agentId',
  agentName: 'agentName',
  commissionShare: 'commissionShare',
  role: 'role',
  createdAt: 'createdAt'
};

exports.Prisma.DealPropertyScalarFieldEnum = {
  id: 'id',
  dealId: 'dealId',
  propertyId: 'propertyId',
  priceShare: 'priceShare',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.StageHistoryScalarFieldEnum = {
  id: 'id',
  dealId: 'dealId',
  fromStage: 'fromStage',
  toStage: 'toStage',
  changedBy: 'changedBy',
  changedAt: 'changedAt',
  notes: 'notes',
  probability: 'probability'
};

exports.Prisma.CommunicationScalarFieldEnum = {
  id: 'id',
  leadId: 'leadId',
  clientId: 'clientId',
  channel: 'channel',
  content: 'content',
  createdAt: 'createdAt',
  activityDate: 'activityDate',
  activityOutcome: 'activityOutcome',
  activityType: 'activityType',
  assignedAgentId: 'assignedAgentId',
  attachments: 'attachments',
  contactPersonId: 'contactPersonId',
  contactPersonName: 'contactPersonName',
  createdBy: 'createdBy',
  dealId: 'dealId',
  isDeleted: 'isDeleted',
  nextFollowUpDate: 'nextFollowUpDate',
  recurrence: 'recurrence',
  recurrenceEndDate: 'recurrenceEndDate',
  reminderDate: 'reminderDate',
  reminderEnabled: 'reminderEnabled',
  subject: 'subject',
  tags: 'tags',
  updatedAt: 'updatedAt',
  voiceNoteUrl: 'voiceNoteUrl'
};

exports.Prisma.CRMActivityScalarFieldEnum = {
  id: 'id',
  leadId: 'leadId',
  clientId: 'clientId',
  dealId: 'dealId',
  type: 'type',
  title: 'title',
  description: 'description',
  activityDate: 'activityDate',
  dueDate: 'dueDate',
  status: 'status',
  priority: 'priority',
  assignedTo: 'assignedTo',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionCategoryScalarFieldEnum = {
  id: 'id',
  name: 'name',
  type: 'type',
  description: 'description',
  defaultDebitAccountId: 'defaultDebitAccountId',
  defaultCreditAccountId: 'defaultCreditAccountId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TransactionScalarFieldEnum = {
  id: 'id',
  description: 'description',
  amount: 'amount',
  date: 'date',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  transactionCode: 'transactionCode',
  transactionType: 'transactionType',
  transactionCategoryId: 'transactionCategoryId',
  taxAmount: 'taxAmount',
  totalAmount: 'totalAmount',
  paymentMethod: 'paymentMethod',
  debitAccountId: 'debitAccountId',
  creditAccountId: 'creditAccountId',
  tenantId: 'tenantId',
  dealerId: 'dealerId',
  propertyId: 'propertyId',
  attachments: 'attachments',
  createdByUserId: 'createdByUserId',
  journalEntryId: 'journalEntryId'
};

exports.Prisma.InvoiceScalarFieldEnum = {
  id: 'id',
  invoiceNumber: 'invoiceNumber',
  amount: 'amount',
  dueDate: 'dueDate',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tenantId: 'tenantId',
  propertyId: 'propertyId',
  billingDate: 'billingDate',
  taxPercent: 'taxPercent',
  taxAmount: 'taxAmount',
  discountAmount: 'discountAmount',
  totalAmount: 'totalAmount',
  remainingAmount: 'remainingAmount',
  lateFeeRule: 'lateFeeRule',
  termsAndConditions: 'termsAndConditions',
  attachments: 'attachments',
  tenantAccountId: 'tenantAccountId',
  incomeAccountId: 'incomeAccountId',
  createdByUserId: 'createdByUserId',
  journalEntryId: 'journalEntryId'
};

exports.Prisma.PaymentScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  dealId: 'dealId',
  amount: 'amount',
  paymentType: 'paymentType',
  paymentMode: 'paymentMode',
  transactionId: 'transactionId',
  referenceNumber: 'referenceNumber',
  date: 'date',
  remarks: 'remarks',
  createdByUserId: 'createdByUserId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  installmentId: 'installmentId',
  refundOfPaymentId: 'refundOfPaymentId',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  manualUniqueId: 'manualUniqueId',
  bankName: 'bankName',
  chequeNumber: 'chequeNumber',
  clearingStatus: 'clearingStatus'
};

exports.Prisma.TenantPaymentScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  amount: 'amount',
  method: 'method',
  date: 'date',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  bankAccountId: 'bankAccountId',
  referenceNumber: 'referenceNumber',
  notes: 'notes',
  attachments: 'attachments',
  allocatedAmount: 'allocatedAmount',
  overpaymentAmount: 'overpaymentAmount',
  allocations: 'allocations',
  receivableAccountId: 'receivableAccountId',
  advanceAccountId: 'advanceAccountId',
  createdByUserId: 'createdByUserId',
  journalEntryId: 'journalEntryId'
};

exports.Prisma.MaintenanceTicketScalarFieldEnum = {
  id: 'id',
  ticketNumber: 'ticketNumber',
  tenantId: 'tenantId',
  unitId: 'unitId',
  category: 'category',
  title: 'title',
  description: 'description',
  priority: 'priority',
  status: 'status',
  assignedTo: 'assignedTo',
  assignedToName: 'assignedToName',
  photos: 'photos',
  technicianNotes: 'technicianNotes',
  estimatedCost: 'estimatedCost',
  actualCost: 'actualCost',
  completedAt: 'completedAt',
  tenantRating: 'tenantRating',
  tenantFeedback: 'tenantFeedback',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaintenanceActivityScalarFieldEnum = {
  id: 'id',
  ticketId: 'ticketId',
  action: 'action',
  description: 'description',
  performedBy: 'performedBy',
  performedAt: 'performedAt',
  metadata: 'metadata'
};

exports.Prisma.NoticeToVacateScalarFieldEnum = {
  id: 'id',
  noticeNumber: 'noticeNumber',
  tenantId: 'tenantId',
  unitId: 'unitId',
  reason: 'reason',
  moveOutDate: 'moveOutDate',
  supportingDocs: 'supportingDocs',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  rejectionReason: 'rejectionReason',
  emailSent: 'emailSent',
  emailSentAt: 'emailSentAt',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RentReminderScalarFieldEnum = {
  id: 'id',
  tenantId: 'tenantId',
  invoiceId: 'invoiceId',
  reminderType: 'reminderType',
  message: 'message',
  sendDate: 'sendDate',
  sentAt: 'sentAt',
  isSent: 'isSent',
  isRead: 'isRead',
  readAt: 'readAt',
  createdAt: 'createdAt'
};

exports.Prisma.TenantLedgerScalarFieldEnum = {
  id: 'id',
  ledgerNumber: 'ledgerNumber',
  tenantId: 'tenantId',
  entryDate: 'entryDate',
  entryType: 'entryType',
  description: 'description',
  amount: 'amount',
  balance: 'balance',
  referenceId: 'referenceId',
  referenceType: 'referenceType',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ReceiptScalarFieldEnum = {
  id: 'id',
  receiptNumber: 'receiptNumber',
  tenantId: 'tenantId',
  paymentId: 'paymentId',
  invoiceId: 'invoiceId',
  amount: 'amount',
  paymentMethod: 'paymentMethod',
  receiptDate: 'receiptDate',
  receiptUrl: 'receiptUrl',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AnnouncementScalarFieldEnum = {
  id: 'id',
  title: 'title',
  content: 'content',
  type: 'type',
  priority: 'priority',
  targetAudience: 'targetAudience',
  targetTenantIds: 'targetTenantIds',
  targetPropertyIds: 'targetPropertyIds',
  attachments: 'attachments',
  isActive: 'isActive',
  expiresAt: 'expiresAt',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RevenueSummaryScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  month: 'month',
  totalRevenue: 'totalRevenue',
  rentRevenue: 'rentRevenue',
  otherRevenue: 'otherRevenue',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExpenseSummaryScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  month: 'month',
  totalExpenses: 'totalExpenses',
  maintenanceExpenses: 'maintenanceExpenses',
  utilityExpenses: 'utilityExpenses',
  otherExpenses: 'otherExpenses',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.VoucherScalarFieldEnum = {
  id: 'id',
  voucherNumber: 'voucherNumber',
  type: 'type',
  date: 'date',
  postingDate: 'postingDate',
  paymentMethod: 'paymentMethod',
  accountId: 'accountId',
  expenseCategoryId: 'expenseCategoryId',
  description: 'description',
  referenceNumber: 'referenceNumber',
  amount: 'amount',
  status: 'status',
  attachments: 'attachments',
  preparedByUserId: 'preparedByUserId',
  approvedByUserId: 'approvedByUserId',
  postedByUserId: 'postedByUserId',
  postedAt: 'postedAt',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  dealId: 'dealId',
  propertyId: 'propertyId',
  unitId: 'unitId',
  payeeType: 'payeeType',
  payeeId: 'payeeId',
  reversedVoucherId: 'reversedVoucherId',
  reversedByUserId: 'reversedByUserId',
  reversedAt: 'reversedAt'
};

exports.Prisma.VoucherLineScalarFieldEnum = {
  id: 'id',
  voucherId: 'voucherId',
  accountId: 'accountId',
  debit: 'debit',
  credit: 'credit',
  description: 'description',
  propertyId: 'propertyId',
  unitId: 'unitId',
  entityAccountBindingId: 'entityAccountBindingId'
};

exports.Prisma.CommissionScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  saleId: 'saleId',
  rate: 'rate',
  amount: 'amount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  commissionType: 'commissionType',
  dealId: 'dealId',
  propertyId: 'propertyId',
  commissionBase: 'commissionBase',
  grossCommission: 'grossCommission',
  taxDeduction: 'taxDeduction',
  netCommission: 'netCommission',
  status: 'status',
  milestoneInstallmentId: 'milestoneInstallmentId'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  parentId: 'parentId',
  isPostable: 'isPostable',
  cashFlowCategory: 'cashFlowCategory',
  level: 'level',
  accountType: 'accountType',
  normalBalance: 'normalBalance',
  trustFlag: 'trustFlag'
};

exports.Prisma.JournalEntryScalarFieldEnum = {
  id: 'id',
  voucherNo: 'voucherNo',
  date: 'date',
  description: 'description',
  narration: 'narration',
  status: 'status',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  entryNumber: 'entryNumber',
  attachments: 'attachments',
  preparedByUserId: 'preparedByUserId',
  approvedByUserId: 'approvedByUserId'
};

exports.Prisma.JournalLineScalarFieldEnum = {
  id: 'id',
  entryId: 'entryId',
  accountId: 'accountId',
  debit: 'debit',
  credit: 'credit',
  description: 'description',
  constructionProjectId: 'constructionProjectId',
  costCodeId: 'costCodeId',
  sourceModule: 'sourceModule',
  referenceDocumentId: 'referenceDocumentId',
  approvalMetadata: 'approvalMetadata'
};

exports.Prisma.LedgerEntryScalarFieldEnum = {
  id: 'id',
  dealId: 'dealId',
  paymentId: 'paymentId',
  accountDebit: 'accountDebit',
  accountCredit: 'accountCredit',
  amount: 'amount',
  remarks: 'remarks',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  deletedAt: 'deletedAt',
  deletedBy: 'deletedBy',
  debitAccountId: 'debitAccountId',
  creditAccountId: 'creditAccountId'
};

exports.Prisma.PropertyExpenseScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  category: 'category',
  amount: 'amount',
  date: 'date',
  description: 'description',
  attachments: 'attachments',
  financeLedgerId: 'financeLedgerId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.TenancyScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  tenantId: 'tenantId',
  leaseId: 'leaseId',
  leaseStart: 'leaseStart',
  leaseEnd: 'leaseEnd',
  monthlyRent: 'monthlyRent',
  nextInvoiceDate: 'nextInvoiceDate',
  status: 'status',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MaintenanceRequestScalarFieldEnum = {
  id: 'id',
  propertyId: 'propertyId',
  tenantId: 'tenantId',
  unitId: 'unitId',
  issueTitle: 'issueTitle',
  issueDescription: 'issueDescription',
  priority: 'priority',
  status: 'status',
  assignedTo: 'assignedTo',
  assignedToName: 'assignedToName',
  attachments: 'attachments',
  estimatedCost: 'estimatedCost',
  actualCost: 'actualCost',
  completedAt: 'completedAt',
  financeLedgerId: 'financeLedgerId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  updatedBy: 'updatedBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinanceLedgerScalarFieldEnum = {
  id: 'id',
  referenceType: 'referenceType',
  referenceId: 'referenceId',
  category: 'category',
  amount: 'amount',
  date: 'date',
  notes: 'notes',
  description: 'description',
  propertyId: 'propertyId',
  tenantId: 'tenantId',
  dealId: 'dealId',
  payrollId: 'payrollId',
  invoiceId: 'invoiceId',
  paymentId: 'paymentId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AttachmentScalarFieldEnum = {
  id: 'id',
  fileName: 'fileName',
  fileUrl: 'fileUrl',
  fileType: 'fileType',
  fileSize: 'fileSize',
  entityType: 'entityType',
  entityId: 'entityId',
  propertyId: 'propertyId',
  tenantId: 'tenantId',
  uploadedBy: 'uploadedBy',
  description: 'description',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DropdownCategoryScalarFieldEnum = {
  id: 'id',
  key: 'key',
  name: 'name',
  description: 'description',
  metadata: 'metadata',
  isActive: 'isActive',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DropdownOptionScalarFieldEnum = {
  id: 'id',
  categoryId: 'categoryId',
  value: 'value',
  label: 'label',
  sortOrder: 'sortOrder',
  metadata: 'metadata',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AmenityScalarFieldEnum = {
  id: 'id',
  name: 'name',
  description: 'description',
  icon: 'icon',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.DealerPaymentScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  amount: 'amount',
  paidAt: 'paidAt',
  ledgerEntryId: 'ledgerEntryId',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentPlanScalarFieldEnum = {
  id: 'id',
  dealId: 'dealId',
  clientId: 'clientId',
  numberOfInstallments: 'numberOfInstallments',
  totalAmount: 'totalAmount',
  startDate: 'startDate',
  notes: 'notes',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  totalExpected: 'totalExpected',
  totalPaid: 'totalPaid',
  remaining: 'remaining',
  status: 'status',
  downPayment: 'downPayment',
  installmentType: 'installmentType'
};

exports.Prisma.DealInstallmentScalarFieldEnum = {
  id: 'id',
  paymentPlanId: 'paymentPlanId',
  dealId: 'dealId',
  clientId: 'clientId',
  installmentNumber: 'installmentNumber',
  amount: 'amount',
  dueDate: 'dueDate',
  paidDate: 'paidDate',
  status: 'status',
  paidAmount: 'paidAmount',
  paymentMode: 'paymentMode',
  notes: 'notes',
  ledgerEntryId: 'ledgerEntryId',
  isDeleted: 'isDeleted',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  remaining: 'remaining',
  type: 'type',
  penalty: 'penalty'
};

exports.Prisma.DealerLedgerScalarFieldEnum = {
  id: 'id',
  dealerId: 'dealerId',
  dealId: 'dealId',
  clientId: 'clientId',
  entryType: 'entryType',
  amount: 'amount',
  balance: 'balance',
  description: 'description',
  referenceId: 'referenceId',
  referenceType: 'referenceType',
  ledgerEntryId: 'ledgerEntryId',
  date: 'date',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountAliasScalarFieldEnum = {
  id: 'id',
  alias: 'alias',
  accountId: 'accountId',
  createdAt: 'createdAt'
};

exports.Prisma.AuditLogScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  action: 'action',
  userId: 'userId',
  userName: 'userName',
  userRole: 'userRole',
  oldValues: 'oldValues',
  newValues: 'newValues',
  changes: 'changes',
  ipAddress: 'ipAddress',
  userAgent: 'userAgent',
  description: 'description',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.DealReceiptScalarFieldEnum = {
  id: 'id',
  receiptNo: 'receiptNo',
  dealId: 'dealId',
  clientId: 'clientId',
  amount: 'amount',
  method: 'method',
  date: 'date',
  notes: 'notes',
  receivedBy: 'receivedBy',
  pdfUrl: 'pdfUrl',
  journalEntryId: 'journalEntryId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  manualUniqueId: 'manualUniqueId',
  referenceNumber: 'referenceNumber'
};

exports.Prisma.DealReceiptAllocationScalarFieldEnum = {
  id: 'id',
  receiptId: 'receiptId',
  installmentId: 'installmentId',
  amountAllocated: 'amountAllocated',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.PaymentAllocationScalarFieldEnum = {
  id: 'id',
  paymentId: 'paymentId',
  allocationType: 'allocationType',
  installmentId: 'installmentId',
  allocatedAmount: 'allocatedAmount',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.RefreshTokenScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  token: 'token',
  deviceId: 'deviceId',
  expiresAt: 'expiresAt',
  revoked: 'revoked',
  revokedAt: 'revokedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CsrfTokenScalarFieldEnum = {
  id: 'id',
  token: 'token',
  sessionId: 'sessionId',
  deviceId: 'deviceId',
  userId: 'userId',
  expiresAt: 'expiresAt',
  createdAt: 'createdAt'
};

exports.Prisma.DeletedRecordScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  entityName: 'entityName',
  entityData: 'entityData',
  deletedBy: 'deletedBy',
  deletedByName: 'deletedByName',
  deletedAt: 'deletedAt',
  expiresAt: 'expiresAt'
};

exports.Prisma.SequenceScalarFieldEnum = {
  id: 'id',
  prefix: 'prefix',
  current: 'current',
  updatedAt: 'updatedAt'
};

exports.Prisma.EntityAccountBindingScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  accountId: 'accountId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  createdBy: 'createdBy'
};

exports.Prisma.EntityMetadataScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  notes: 'notes',
  references: 'references',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionProjectScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  propertyId: 'propertyId',
  status: 'status',
  accountingMode: 'accountingMode',
  costCodeMandatory: 'costCodeMandatory',
  budgetEnforcement: 'budgetEnforcement',
  startDate: 'startDate',
  endDate: 'endDate',
  budgetAmount: 'budgetAmount',
  actualCost: 'actualCost',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.CostCodeScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  level: 'level',
  parentId: 'parentId',
  description: 'description',
  isActive: 'isActive',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionDailyLogScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  logDate: 'logDate',
  weather: 'weather',
  siteActivities: 'siteActivities',
  laborHours: 'laborHours',
  equipmentHours: 'equipmentHours',
  notes: 'notes',
  attachments: 'attachments',
  status: 'status',
  submittedBy: 'submittedBy',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionCrewScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  description: 'description',
  crewLeadId: 'crewLeadId',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionLaborScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  costCodeId: 'costCodeId',
  crewId: 'crewId',
  employeeId: 'employeeId',
  workDate: 'workDate',
  hours: 'hours',
  rate: 'rate',
  amount: 'amount',
  description: 'description',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  journalEntryId: 'journalEntryId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionEquipmentScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  type: 'type',
  make: 'make',
  model: 'model',
  serialNumber: 'serialNumber',
  hourlyRate: 'hourlyRate',
  dailyRate: 'dailyRate',
  costingMethod: 'costingMethod',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionEquipmentUsageScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  costCodeId: 'costCodeId',
  equipmentId: 'equipmentId',
  usageDate: 'usageDate',
  hours: 'hours',
  days: 'days',
  amount: 'amount',
  description: 'description',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  journalEntryId: 'journalEntryId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionInventoryItemScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  category: 'category',
  unit: 'unit',
  unitPrice: 'unitPrice',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionWarehouseScalarFieldEnum = {
  id: 'id',
  code: 'code',
  name: 'name',
  location: 'location',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionStockBalanceScalarFieldEnum = {
  id: 'id',
  warehouseId: 'warehouseId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  lastUpdated: 'lastUpdated'
};

exports.Prisma.ConstructionGRNScalarFieldEnum = {
  id: 'id',
  grnNumber: 'grnNumber',
  warehouseId: 'warehouseId',
  projectId: 'projectId',
  supplierName: 'supplierName',
  receiptDate: 'receiptDate',
  status: 'status',
  notes: 'notes',
  attachments: 'attachments',
  postedBy: 'postedBy',
  postedAt: 'postedAt',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionGRNItemScalarFieldEnum = {
  id: 'id',
  grnId: 'grnId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalAmount: 'totalAmount'
};

exports.Prisma.ConstructionIssueScalarFieldEnum = {
  id: 'id',
  issueNumber: 'issueNumber',
  projectId: 'projectId',
  warehouseId: 'warehouseId',
  costCodeId: 'costCodeId',
  issueDate: 'issueDate',
  status: 'status',
  notes: 'notes',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  journalEntryId: 'journalEntryId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionIssueItemScalarFieldEnum = {
  id: 'id',
  issueId: 'issueId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalAmount: 'totalAmount'
};

exports.Prisma.ConstructionConsumptionScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  costCodeId: 'costCodeId',
  itemId: 'itemId',
  quantity: 'quantity',
  unitPrice: 'unitPrice',
  totalAmount: 'totalAmount',
  consumptionDate: 'consumptionDate',
  description: 'description',
  status: 'status',
  approvedBy: 'approvedBy',
  approvedAt: 'approvedAt',
  journalEntryId: 'journalEntryId',
  isDeleted: 'isDeleted',
  createdBy: 'createdBy',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionBudgetScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  costCodeId: 'costCodeId',
  budgetAmount: 'budgetAmount',
  description: 'description',
  fiscalYear: 'fiscalYear',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionMilestoneScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  milestoneNumber: 'milestoneNumber',
  name: 'name',
  description: 'description',
  targetDate: 'targetDate',
  completionDate: 'completionDate',
  billingPercentage: 'billingPercentage',
  billingAmount: 'billingAmount',
  status: 'status',
  invoiceId: 'invoiceId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ConstructionPostingRuleScalarFieldEnum = {
  id: 'id',
  eventType: 'eventType',
  debitAccountCode: 'debitAccountCode',
  creditAccountCode: 'creditAccountCode',
  description: 'description',
  isActive: 'isActive',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.ExportJobScalarFieldEnum = {
  id: 'id',
  module: 'module',
  tab: 'tab',
  userId: 'userId',
  status: 'status',
  format: 'format',
  scope: 'scope',
  customLimit: 'customLimit',
  filterJson: 'filterJson',
  columns: 'columns',
  dataShape: 'dataShape',
  rowCount: 'rowCount',
  error: 'error',
  fileUrl: 'fileUrl',
  fileName: 'fileName',
  createdAt: 'createdAt',
  startedAt: 'startedAt',
  completedAt: 'completedAt'
};

exports.Prisma.FilterPresetScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  module: 'module',
  tab: 'tab',
  name: 'name',
  filterJson: 'filterJson',
  isDefault: 'isDefault',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinancialOperationScalarFieldEnum = {
  id: 'id',
  operationType: 'operationType',
  status: 'status',
  reason: 'reason',
  amount: 'amount',
  partialAmount: 'partialAmount',
  requestedByUserId: 'requestedByUserId',
  approvedByUserId: 'approvedByUserId',
  approvedAt: 'approvedAt',
  postedByUserId: 'postedByUserId',
  postedAt: 'postedAt',
  voucherId: 'voucherId',
  dealId: 'dealId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.FinancialOperationLineScalarFieldEnum = {
  id: 'id',
  operationId: 'operationId',
  entityType: 'entityType',
  entityId: 'entityId',
  role: 'role',
  amount: 'amount',
  metadata: 'metadata',
  createdAt: 'createdAt'
};

exports.Prisma.FinancialOperationReferenceScalarFieldEnum = {
  id: 'id',
  operationId: 'operationId',
  refType: 'refType',
  refId: 'refId',
  role: 'role',
  createdAt: 'createdAt'
};

exports.Prisma.FinanceOperationLedgerEntryScalarFieldEnum = {
  id: 'id',
  entityType: 'entityType',
  entityId: 'entityId',
  accountId: 'accountId',
  amount: 'amount',
  side: 'side',
  sourceType: 'sourceType',
  operationId: 'operationId',
  voucherId: 'voucherId',
  paymentId: 'paymentId',
  description: 'description',
  date: 'date',
  createdAt: 'createdAt'
};

exports.Prisma.LedgerEngineEntryScalarFieldEnum = {
  id: 'id',
  transactionUuid: 'transactionUuid',
  entryDate: 'entryDate',
  accountId: 'accountId',
  entityType: 'entityType',
  entityId: 'entityId',
  debitAmount: 'debitAmount',
  creditAmount: 'creditAmount',
  narration: 'narration',
  sourceType: 'sourceType',
  status: 'status',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.JsonNullValueInput = {
  JsonNull: Prisma.JsonNull
};

exports.Prisma.NullableJsonNullValueInput = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.JsonNullValueFilter = {
  DbNull: Prisma.DbNull,
  JsonNull: Prisma.JsonNull,
  AnyNull: Prisma.AnyNull
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.FinancialOperationType = exports.$Enums.FinancialOperationType = {
  REFUND: 'REFUND',
  TRANSFER: 'TRANSFER',
  MERGE: 'MERGE'
};

exports.FinancialOperationStatus = exports.$Enums.FinancialOperationStatus = {
  REQUESTED: 'REQUESTED',
  APPROVED: 'APPROVED',
  POSTED: 'POSTED',
  REJECTED: 'REJECTED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Role: 'Role',
  RolePermission: 'RolePermission',
  PermissionAuditLog: 'PermissionAuditLog',
  ActionAuditLog: 'ActionAuditLog',
  RoleLifecycleAuditLog: 'RoleLifecycleAuditLog',
  RoleInviteLink: 'RoleInviteLink',
  DeviceApproval: 'DeviceApproval',
  Notification: 'Notification',
  Property: 'Property',
  Location: 'Location',
  PropertySubsidiary: 'PropertySubsidiary',
  SubsidiaryOption: 'SubsidiaryOption',
  Block: 'Block',
  Floor: 'Floor',
  Unit: 'Unit',
  Tenant: 'Tenant',
  Lease: 'Lease',
  Sale: 'Sale',
  SaleInstallment: 'SaleInstallment',
  Buyer: 'Buyer',
  Activity: 'Activity',
  Message: 'Message',
  Department: 'Department',
  Employee: 'Employee',
  Attendance: 'Attendance',
  AttendanceCorrection: 'AttendanceCorrection',
  Payroll: 'Payroll',
  PayrollAllowance: 'PayrollAllowance',
  PayrollDeduction: 'PayrollDeduction',
  PayrollPayment: 'PayrollPayment',
  SalaryHistory: 'SalaryHistory',
  LeaveRequest: 'LeaveRequest',
  LeaveBalance: 'LeaveBalance',
  PublicHoliday: 'PublicHoliday',
  Lead: 'Lead',
  LeadImportBatch: 'LeadImportBatch',
  LeadImportRow: 'LeadImportRow',
  Client: 'Client',
  ContactPerson: 'ContactPerson',
  Dealer: 'Dealer',
  DealerReview: 'DealerReview',
  Deal: 'Deal',
  DealAgent: 'DealAgent',
  DealProperty: 'DealProperty',
  StageHistory: 'StageHistory',
  Communication: 'Communication',
  CRMActivity: 'CRMActivity',
  TransactionCategory: 'TransactionCategory',
  Transaction: 'Transaction',
  Invoice: 'Invoice',
  Payment: 'Payment',
  TenantPayment: 'TenantPayment',
  MaintenanceTicket: 'MaintenanceTicket',
  MaintenanceActivity: 'MaintenanceActivity',
  NoticeToVacate: 'NoticeToVacate',
  RentReminder: 'RentReminder',
  TenantLedger: 'TenantLedger',
  Receipt: 'Receipt',
  Announcement: 'Announcement',
  RevenueSummary: 'RevenueSummary',
  ExpenseSummary: 'ExpenseSummary',
  Voucher: 'Voucher',
  VoucherLine: 'VoucherLine',
  Commission: 'Commission',
  Account: 'Account',
  JournalEntry: 'JournalEntry',
  JournalLine: 'JournalLine',
  LedgerEntry: 'LedgerEntry',
  PropertyExpense: 'PropertyExpense',
  Tenancy: 'Tenancy',
  MaintenanceRequest: 'MaintenanceRequest',
  FinanceLedger: 'FinanceLedger',
  Attachment: 'Attachment',
  DropdownCategory: 'DropdownCategory',
  DropdownOption: 'DropdownOption',
  Amenity: 'Amenity',
  DealerPayment: 'DealerPayment',
  PaymentPlan: 'PaymentPlan',
  DealInstallment: 'DealInstallment',
  DealerLedger: 'DealerLedger',
  AccountAlias: 'AccountAlias',
  AuditLog: 'AuditLog',
  DealReceipt: 'DealReceipt',
  DealReceiptAllocation: 'DealReceiptAllocation',
  PaymentAllocation: 'PaymentAllocation',
  RefreshToken: 'RefreshToken',
  CsrfToken: 'CsrfToken',
  DeletedRecord: 'DeletedRecord',
  Sequence: 'Sequence',
  EntityAccountBinding: 'EntityAccountBinding',
  EntityMetadata: 'EntityMetadata',
  ConstructionProject: 'ConstructionProject',
  CostCode: 'CostCode',
  ConstructionDailyLog: 'ConstructionDailyLog',
  ConstructionCrew: 'ConstructionCrew',
  ConstructionLabor: 'ConstructionLabor',
  ConstructionEquipment: 'ConstructionEquipment',
  ConstructionEquipmentUsage: 'ConstructionEquipmentUsage',
  ConstructionInventoryItem: 'ConstructionInventoryItem',
  ConstructionWarehouse: 'ConstructionWarehouse',
  ConstructionStockBalance: 'ConstructionStockBalance',
  ConstructionGRN: 'ConstructionGRN',
  ConstructionGRNItem: 'ConstructionGRNItem',
  ConstructionIssue: 'ConstructionIssue',
  ConstructionIssueItem: 'ConstructionIssueItem',
  ConstructionConsumption: 'ConstructionConsumption',
  ConstructionBudget: 'ConstructionBudget',
  ConstructionMilestone: 'ConstructionMilestone',
  ConstructionPostingRule: 'ConstructionPostingRule',
  ExportJob: 'ExportJob',
  FilterPreset: 'FilterPreset',
  FinancialOperation: 'FinancialOperation',
  FinancialOperationLine: 'FinancialOperationLine',
  FinancialOperationReference: 'FinancialOperationReference',
  FinanceOperationLedgerEntry: 'FinanceOperationLedgerEntry',
  LedgerEngineEntry: 'LedgerEngineEntry'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
