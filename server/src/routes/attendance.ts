import * as express from 'express';
import { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = (express as any).Router();

// Get attendance stats for today
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: today, lte: endOfDay },
        isDeleted: false,
      },
      select: {
        status: true,
      },
    });

    const stats = {
      present: 0,
      late: 0,
      absent: 0, // This is tricky as absent records might not exist yet. We might need to count total employees - (present + late + on_leave)
      onLeave: 0,
    };

    attendanceRecords.forEach((record) => {
      const status = record.status.toLowerCase();
      if (status === 'present') stats.present++;
      else if (status === 'late') stats.late++;
      else if (status === 'on leave' || status === 'leave') stats.onLeave++;
      else if (status === 'absent') stats.absent++;
    });

    // To calculate 'Absent' correctly, we should check total active employees.
    // However, for now, let's just count explicitly marked 'absent' records 
    // OR we can fetch total employees count and subtract.
    // The requirement says "Automatically calculate... based on today's attendance records."
    // If 'Absent' is not a record, it won't be in 'attendanceRecords'.
    // But usually in HR systems, 'Absent' is either explicitly marked or implied.
    // Let's also fetch total active employees to infer absent if needed, 
    // but the user requirement "based on today’s attendance records" suggests we might just count what's there 
    // OR we should be smart.
    // Let's stick to counting records for now, but maybe add a query for total employees if we want to show "Not Marked".
    // For "Absent", if the system auto-creates absent records (cron job), then it's in the table.
    // If not, "Absent" might just be Total Employees - (Present + Late + On Leave).
    // Let's count explicitly.

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get all attendance records
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { date, startDate, endDate, employeeId, status } = req.query;

    const where: any = { isDeleted: false };

    if (date) {
      const dayStart = new Date(date as string);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date as string);
      dayEnd.setHours(23, 59, 59, 999);
      where.date = { gte: dayStart, lte: dayEnd };
    } else if (startDate && endDate) {
      const start = new Date(startDate as string);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      where.date = { gte: start, lte: end };
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

    // Determine checkIn time if not provided but status implies presence
    let finalCheckIn = checkIn ? new Date(checkIn) : null;
    if (!finalCheckIn && ['present', 'late', 'half-day'].includes(status)) {
        // Only default to now if the date is today
        const recordDate = new Date(date);
        const today = new Date();
        if (recordDate.toDateString() === today.toDateString()) {
            finalCheckIn = new Date();
        }
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
        checkIn: finalCheckIn,
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
    // Company timing rule: Check-in before 9:00 AM is present, after is late
    const companyStartTime = new Date(now);
    companyStartTime.setHours(9, 0, 0, 0); // 9:00 AM
    const status = now <= companyStartTime ? 'present' : 'late';

    if (attendance) {
      // Prevent multiple check-ins if already checked out (Strict Mode)
      if (attendance.checkIn && attendance.checkOut) {
        return res.status(400).json({
          success: false,
          error: 'Attendance already completed for today. Multiple check-ins are not allowed.',
        });
      }

      // Prevent check-in if already checked in
      if (attendance.checkIn) {
        return res.status(400).json({
          success: false,
          error: 'Already checked in. Please check out before checking in again.',
        });
      }

      // Update existing attendance (only if no checkIn, e.g., was marked absent)
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          checkIn: now,
          status: status, // Update status based on arrival time
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
      try {
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
      } catch (error: any) {
        // Handle Race Condition (P2002: Unique constraint failed)
        if (error.code === 'P2002') {
          // Record was created by another request in the meantime
          attendance = await prisma.attendance.findFirst({
             where: {
                employeeId,
                date: { gte: today, lte: endOfDay },
             },
             include: {
                employee: {
                   select: { id: true, employeeId: true, name: true, department: true }
                }
             }
          });

          if (attendance) {
             if (attendance.checkIn) {
                return res.status(400).json({
                   success: false,
                   error: 'Already checked in. Please check out before checking in again.',
                });
             }
             // If it exists but no checkIn (unlikely in race condition unless it was absent record), update it
             attendance = await prisma.attendance.update({
                where: { id: attendance.id },
                data: { checkIn: now, status },
                include: { employee: { select: { id: true, employeeId: true, name: true, department: true } } }
             });
          } else {
             throw error; // Should not happen if P2002 occurred
          }
        } else {
          throw error;
        }
      }
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
    let totalWorkDuration = null;

    if (attendance.checkIn) {
      const checkInTime = new Date(attendance.checkIn);
      const durationMs = now.getTime() - checkInTime.getTime();
      hours = durationMs / (1000 * 60 * 60);

      // Calculate HH:MM:SS format
      const totalSeconds = Math.floor(durationMs / 1000);
      const hours_part = Math.floor(totalSeconds / 3600);
      const minutes_part = Math.floor((totalSeconds % 3600) / 60);
      const seconds_part = totalSeconds % 60;
      totalWorkDuration = `${String(hours_part).padStart(2, '0')}:${String(minutes_part).padStart(2, '0')}:${String(seconds_part).padStart(2, '0')}`;
    }

    const updatedAttendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOut: now,
        hours,
        totalWorkDuration,
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

// Get today's attendance for specific employee
router.get('/today', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId || typeof employeeId !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Employee ID is required',
      });
    }

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: { gte: today, lte: endOfDay },
        isDeleted: false,
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

    if (!attendance) {
      return res.json({
        success: true,
        data: null,
      });
    }

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
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch today\'s attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Get attendance history for specific employee
router.get('/employee/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, limit = '30' } = req.query;

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found',
      });
    }

    const where: any = {
      employeeId: id,
      isDeleted: false,
    };

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      };
    }

    const attendance = await prisma.attendance.findMany({
      where,
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
      orderBy: { date: 'desc' },
      take: parseInt(limit as string),
    });

    const formattedAttendance = attendance.map((record) => ({
      id: record.id,
      date: record.date.toISOString().split('T')[0],
      checkIn: record.checkIn ? record.checkIn.toISOString() : null,
      checkOut: record.checkOut ? record.checkOut.toISOString() : null,
      totalWorkDuration: record.totalWorkDuration,
      status: record.status,
      employee: record.employee,
    }));

    res.json({
      success: true,
      data: formattedAttendance,
    });
  } catch (error) {
    console.error('Get employee attendance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee attendance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

