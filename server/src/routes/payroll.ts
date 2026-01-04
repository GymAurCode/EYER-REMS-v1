import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { syncPayrollToFinanceLedger } from '../services/workflows';

const router = (express as any).Router();

// Get all payroll records
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { month, employeeId, status } = req.query;

    const where: any = { isDeleted: false };

    if (month) {
      where.month = month;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const payroll = await prisma.payroll.findMany({
      where,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            tid: true,
            name: true,
            department: true,
            email: true,
          },
        },
      },
      orderBy: { month: 'desc' },
    });

    // Format payroll data for frontend with calculated payment info
    const formattedPayroll = await Promise.all(
      payroll.map(async (record) => {
        // Calculate paid amount from payments
        const payments = await prisma.payrollPayment.findMany({
          where: { payrollId: record.id },
        });
        const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = Math.max(0, record.netPay - paidAmount);
        
        // Determine status dynamically
        let status = 'created';
        if (paidAmount === 0) {
          status = 'created';
        } else if (paidAmount >= record.netPay) {
          status = 'fully_paid';
        } else {
          status = 'partially_paid';
        }

        // Update payroll record if values changed
        if (record.paidAmount !== paidAmount || record.paymentStatus !== status) {
          await prisma.payroll.update({
            where: { id: record.id },
            data: {
              paidAmount,
              remainingBalance,
              paymentStatus: status,
            },
          });
        }

        return {
          id: record.id,
          employee: record.employee.name,
          employeeId: record.employee.employeeId,
          tid: record.employee.tid, // Tracking ID
          department: record.employee.department,
          month: record.month,
          baseSalary: record.baseSalary,
          bonus: record.bonus,
          deductions: record.deductions,
          netPay: record.netPay,
          paidAmount,
          remainingBalance,
          status,
        };
      })
    );

    res.json({
      success: true,
      data: formattedPayroll,
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get payroll by ID with full details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            tid: true,
            name: true,
            email: true,
            phone: true,
            department: true,
            position: true,
            salary: true,
          },
        },
        payrollAllowances: true,
        payrollDeductions: true,
        payments: {
          orderBy: { paymentDate: 'desc' },
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
      });
    }

    // Calculate paid amount and remaining balance dynamically
    const totalPaid = payroll.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const remainingBalance = Math.max(0, payroll.netPay - totalPaid);
    
    // Determine payment status
    let paymentStatus = 'created';
    if (totalPaid === 0) {
      paymentStatus = 'created';
    } else if (totalPaid >= payroll.netPay) {
      paymentStatus = 'fully_paid';
    } else {
      paymentStatus = 'partially_paid';
    }

    // Update payroll if status changed
    if (payroll.paymentStatus !== paymentStatus || payroll.paidAmount !== totalPaid) {
      await prisma.payroll.update({
        where: { id },
        data: {
          paidAmount: totalPaid,
          remainingBalance,
          paymentStatus,
        },
      });
    }

    // Get attendance data for the month
    const [year, monthNum] = payroll.month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0, 23, 59, 59);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        employeeId: payroll.employeeId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isDeleted: false,
      },
      orderBy: { date: 'asc' },
    });

    // Calculate attendance summary
    const attendanceSummary = {
      totalDays: attendanceRecords.length,
      presentDays: attendanceRecords.filter(a => a.status === 'present' || a.status === 'late').length,
      absentDays: attendanceRecords.filter(a => a.status === 'absent').length,
      leaveDays: attendanceRecords.filter(a => a.status === 'leave').length,
      totalHours: attendanceRecords.reduce((sum, a) => sum + (a.hours || 0), 0),
      overtimeHours: attendanceRecords.reduce((sum, a) => {
        const hours = a.hours || 0;
        return sum + Math.max(0, hours - 8); // Assuming 8 hours is standard
      }, 0),
    };

    // Get leave requests for the month
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: {
        employeeId: payroll.employeeId,
        startDate: {
          lte: endDate,
        },
        endDate: {
          gte: startDate,
        },
        isDeleted: false,
      },
      orderBy: { startDate: 'asc' },
    });

    // Calculate leave summary
    const leaveSummary = {
      totalRequests: leaveRequests.length,
      approvedDays: leaveRequests
        .filter(l => l.status === 'approved')
        .reduce((sum, l) => sum + (l.days || 0), 0),
      pendingDays: leaveRequests
        .filter(l => l.status === 'pending')
        .reduce((sum, l) => sum + (l.days || 0), 0),
      leaveRequests: leaveRequests.map(l => ({
        id: l.id,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        days: l.days,
        status: l.status,
      })),
    };

    res.json({
      success: true,
      data: {
        ...payroll,
        paidAmount: totalPaid,
        remainingBalance,
        paymentStatus,
        attendanceSummary,
        leaveSummary,
      },
    });
  } catch (error) {
    console.error('Get payroll error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create payroll record
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const {
      employeeId, month, baseSalary, basicSalary, bonus, overtimeAmount, overtimeHours,
      taxPercent, taxAmount, grossSalary, allowances, deductions, netPay,
      paymentMethod, paymentStatus, notes,
      allowancesList, deductionsList
    } = req.body;

    if (!employeeId || !month || !baseSalary) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, month, and baseSalary are required',
      });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee || employee.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    // Check if payroll already exists for this month
    const existingPayroll = await prisma.payroll.findFirst({
      where: {
        employeeId,
        month,
        isDeleted: false,
      },
    });

    if (existingPayroll) {
      return res.status(400).json({
        success: false,
        error: 'Payroll already exists for this month',
      });
    }

    // Calculate values if not provided
    const base = parseFloat(baseSalary);
    const basic = basicSalary ? parseFloat(basicSalary) : base;
    const bon = parseFloat(bonus) || 0;
    const overtime = parseFloat(overtimeAmount) || 0;
    const totalAllowances = parseFloat(allowances) || 0;
    const totalDeductions = parseFloat(deductions) || 0;
    const gross = grossSalary ? parseFloat(grossSalary) : (basic + totalAllowances + bon + overtime);
    const taxPct = parseFloat(taxPercent) || 0;
    const tax = taxAmount ? parseFloat(taxAmount) : (gross * taxPct / 100);
    const net = netPay ? parseFloat(netPay) : (gross - totalDeductions);

    // Create payroll record with initial payment tracking
    const payroll = await prisma.payroll.create({
      data: {
        employeeId,
        month,
        baseSalary: base,
        basicSalary: basic,
        grossSalary: gross,
        bonus: bon,
        overtimeAmount: overtime,
        allowances: totalAllowances,
        deductions: totalDeductions,
        taxAmount: tax,
        taxPercent: taxPct,
        netPay: net,
        paidAmount: 0,
        remainingBalance: net,
        paymentMethod: paymentMethod || null,
        paymentStatus: paymentStatus || 'created',
        notes: notes || null,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
    });

    // Create allowance records if provided
    if (Array.isArray(allowancesList) && allowancesList.length > 0) {
      await Promise.all(
        allowancesList.map((allowance: any) =>
          prisma.payrollAllowance.create({
            data: {
              payrollId: payroll.id,
              employeeId,
              type: allowance.type || 'other',
              amount: parseFloat(allowance.amount) || 0,
              description: allowance.description || null,
            },
          })
        )
      );
    }

    // Create deduction records if provided
    if (Array.isArray(deductionsList) && deductionsList.length > 0) {
      await Promise.all(
        deductionsList.map((deduction: any) =>
          prisma.payrollDeduction.create({
            data: {
              payrollId: payroll.id,
              employeeId,
              type: deduction.type || 'other',
              amount: parseFloat(deduction.amount) || 0,
              description: deduction.description || null,
            },
          })
        )
      );
    }

    // Fetch payroll with allowances and deductions
    const payrollWithDetails = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
        payrollAllowances: true,
        payrollDeductions: true,
      },
    });

    res.json({
      success: true,
      data: payrollWithDetails,
    });
  } catch (error: any) {
    console.error('Create payroll error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Payroll already exists for this month',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create payroll',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update payroll
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { 
      baseSalary, basicSalary, bonus, overtimeAmount, allowances, deductions, 
      taxPercent, taxAmount, grossSalary, netPay, paymentStatus, paymentDate, 
      paymentMethod, status 
    } = req.body;

    const oldPayroll = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!oldPayroll || oldPayroll.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
      });
    }

    // Calculate values if not provided
    const base = baseSalary !== undefined ? parseFloat(baseSalary) : oldPayroll.baseSalary;
    const basic = basicSalary !== undefined ? parseFloat(basicSalary) : (oldPayroll.basicSalary || base);
    const bon = bonus !== undefined ? parseFloat(bonus) : oldPayroll.bonus;
    const overtime = overtimeAmount !== undefined ? parseFloat(overtimeAmount) : oldPayroll.overtimeAmount;
    const totalAllowances = allowances !== undefined ? parseFloat(allowances) : oldPayroll.allowances;
    const totalDeductions = deductions !== undefined ? parseFloat(deductions) : oldPayroll.deductions;
    
    const gross = grossSalary !== undefined ? parseFloat(grossSalary) : (basic + totalAllowances + bon + overtime);
    const taxPct = taxPercent !== undefined ? parseFloat(taxPercent) : oldPayroll.taxPercent;
    const tax = taxAmount !== undefined ? parseFloat(taxAmount) : (gross * taxPct / 100);
    const net = netPay !== undefined ? parseFloat(netPay) : (gross - totalDeductions - tax);

    const newPaymentStatus = paymentStatus || oldPayroll.paymentStatus;
    const wasPaid = oldPayroll.paymentStatus === 'paid';
    const isNowPaid = newPaymentStatus === 'paid';

    const updatedPayroll = await prisma.payroll.update({
      where: { id },
      data: {
        ...(baseSalary !== undefined && { baseSalary: base }),
        ...(basicSalary !== undefined && { basicSalary: basic }),
        ...(bonus !== undefined && { bonus: bon }),
        ...(overtimeAmount !== undefined && { overtimeAmount: overtime }),
        ...(allowances !== undefined && { allowances: totalAllowances }),
        ...(deductions !== undefined && { deductions: totalDeductions }),
        ...(taxPercent !== undefined && { taxPercent: taxPct }),
        ...(taxAmount !== undefined && { taxAmount: tax }),
        ...(grossSalary !== undefined && { grossSalary: gross }),
        ...(netPay !== undefined && { netPay: net }),
        ...(paymentStatus && { paymentStatus: newPaymentStatus }),
        ...(paymentDate && { paymentDate: new Date(paymentDate) }),
        ...(paymentMethod && { paymentMethod }),
        ...(status && { status }),
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: true,
          },
        },
      },
    });

    // Auto-sync to Finance Ledger if payment status changed to 'paid'
    if (!wasPaid && isNowPaid) {
      try {
        await syncPayrollToFinanceLedger(id);
      } catch (syncError) {
        console.error('Failed to sync payroll to finance ledger:', syncError);
        // Don't fail the request, just log the error
      }
    }

    res.json({
      success: true,
      data: updatedPayroll,
      message: isNowPaid && !wasPaid ? 'Payroll marked as paid and synced to finance ledger' : 'Payroll updated successfully',
    });
  } catch (error) {
    console.error('Update payroll error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update payroll',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete payroll
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const payroll = await prisma.payroll.findUnique({
      where: { id },
    });

    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
      });
    }

    await prisma.payroll.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: 'Payroll record deleted successfully',
    });
  } catch (error) {
    console.error('Delete payroll error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete payroll',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get payroll reminders
router.get('/reminders', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { getPayrollReminders } = await import('../services/hr-alerts');
    const reminders = await getPayrollReminders();
    res.json({
      success: true,
      data: reminders,
    });
  } catch (error) {
    console.error('Get payroll reminders error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payroll reminders',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Calculate overtime from attendance
router.post('/calculate-overtime', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, month } = req.body;

    if (!employeeId || !month) {
      return res.status(400).json({
        success: false,
        error: 'employeeId and month are required',
      });
    }

    const { calculateMonthlyOvertime } = await import('../services/hr-alerts');
    const overtime = await calculateMonthlyOvertime(employeeId, month);

    res.json({
      success: true,
      data: overtime,
    });
  } catch (error) {
    console.error('Calculate overtime error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate overtime',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Record payment for payroll
router.post('/:id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, referenceNumber, transactionId, notes, paymentDate } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount is required and must be greater than 0',
      });
    }

    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        error: 'Payment method is required',
      });
    }

    // Get payroll record
    const payroll = await prisma.payroll.findUnique({
      where: { id },
      include: {
        payments: true,
      },
    });

    if (!payroll || payroll.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Payroll record not found',
      });
    }

    // Calculate current paid amount
    const currentPaid = payroll.payments.reduce((sum, p) => sum + p.amount, 0);
    const paymentAmount = parseFloat(amount);
    const newPaidAmount = currentPaid + paymentAmount;
    const remainingBalance = Math.max(0, payroll.netPay - newPaidAmount);

    // Validate payment doesn't exceed net pay
    if (newPaidAmount > payroll.netPay) {
      return res.status(400).json({
        success: false,
        error: `Payment amount exceeds remaining balance. Maximum payment: ${(payroll.netPay - currentPaid).toFixed(2)}`,
      });
    }

    // Determine new payment status
    let newPaymentStatus = 'created';
    if (newPaidAmount === 0) {
      newPaymentStatus = 'created';
    } else if (newPaidAmount >= payroll.netPay) {
      newPaymentStatus = 'fully_paid';
    } else {
      newPaymentStatus = 'partially_paid';
    }

    // Create payment record and update payroll in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payrollPayment.create({
        data: {
          payrollId: id,
          amount: paymentAmount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          transactionId: transactionId || null,
          notes: notes || null,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          createdByUserId: req.user?.id || null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      });

      // Update payroll
      const updatedPayroll = await tx.payroll.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          remainingBalance,
          paymentStatus: newPaymentStatus,
          paymentDate: newPaymentStatus === 'fully_paid' ? new Date() : payroll.paymentDate,
          paymentMethod: newPaymentStatus === 'fully_paid' ? paymentMethod : payroll.paymentMethod,
        },
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              tid: true,
              name: true,
              department: true,
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            include: {
              createdBy: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                },
              },
            },
          },
        },
      });

      return { payment, payroll: updatedPayroll };
    });

    res.json({
      success: true,
      data: result.payment,
      payroll: result.payroll,
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

