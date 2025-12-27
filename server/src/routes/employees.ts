import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

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

// Create employee
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
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

    if (!name || !email || !position || !department || !salary || !joinDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, email, position, department, salary, and joinDate are required',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
    }

    // Generate employee ID - find the highest existing number
    const lastEmployee = await prisma.employee.findFirst({
      where: {
        employeeId: {
          startsWith: 'EMP',
        },
      },
      orderBy: {
        employeeId: 'desc',
      },
    });

    let employeeId = 'EMP0001';
    if (lastEmployee) {
      const lastNumber = parseInt(lastEmployee.employeeId.replace('EMP', ''));
      employeeId = `EMP${String(lastNumber + 1).padStart(4, '0')}`;
    }

    // Calculate probation end date if probation period is provided
    let probationEndDate = null;
    if (probationPeriod) {
      const join = new Date(joinDate);
      join.setDate(join.getDate() + parseInt(probationPeriod));
      probationEndDate = join;
    }

    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name,
        email,
        phone: phone || null,
        position,
        department,
        departmentCode: departmentCode || null,
        role: role || null,
        employeeType: employeeType || 'full-time',
        status: status || 'active',
        salary: parseFloat(salary),
        basicSalary: basicSalary ? parseFloat(basicSalary) : null,
        joinDate: new Date(joinDate),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        gender: gender || null,
        maritalStatus: maritalStatus || null,
        nationality: nationality || null,
        bloodGroup: bloodGroup || null,
        cnic: cnic || null,
        cnicDocumentUrl: cnicDocumentUrl || null,
        profilePhotoUrl: profilePhotoUrl || null,
        address: address || null,
        city: city || null,
        country: country || null,
        postalCode: postalCode || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
        emergencyContactRelation: emergencyContactRelation || null,
        bankAccountNumber: bankAccountNumber || null,
        bankName: bankName || null,
        bankBranch: bankBranch || null,
        iban: iban || null,
        insuranceEligible: insuranceEligible || false,
        benefitsEligible: benefitsEligible !== undefined ? benefitsEligible : true,
        probationPeriod: probationPeriod ? parseInt(probationPeriod) : null,
        probationEndDate,
        reportingManagerId: reportingManagerId || null,
        workLocation: workLocation || null,
        shiftTimings: shiftTimings || null,
        education: education || null,
        experience: experience || null,
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

