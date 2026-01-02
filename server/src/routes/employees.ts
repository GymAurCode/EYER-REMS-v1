import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { generateSequenceNumber, generateSystemId } from '../services/id-generation-service';
import { z } from 'zod';

const router = (express as any).Router();

// Get all employees
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const employees = await prisma.employee.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get employee by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        attendance: {
          where: { isDeleted: false },
          orderBy: { date: 'desc' },
          take: 10,
        },
        payroll: {
          where: { isDeleted: false },
          orderBy: { month: 'desc' },
          take: 12,
        },
        leaveRequests: {
          where: { isDeleted: false },
          orderBy: { startDate: 'desc' },
          take: 10,
        },
      },
    });

    if (!employee || employee.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create employee schema
const employeeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional().nullable(),
  position: z.string().min(1, "Position is required"),
  department: z.string().min(1, "Department is required"),
  departmentCode: z.string().optional().nullable(),
  role: z.string().optional().nullable(),
  employeeType: z.string().default('full-time'),
  status: z.string().default('active'),
  salary: z.union([z.string(), z.number()]).transform((val) => Number(val)),
  basicSalary: z.union([z.string(), z.number()]).optional().nullable().transform((val) => val ? Number(val) : null),
  joinDate: z.string().optional().nullable().transform((val) => val ? new Date(val) : undefined), // Will be auto-set on backend if missing
  dateOfBirth: z.string().optional().nullable().transform((val) => val ? new Date(val) : null),
  gender: z.string().optional().nullable(),
  maritalStatus: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  cnic: z.string().optional().nullable(),
  cnicDocumentUrl: z.string().optional().nullable(),
  profilePhotoUrl: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postalCode: z.string().optional().nullable(),
  emergencyContactName: z.string().optional().nullable(),
  emergencyContactPhone: z.string().optional().nullable(),
  emergencyContactRelation: z.string().optional().nullable(),
  bankAccountNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankBranch: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  insuranceEligible: z.boolean().default(false),
  benefitsEligible: z.boolean().default(true),
  probationPeriod: z.union([z.string(), z.number()]).optional().nullable().transform((val) => val ? Number(val) : null),
  reportingManagerId: z.string().optional().nullable(),
  workLocation: z.string().optional().nullable(),
  shiftTimings: z.string().optional().nullable(),
  education: z.any().optional().nullable(),
  experience: z.any().optional().nullable(),
});

// Create employee
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Validate request body
    const validation = employeeSchema.safeParse(req.body);

    if (!validation.success) {
      const formattedErrors = validation.error.errors.map((err) => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: formattedErrors,
      });
    }

    const data = validation.data;

    // Generate employee ID using atomic sequence
    // Format: EMP0001
    const empSeq = await generateSequenceNumber('EMP');
    const employeeId = `EMP${empSeq.toString().padStart(4, '0')}`;

    // Generate TID on backend (never trust frontend for TID)
    const tid = await generateSystemId('emp');

    // Auto-set joinDate if missing (use Prisma default)
    const joinDate = data.joinDate || new Date();

    // Calculate probation end date if probation period is provided
    let probationEndDate = null;
    if (data.probationPeriod) {
      const join = new Date(joinDate);
      join.setDate(join.getDate() + data.probationPeriod);
      probationEndDate = join;
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        tid,
        name: data.name,
        email: data.email,
        phone: data.phone,
        position: data.position,
        department: data.department,
        departmentCode: data.departmentCode,
        role: data.role,
        employeeType: data.employeeType,
        status: data.status,
        salary: data.salary,
        basicSalary: data.basicSalary,
        joinDate: joinDate,
        dateOfBirth: data.dateOfBirth,
        gender: data.gender,
        maritalStatus: data.maritalStatus,
        nationality: data.nationality,
        bloodGroup: data.bloodGroup,
        cnic: data.cnic,
        cnicDocumentUrl: data.cnicDocumentUrl,
        profilePhotoUrl: data.profilePhotoUrl,
        address: data.address,
        city: data.city,
        country: data.country,
        postalCode: data.postalCode,
        emergencyContactName: data.emergencyContactName,
        emergencyContactPhone: data.emergencyContactPhone,
        emergencyContactRelation: data.emergencyContactRelation,
        bankAccountNumber: data.bankAccountNumber,
        bankName: data.bankName,
        bankBranch: data.bankBranch,
        iban: data.iban,
        insuranceEligible: data.insuranceEligible,
        benefitsEligible: data.benefitsEligible,
        probationPeriod: data.probationPeriod,
        probationEndDate,
        reportingManagerId: data.reportingManagerId,
        workLocation: data.workLocation,
        shiftTimings: data.shiftTimings,
        education: data.education,
        experience: data.experience,
      },
    });

    res.json({
      success: true,
      data: employee,
    });
  } catch (error: any) {
    console.error('Create employee error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Employee with this email or employee ID already exists',
        details: [{ path: 'email', message: 'Email already exists' }]
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint failed',
        details: [{ path: 'unknown', message: 'Check department code or reporting manager ID' }]
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create employee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update employee
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name, email, phone, position, department, departmentCode, role, employeeType, status,
      salary, basicSalary, joinDate, dateOfBirth, gender, maritalStatus, nationality, bloodGroup,
      cnic, cnicDocumentUrl, profilePhotoUrl, address, city, country, postalCode,
      emergencyContactName, emergencyContactPhone, emergencyContactRelation,
      bankAccountNumber, bankName, bankBranch, iban,
      insuranceEligible, benefitsEligible,
      probationPeriod, reportingManagerId, workLocation, shiftTimings,
      education, experience
    } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || employee.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format',
        });
      }
    }

    // Calculate probation end date if probation period is provided
    let probationEndDate = employee.probationEndDate;
    if (probationPeriod !== undefined) {
      const join = joinDate ? new Date(joinDate) : employee.joinDate;
      if (probationPeriod) {
        const endDate = new Date(join);
        endDate.setDate(endDate.getDate() + parseInt(probationPeriod));
        probationEndDate = endDate;
      } else {
        probationEndDate = null;
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone || null;
    if (position !== undefined) updateData.position = position;
    if (department !== undefined) updateData.department = department;
    if (departmentCode !== undefined) updateData.departmentCode = departmentCode || null;
    if (role !== undefined) updateData.role = role || null;
    if (employeeType !== undefined) updateData.employeeType = employeeType;
    if (status !== undefined) updateData.status = status;
    if (salary !== undefined) updateData.salary = parseFloat(salary);
    if (basicSalary !== undefined) updateData.basicSalary = basicSalary ? parseFloat(basicSalary) : null;
    if (joinDate !== undefined) updateData.joinDate = new Date(joinDate);
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
    if (gender !== undefined) updateData.gender = gender || null;
    if (maritalStatus !== undefined) updateData.maritalStatus = maritalStatus || null;
    if (nationality !== undefined) updateData.nationality = nationality || null;
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup || null;
    if (cnic !== undefined) updateData.cnic = cnic || null;
    if (cnicDocumentUrl !== undefined) updateData.cnicDocumentUrl = cnicDocumentUrl || null;
    if (profilePhotoUrl !== undefined) updateData.profilePhotoUrl = profilePhotoUrl || null;
    if (address !== undefined) updateData.address = address || null;
    if (city !== undefined) updateData.city = city || null;
    if (country !== undefined) updateData.country = country || null;
    if (postalCode !== undefined) updateData.postalCode = postalCode || null;
    if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName || null;
    if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone || null;
    if (emergencyContactRelation !== undefined) updateData.emergencyContactRelation = emergencyContactRelation || null;
    if (bankAccountNumber !== undefined) updateData.bankAccountNumber = bankAccountNumber || null;
    if (bankName !== undefined) updateData.bankName = bankName || null;
    if (bankBranch !== undefined) updateData.bankBranch = bankBranch || null;
    if (iban !== undefined) updateData.iban = iban || null;
    if (insuranceEligible !== undefined) updateData.insuranceEligible = insuranceEligible;
    if (benefitsEligible !== undefined) updateData.benefitsEligible = benefitsEligible;
    if (probationPeriod !== undefined) updateData.probationPeriod = probationPeriod ? parseInt(probationPeriod) : null;
    if (probationEndDate !== undefined) updateData.probationEndDate = probationEndDate;
    if (reportingManagerId !== undefined) updateData.reportingManagerId = reportingManagerId || null;
    if (workLocation !== undefined) updateData.workLocation = workLocation || null;
    if (shiftTimings !== undefined) updateData.shiftTimings = shiftTimings || null;
    if (education !== undefined) updateData.education = education || null;
    if (experience !== undefined) updateData.experience = experience || null;

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: updatedEmployee,
    });
  } catch (error: any) {
    console.error('Update employee error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Employee with this email already exists',
      });
    }
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        error: 'Foreign key constraint failed. Please check if the department code or reporting manager ID exists.',
        details: error.meta
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to update employee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete employee
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee || employee.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    await prisma.employee.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: 'Employee deleted successfully',
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get HR alerts (attendance issues)
router.get('/alerts/attendance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { days } = req.query;
    const { getAttendanceAlerts } = await import('../services/hr-alerts');
    const alerts = await getAttendanceAlerts(days ? parseInt(days as string) : 7);
    res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    console.error('Get attendance alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance alerts',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

