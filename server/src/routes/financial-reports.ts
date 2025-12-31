/**
 * Financial Reports Routes
 * Trial Balance, Balance Sheet, P&L, Property Profitability, Escrow Report, Aging Reports
 */

import express, { Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { FinancialReportingService } from '../services/financial-reporting-service';
import logger from '../utils/logger';
import { successResponse } from '../utils/error-handler';

const router = (express as any).Router();

/**
 * GET /api/financial-reports/trial-balance
 * Generate Trial Balance report
 */
router.get('/trial-balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const trialBalance = await FinancialReportingService.generateTrialBalance(start, end);

    const totals = trialBalance.reduce(
      (acc, entry) => ({
        totalDebits: acc.totalDebits + entry.debitTotal,
        totalCredits: acc.totalCredits + entry.creditTotal,
      }),
      { totalDebits: 0, totalCredits: 0 }
    );

    const isBalanced = Math.abs(totals.totalDebits - totals.totalCredits) < 0.01;

    if (!isBalanced) {
      return res.status(422).json({
        error: 'Trial balance mismatch: period closing blocked',
        details: {
          totals,
          period: { startDate: start, endDate: end },
        },
      });
    }

    return successResponse(res, {
      entries: trialBalance,
      totals,
      isBalanced,
      period: {
        startDate: start,
        endDate: end,
      },
    });
  } catch (error) {
    logger.error('Generate trial balance error:', error);
    res.status(500).json({
      error: 'Failed to generate trial balance',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/financial-reports/balance-sheet
 * Generate Balance Sheet report
 */
router.get('/balance-sheet', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { asOfDate } = req.query;

    const asOf = asOfDate ? new Date(asOfDate as string) : undefined;

    const balanceSheet = await FinancialReportingService.generateBalanceSheet(asOf);

    return successResponse(res, balanceSheet);
  } catch (error) {
    logger.error('Generate balance sheet error:', error);
    res.status(500).json({
      error: 'Failed to generate balance sheet',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/financial-reports/profit-loss
 * Generate Profit & Loss Statement
 */
router.get('/profit-loss', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: 'startDate and endDate are required',
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
      });
    }

    const profitLoss = await FinancialReportingService.generateProfitAndLoss(start, end);

    return successResponse(res, profitLoss);
  } catch (error) {
    logger.error('Generate profit & loss error:', error);
    res.status(500).json({
      error: 'Failed to generate profit & loss statement',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/financial-reports/property-profitability
 * Generate Property Profitability Report
 */
router.get('/property-profitability', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { propertyId, startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const profitability = await FinancialReportingService.generatePropertyProfitability(
      propertyId as string | undefined,
      start,
      end
    );

    return successResponse(res, profitability);
  } catch (error) {
    logger.error('Generate property profitability error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (typeof message === 'string' && message.startsWith('INVALID_PROPERTY_DIMENSION')) {
      const parts = message.split(':');
      const count = parts[1] ? Number(parts[1]) : undefined;
      return res.status(422).json({
        error: 'Invalid transactions: revenue/expense without property',
        details: { count },
      });
    }
    res.status(500).json({
      error: 'Failed to generate property profitability report',
      message,
    });
  }
});

/**
 * GET /api/financial-reports/escrow
 * Generate Escrow Report
 */
router.get('/escrow', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const escrowReport = await FinancialReportingService.generateEscrowReport();

    return successResponse(res, escrowReport);
  } catch (error) {
    logger.error('Generate escrow report error:', error);
    res.status(500).json({
      error: 'Failed to generate escrow report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/financial-reports/aging
 * Generate Aging Report for Receivables or Payables
 */
router.get('/aging', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { type, asOfDate } = req.query;

    if (!type || (type !== 'Receivable' && type !== 'Payable')) {
      return res.status(400).json({
        error: 'type parameter is required and must be "Receivable" or "Payable"',
      });
    }

    const asOf = asOfDate ? new Date(asOfDate as string) : undefined;

    const agingReport = await FinancialReportingService.generateAgingReport(
      type as 'Receivable' | 'Payable',
      asOf
    );

    const totals = agingReport.reduce(
      (acc, entry) => ({
        current: acc.current + entry.current,
        days31_60: acc.days31_60 + entry.days31_60,
        days61_90: acc.days61_90 + entry.days61_90,
        days91_plus: acc.days91_plus + entry.days91_plus,
        total: acc.total + entry.total,
      }),
      { current: 0, days31_60: 0, days61_90: 0, days91_plus: 0, total: 0 }
    );

    return successResponse(res, {
      type,
      entries: agingReport,
      totals,
      asOfDate: asOf || new Date(),
    });
  } catch (error) {
    logger.error('Generate aging report error:', error);
    res.status(500).json({
      error: 'Failed to generate aging report',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;

