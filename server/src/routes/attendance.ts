import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = (express as any).Router();

// Get all attendance records
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date, employeeId, status } = req.query;

    const where: any = { isDeleted: false };

    if (date) {
      const startDate = new Date(date as string);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date as string);
      endDate.setHours(23, 59, 59, 999);
      where.date = { gte: startDate, lte: endDate };
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (status) {
      where.status = status;
    }

    const attendance = await prisma.attendance.findMany({
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
      orderBy: { date: 'desc' },
    });

    // Format attendance data for frontend
    // Return full timestamps for backend-driven timing calculations
    const formattedAttendance = attendance.map((record) => ({
      id: record.id,
      employee: record.employee.name,
      employeeId: record.employee.id, // Database UUID for matching
      employeeIdString: record.employee.employeeId, // Employee ID string like "EMP0001"
      tid: record.employee.tid, // Tracking ID
      department: record.employee.department,
      date: record.date,
      // Return full ISO timestamp strings for accurate time calculations
      checkIn: record.checkIn ? record.checkIn.toISOString() : null,
      checkOut: record.checkOut ? record.checkOut.toISOString() : null,
      // Also include formatted times for display convenience
      checkInFormatted: record.checkIn ? new Date(record.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
      checkOutFormatted: record.checkOut ? new Date(record.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : null,
      hours: record.hours || 0,
      status: record.status,
    }));

    res.json({
      success: true,
      data: formattedAttendance,
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get attendance by ID
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const attendance = await prisma.attendance.findUnique({
      where: { id },
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
    });

    if (!attendance || attendance.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    // Return attendance with full ISO timestamp strings for backend-driven timing
    res.json({
      success: true,
      data: {
        ...attendance,
        checkIn: attendance.checkIn ? attendance.checkIn.toISOString() : null,
        checkOut: attendance.checkOut ? attendance.checkOut.toISOString() : null,
        date: attendance.date.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Create attendance record
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId, date, checkIn, checkOut, status } = req.body;

    if (!employeeId || !date || !status) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
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

    // Check if attendance already exists for this date
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: attendanceDate, lte: endDate },
        isDeleted: false,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Attendance already exists for this date',
      });
    }

    // Calculate hours if checkIn and checkOut are provided
    let hours = null;
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    }

    const attendance = await prisma.attendance.create({
      data: {
        employeeId,
        date: attendanceDate,
        checkIn: checkIn ? new Date(checkIn) : null,
        checkOut: checkOut ? new Date(checkOut) : null,
        status,
        hours,
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

    // Return attendance with full ISO timestamp strings for backend-driven timing
    res.json({
      success: true,
      data: {
        ...attendance,
        checkIn: attendance.checkIn ? attendance.checkIn.toISOString() : null,
        checkOut: attendance.checkOut ? attendance.checkOut.toISOString() : null,
        date: attendance.date.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Create attendance error:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({
        success: false,
        error: 'Attendance already exists for this date',
      });
    }
    res.status(500).json({
      success: false,
      error: 'Failed to create attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Check-in
router.post('/checkin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required',
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

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Check if attendance already exists for today
    let attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lte: endOfDay },
        isDeleted: false,
      },
    });

    const now = new Date();
    const checkInTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0); // 9 AM
    const isLate = now > checkInTime;
    const status = isLate ? 'late' : 'present';

    // Prevent multiple check-ins without checkout
    if (attendance && attendance.checkIn && !attendance.checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in. Please check out before checking in again.',
      });
    }

    if (attendance) {
      // Update existing attendance (only if no checkIn or if checked out)
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkIn: now,
          checkOut: null, // Reset checkout if checking in again
          status: attendance.status === 'absent' ? status : attendance.status,
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
    } else {
      // Create new attendance with exact timestamp
      attendance = await prisma.attendance.create({
        data: {
          employeeId,
          date: today,
          checkIn: now, // Store exact timestamp
          checkOut: null,
          status,
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
    }

    // Return attendance with full ISO timestamp strings for backend-driven timing
    res.json({
      success: true,
      data: {
        ...attendance,
        checkIn: attendance.checkIn ? attendance.checkIn.toISOString() : null,
        checkOut: attendance.checkOut ? attendance.checkOut.toISOString() : null,
        date: attendance.date.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Check-out
router.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.body;

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required',
      });
    }

    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find today's attendance
    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lte: endOfDay },
        isDeleted: false,
      },
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'No attendance record found for today. Please check in first.',
      });
    }

    if (attendance.checkOut) {
      return res.status(400).json({
        success: false,
        error: 'Already checked out for today',
      });
    }

    const now = new Date();
    let hours = null;

    if (attendance.checkIn) {
      hours = (now.getTime() - new Date(attendance.checkIn).getTime()) / (1000 * 60 * 60);
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        hours,
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

    // Return with full ISO timestamp strings for backend-driven timing
    res.json({
      success: true,
      data: {
        ...updatedAttendance,
        checkIn: updatedAttendance.checkIn ? updatedAttendance.checkIn.toISOString() : null,
        checkOut: updatedAttendance.checkOut ? updatedAttendance.checkOut.toISOString() : null,
        date: updatedAttendance.date.toISOString(),
      },
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check out',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Update attendance
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, status } = req.body;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance || attendance.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    // Calculate hours if checkIn and checkOut are provided
    let hours = attendance.hours;
    if (checkIn && checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(checkOut);
      hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    } else if (attendance.checkIn && checkOut) {
      const checkInTime = new Date(attendance.checkIn);
      const checkOutTime = new Date(checkOut);
      hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    } else if (checkIn && attendance.checkOut) {
      const checkInTime = new Date(checkIn);
      const checkOutTime = new Date(attendance.checkOut);
      hours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id },
      data: {
        ...(checkIn && { checkIn: new Date(checkIn) }),
        ...(checkOut && { checkOut: new Date(checkOut) }),
        ...(status && { status }),
        ...(hours !== null && { hours }),
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

    // Return with full ISO timestamp strings for backend-driven timing
    res.json({
      success: true,
      data: {
        ...updatedAttendance,
        checkIn: updatedAttendance.checkIn ? updatedAttendance.checkIn.toISOString() : null,
        checkOut: updatedAttendance.checkOut ? updatedAttendance.checkOut.toISOString() : null,
        date: updatedAttendance.date.toISOString(),
      },
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Delete attendance
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const attendance = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!attendance || attendance.isDeleted) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found',
      });
    }

    await prisma.attendance.update({
      where: { id },
      data: { isDeleted: true },
    });

    res.json({
      success: true,
      message: 'Attendance record deleted successfully',
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

