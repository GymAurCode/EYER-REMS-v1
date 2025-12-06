import express, { Response } from 'express';
import prisma from '../prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createActivity } from '../utils/activity';
import logger from '../utils/logger';
import { generateSystemId, validateManualUniqueId } from '../services/id-generation-service';

const router = (express as any).Router();

// Leads
router.get('/leads', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads' });
  }
});

router.post('/leads', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { manualUniqueId, ...leadData } = req.body;

    // Validate manual unique ID if provided
    if (manualUniqueId) {
      await validateManualUniqueId(manualUniqueId, 'lead');
    }

    // Generate system ID: lead-YY-####
    const leadCode = await generateSystemId('lead');
    
    const lead = await prisma.$transaction(async (tx) => {
      return await tx.lead.create({ 
        data: {
          ...leadData,
          leadCode,
          manualUniqueId: manualUniqueId?.trim() || null,
        }
      });
    });

    await createActivity({
      type: 'lead',
      action: 'created',
      entityId: lead.id,
      entityName: lead.name,
      message: `Lead "${lead.name}" was created`,
      userId: req.user?.id,
      metadata: {
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
      },
    });

    res.status(201).json(lead);
  } catch (error) {
    res.status(400).json({ error: 'Failed to create lead' });
  }
});

// Convert lead to client (must be before any /leads/:id routes to avoid route conflict)
router.post('/leads/:id/convert', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (lead.convertedToClientId) {
      return res.status(400).json({ error: 'Lead has already been converted to a client' });
    }

    // Generate system ID: cli-YY-####
    const clientCode = await generateSystemId('cli');

    // Get next srNo and clientNo
    const lastClient = await prisma.client.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const nextSrNo = lastClient?.srNo ? (lastClient.srNo + 1) : 1;
    const nextClientNo = `CL-${String(nextSrNo).padStart(4, '0')}`;

    // Create client from lead
    const client = await prisma.$transaction(async (tx) => {
      return await tx.client.create({
        data: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          clientCode,
          srNo: nextSrNo,
          clientNo: nextClientNo,
          address: lead.address,
          city: lead.city,
          country: lead.country,
          cnic: lead.cnic,
          propertyInterest: lead.interest,
          clientType: 'individual',
          clientCategory: 'regular',
          status: 'active',
          manualUniqueId: null, // Can be set later if needed
        },
      });
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: 'converted',
        convertedToClientId: client.id,
        convertedAt: new Date(),
      },
    });

    await createActivity({
      type: 'lead',
      action: 'updated',
      entityId: lead.id,
      entityName: lead.name,
      message: `Lead "${lead.name}" was converted to client`,
      userId: req.user?.id,
      metadata: {
        clientId: client.id,
        clientName: client.name,
        status: 'converted',
      },
    });

    await createActivity({
      type: 'client',
      action: 'created',
      entityId: client.id,
      entityName: client.name,
      message: `Client "${client.name}" was created from lead`,
      userId: req.user?.id,
      metadata: {
        leadId: lead.id,
        convertedFromLead: true,
        status: client.status,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Lead converted to client successfully',
      data: client,
    });
  } catch (error: any) {
    console.error('Convert lead to client error:', error);
    res.status(500).json({ 
      error: 'Failed to convert lead to client',
      message: error.message || 'Unknown error',
    });
  }
});

router.put('/leads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createActivity({
      type: 'lead',
      action: 'updated',
      entityId: lead.id,
      entityName: lead.name,
      message: `Lead "${lead.name}" was updated`,
      userId: req.user?.id,
      metadata: {
        status: lead.status,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
      },
    });

    res.json(lead);
  } catch {
    res.status(400).json({ error: 'Failed to update lead' });
  }
});

router.get('/leads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({ where: { id: req.params.id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json(lead);
  } catch {
    res.status(500).json({ error: 'Failed to fetch lead' });
  }
});

router.delete('/leads/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.delete({ where: { id: req.params.id } });

    await createActivity({
      type: 'lead',
      action: 'deleted',
      entityId: lead.id,
      entityName: lead.name,
      message: `Lead "${lead.name}" was deleted`,
      userId: req.user?.id,
      metadata: {
        status: lead.status,
        email: lead.email,
        phone: lead.phone,
        source: lead.source,
      },
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete lead' });
  }
});

// Clients
router.get('/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { clientCode: { contains: search as string, mode: 'insensitive' } },
        { manualUniqueId: { contains: search as string, mode: 'insensitive' } },
        { clientNo: { contains: search as string, mode: 'insensitive' } },
        { cnic: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(clients);
  } catch {
    res.status(500).json({ error: 'Failed to fetch clients' });
  }
});

router.get('/clients/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        deals: {
          orderBy: { createdAt: 'desc' },
          include: {
            dealer: true,
          },
        },
        communications: {
          orderBy: { createdAt: 'desc' },
          include: {
            lead: true,
          },
        },
      },
    });

    if (!client) return res.status(404).json({ error: 'Client not found' });
    res.json(client);
  } catch (error) {
    console.error('Failed to fetch client by id:', error);
    res.status(500).json({ error: 'Failed to fetch client' });
  }
});

router.post('/clients', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { manualUniqueId, ...clientData } = req.body;

    // Validate manual unique ID if provided
    if (manualUniqueId) {
      await validateManualUniqueId(manualUniqueId, 'cli');
    }

    // Generate system ID: cli-YY-####
    const clientCode = await generateSystemId('cli');
    
    // Get next srNo and clientNo
    const lastClient = await prisma.client.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    const nextSrNo = lastClient?.srNo ? (lastClient.srNo + 1) : 1;
    const nextClientNo = `CL-${String(nextSrNo).padStart(4, '0')}`;
    
    const client = await prisma.$transaction(async (tx) => {
      return await tx.client.create({ 
        data: {
          ...clientData,
          clientCode,
          manualUniqueId: manualUniqueId?.trim() || null,
          srNo: nextSrNo,
          clientNo: nextClientNo,
        }
      });
    });

    await createActivity({
      type: 'client',
      action: 'created',
      entityId: client.id,
      entityName: client.name,
      message: `Client "${client.name}" was added`,
      userId: req.user?.id,
      metadata: {
        status: client.status,
        email: client.email,
        phone: client.phone,
        company: client.company,
      },
    });

    res.status(201).json(client);
  } catch {
    res.status(400).json({ error: 'Failed to create client' });
  }
});

router.put('/clients/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createActivity({
      type: 'client',
      action: 'updated',
      entityId: client.id,
      entityName: client.name,
      message: `Client "${client.name}" was updated`,
      userId: req.user?.id,
      metadata: {
        status: client.status,
        email: client.email,
        phone: client.phone,
        company: client.company,
      },
    });

    res.json(client);
  } catch {
    res.status(400).json({ error: 'Failed to update client' });
  }
});

router.delete('/clients/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const client = await prisma.client.delete({ where: { id: req.params.id } });

    await createActivity({
      type: 'client',
      action: 'deleted',
      entityId: client.id,
      entityName: client.name,
      message: `Client "${client.name}" was deleted`,
      userId: req.user?.id,
      metadata: {
        status: client.status,
        email: client.email,
        phone: client.phone,
        company: client.company,
      },
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete client' });
  }
});

// Dealers
router.get('/dealers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { search } = req.query;
    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { dealerCode: { contains: search as string, mode: 'insensitive' } },
        { manualUniqueId: { contains: search as string, mode: 'insensitive' } },
        { cnic: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    const dealers = await prisma.dealer.findMany({ 
      where,
      orderBy: { createdAt: 'desc' } 
    });
    res.json(dealers);
  } catch {
    res.status(500).json({ error: 'Failed to fetch dealers' });
  }
});

router.get('/dealers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealer = await prisma.dealer.findUnique({ where: { id: req.params.id } });
    if (!dealer) return res.status(404).json({ error: 'Dealer not found' });
    res.json(dealer);
  } catch {
    res.status(500).json({ error: 'Failed to fetch dealer' });
  }
});

router.post('/dealers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { manualUniqueId, ...dealerData } = req.body;

    // Validate manual unique ID if provided
    if (manualUniqueId) {
      await validateManualUniqueId(manualUniqueId, 'deal');
    }

    // Generate system ID: deal-YY-####
    const dealerCode = await generateSystemId('deal');
    
    const dealer = await prisma.$transaction(async (tx) => {
      return await tx.dealer.create({ 
        data: {
          ...dealerData,
          dealerCode,
          manualUniqueId: manualUniqueId?.trim() || null,
        }
      });
    });

    await createActivity({
      type: 'dealer',
      action: 'created',
      entityId: dealer.id,
      entityName: dealer.name,
      message: `Dealer "${dealer.name}" was added`,
      userId: req.user?.id,
      metadata: {
        email: dealer.email,
        phone: dealer.phone,
        company: dealer.company,
        commissionRate: (dealer as any).commissionRate,
      },
    });

    res.status(201).json(dealer);
  } catch {
    res.status(400).json({ error: 'Failed to create dealer' });
  }
});

router.put('/dealers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealer = await prisma.dealer.update({
      where: { id: req.params.id },
      data: req.body,
    });

    await createActivity({
      type: 'dealer',
      action: 'updated',
      entityId: dealer.id,
      entityName: dealer.name,
      message: `Dealer "${dealer.name}" was updated`,
      userId: req.user?.id,
      metadata: {
        email: dealer.email,
        phone: dealer.phone,
        company: dealer.company,
        commissionRate: (dealer as any).commissionRate,
      },
    });

    res.json(dealer);
  } catch {
    res.status(400).json({ error: 'Failed to update dealer' });
  }
});

router.delete('/dealers/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealer = await prisma.dealer.delete({ where: { id: req.params.id } });

    await createActivity({
      type: 'dealer',
      action: 'deleted',
      entityId: dealer.id,
      entityName: dealer.name,
      message: `Dealer "${dealer.name}" was deleted`,
      userId: req.user?.id,
      metadata: {
        email: dealer.email,
        phone: dealer.phone,
        company: dealer.company,
        commissionRate: (dealer as any).commissionRate,
      },
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete dealer' });
  }
});

// Deals
router.get('/deals', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      include: { 
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            clientCode: true,
            status: true,
          },
        },
        dealer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            dealerCode: true,
            isActive: true,
          },
        },
      },
    });
    res.json(deals);
  } catch (error: any) {
    logger.error('Error fetching deals:', error);
    logger.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    res.status(500).json({ 
      error: 'Failed to fetch deals',
      message: error?.message || 'Unknown error',
      details: process.env.NODE_ENV === 'development' ? {
        message: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack,
      } : undefined
    });
  }
});

router.get('/deals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: {
        client: true,
        dealer: true,
        paymentPlan: {
          include: {
            installments: {
              where: { isDeleted: false },
              orderBy: { installmentNumber: 'asc' },
            },
          },
        },
        payments: {
          where: { deletedAt: null },
          orderBy: { date: 'desc' },
        },
      },
    });
    if (!deal) return res.status(404).json({ error: 'Deal not found' });
    res.json(deal);
  } catch (error: any) {
    console.error('Get deal error:', error);
    res.status(500).json({ error: 'Failed to fetch deal' });
  }
});

// ==================== DEAL PAYMENT PLAN ROUTES ====================

// GET /api/crm/deals/:id/payment-plan
router.get('/deals/:id/payment-plan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealId = req.params.id;
    
    // Load deal with all necessary data
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: true,
        dealer: true,
        property: {
          select: { id: true, name: true, propertyCode: true },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    // Get payment plan if exists
    const { PaymentPlanService } = await import('../services/payment-plan-service');
    const plan = await PaymentPlanService.getPaymentPlanByDealId(dealId);

    const dealAmount = deal.dealAmount || 0;
    
    // Calculate summary from installments (not from Payment table)
    let paidAmount = 0;
    let remainingAmount = dealAmount;
    let progress = 0;
    
    if (plan && plan.installments && plan.installments.length > 0) {
      // Calculate paid amount from installments.paidAmount
      paidAmount = plan.installments.reduce((sum: number, inst: any) => {
        return sum + (inst.paidAmount || 0);
      }, 0);
      
      remainingAmount = Math.max(0, dealAmount - paidAmount);
      progress = dealAmount > 0 ? (paidAmount / dealAmount) * 100 : 0;
    }

    // Calculate installment summary if plan exists
    let installmentSummary = null;
    if (plan) {
      const installments = plan.installments || [];
      const installmentTotal = installments.reduce((sum: number, inst: any) => sum + (inst.amount || 0), 0);
      const installmentPaid = installments.reduce((sum: number, inst: any) => sum + (inst.paidAmount || 0), 0);
      
      installmentSummary = {
        totalInstallments: installments.length,
        paidInstallments: installments.filter((inst: any) => inst.status === 'paid').length,
        unpaidInstallments: installments.length - installments.filter((inst: any) => inst.status === 'paid').length,
        overdueInstallments: installments.filter(
          (inst: any) => (inst.status === 'unpaid' || inst.status === 'overdue') && new Date(inst.dueDate) < new Date()
        ).length,
        installmentTotal,
        installmentPaid,
      };
    }

    // Build response with correct summary calculated from installments
    const response = {
      dealId: deal.id,
      totalAmount: dealAmount,
      paidAmount: Math.round(paidAmount * 100) / 100,
      remainingAmount: Math.round(remainingAmount * 100) / 100,
      progress: Math.round(progress * 100) / 100,
      deal: {
        id: deal.id,
        dealCode: deal.dealCode,
        title: deal.title,
        dealAmount: dealAmount,
        client: deal.client,
        dealer: deal.dealer,
        property: deal.property,
      },
      paymentPlan: plan || null,
      summary: {
        totalAmount: dealAmount,
        paidAmount: Math.round(paidAmount * 100) / 100,
        remainingAmount: Math.round(remainingAmount * 100) / 100,
        progress: Math.round(progress * 100) / 100,
        status: remainingAmount <= 0.01 ? 'Fully Paid' : paidAmount > 0 ? 'Partially Paid' : 'Pending',
      },
      installments: plan?.installments || [],
      installmentSummary: installmentSummary,
    };

    res.json({ success: true, data: response });
  } catch (error: any) {
    console.error('Get payment plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get payment plan',
    });
  }
});

// GET /api/crm/deals/:id/payment-plan/pdf - Generate PDF report
router.get('/deals/:id/payment-plan/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealId = req.params.id;
    
    // Load deal with all necessary data
    const deal = await prisma.deal.findUnique({
      where: { id: dealId },
      include: {
        client: true,
        dealer: true,
        property: {
          select: { id: true, name: true, propertyCode: true },
        },
      },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    // Get payment plan if exists
    const { PaymentPlanService } = await import('../services/payment-plan-service');
    const plan = await PaymentPlanService.getPaymentPlanByDealId(dealId);

    // Calculate paid amount from installments + down payment (not from Payment table)
    const dealAmount = deal.dealAmount || 0;
    let totalPaid = 0;
    let downPayment = 0;
    
    if (plan) {
      // Get down payment from payment plan
      const paymentPlan = await prisma.paymentPlan.findUnique({
        where: { id: plan.id },
        select: { downPayment: true },
      });
      downPayment = paymentPlan?.downPayment || 0;
      
      // Calculate paid amount from installments
      const installmentPaidAmount = (plan.installments || []).reduce(
        (sum: number, inst: any) => sum + (inst.paidAmount || 0),
        0
      );
      
      // Total paid = installments paid + down payment
      totalPaid = installmentPaidAmount + downPayment;
    } else {
      // If no payment plan, calculate from Payment table as fallback
      const payments = await prisma.payment.findMany({
        where: {
          dealId: dealId,
          deletedAt: null,
        },
        select: {
          amount: true,
        },
      });
      totalPaid = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
    }
    
    const remainingAmount = Math.max(0, dealAmount - totalPaid);
    const progress = dealAmount > 0 ? (totalPaid / dealAmount) * 100 : 0;

    // Prepare data for PDF
    const pdfData = {
      deal: {
        dealCode: deal.dealCode || undefined,
        title: deal.title,
        dealAmount: dealAmount,
        client: deal.client ? {
          name: deal.client.name,
          email: deal.client.email || undefined,
          phone: deal.client.phone || undefined,
        } : undefined,
        dealer: deal.dealer ? {
          name: deal.dealer.name,
        } : undefined,
        property: deal.property ? {
          name: deal.property.name,
          propertyCode: deal.property.propertyCode || undefined,
        } : undefined,
      },
      summary: {
        totalAmount: dealAmount,
        paidAmount: totalPaid,
        remainingAmount: remainingAmount,
        progress: Math.round(progress * 100) / 100,
        status: remainingAmount <= 0.01 ? 'Fully Paid' : totalPaid > 0 ? 'Partially Paid' : 'Pending',
        downPayment: downPayment, // Include down payment in summary
      },
      installments: (plan?.installments || []).map((inst: any) => ({
        installmentNumber: inst.installmentNumber,
        amount: inst.amount,
        dueDate: inst.dueDate,
        paidAmount: inst.paidAmount || 0,
        status: inst.status,
        paymentMode: inst.paymentMode,
        notes: inst.notes,
      })),
      generatedAt: new Date(),
    };

    // Generate PDF
    const { generatePaymentPlanPDF } = await import('../utils/pdf-generator');
    generatePaymentPlanPDF(pdfData, res);
  } catch (error: any) {
    console.error('Generate PDF error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate PDF',
    });
  }
});

// POST /api/crm/deals/:id/payment-plan
router.post('/deals/:id/payment-plan', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');
    
    // Get deal to extract clientId and dealAmount
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { client: true },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    if (!deal.clientId) {
      return res.status(400).json({ success: false, error: 'Deal must have a client assigned' });
    }

    const plan = await PaymentPlanService.createPaymentPlan({
      dealId: req.params.id,
      clientId: deal.clientId,
      numberOfInstallments: req.body.numberOfInstallments,
      totalAmount: req.body.totalAmount || deal.dealAmount,
      startDate: new Date(req.body.startDate),
      installmentType: req.body.installmentType || 'monthly',
      downPayment: req.body.downPayment || 0,
      installmentAmounts: req.body.installmentAmounts,
      dueDates: req.body.dueDates?.map((d: string) => new Date(d)),
      paymentModes: req.body.paymentModes,
      notes: req.body.notes,
    });

    res.json({ success: true, data: plan });
  } catch (error: any) {
    console.error('Create payment plan error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment plan',
    });
  }
});

// PUT /api/crm/payment-plan/:id
router.put('/payment-plan/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentPlanService } = await import('../services/payment-plan-service');
    
    // Get payment plan to find dealId
    const plan = await prisma.paymentPlan.findUnique({
      where: { id: req.params.id },
    });

    if (!plan) {
      return res.status(404).json({ success: false, error: 'Payment plan not found' });
    }

    // Update installments if provided
    if (req.body.installments && Array.isArray(req.body.installments)) {
      for (const inst of req.body.installments) {
        if (inst.id) {
          await PaymentPlanService.updateInstallment(inst.id, {
            amount: inst.amount,
            dueDate: inst.dueDate ? new Date(inst.dueDate) : undefined,
            paymentMode: inst.paymentMode,
            notes: inst.notes,
          });
        }
      }
    }

    // Recalculate payment plan
    const updatedPlan = await PaymentPlanService.recalculatePaymentPlan(plan.dealId);

    res.json({ success: true, data: updatedPlan });
  } catch (error: any) {
    console.error('Update payment plan error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to update payment plan',
    });
  }
});

// POST /api/crm/deals/:id/payments
router.post('/deals/:id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { PaymentService } = await import('../services/payment-service');
    const { PaymentPlanService } = await import('../services/payment-plan-service');
    
    const deal = await prisma.deal.findUnique({
      where: { id: req.params.id },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    // Create payment
    const payment = await PaymentService.createPayment({
      dealId: req.params.id,
      amount: req.body.amount,
      paymentType: req.body.paymentType || 'installment',
      paymentMode: req.body.paymentMode || 'cash',
      transactionId: req.body.transactionId,
      referenceNumber: req.body.referenceNumber,
      date: req.body.date ? new Date(req.body.date) : new Date(),
      remarks: req.body.remarks,
      createdBy: req.user?.id || '',
      installmentId: req.body.installmentId, // Link to specific installment if provided
    });

    // Sync payment plan if it exists
    if (req.body.installmentId) {
      await PaymentPlanService.syncPaymentPlanAfterPayment(
        req.params.id,
        req.body.amount,
        req.body.installmentId
      );
    } else {
      // If no specific installment, sync anyway to update totals
      await PaymentPlanService.syncPaymentPlanAfterPayment(req.params.id, req.body.amount);
    }

    res.json({ success: true, data: payment });
  } catch (error: any) {
    console.error('Create payment error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create payment',
    });
  }
});

// PATCH /api/crm/deals/:dealId/payments/smart-allocate
router.patch('/deals/:dealId/payments/smart-allocate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const dealId = req.params.dealId;
    const { amount, method } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Payment amount must be greater than 0',
      });
    }

    if (!method || !['cash', 'bank', 'other'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'Payment method must be one of: cash, bank, other',
      });
    }

    const { PaymentPlanService } = await import('../services/payment-plan-service');
    
    const result = await PaymentPlanService.smartAllocatePayment(
      dealId,
      amount,
      method,
      new Date(),
      req.user?.id || ''
    );

    // Create audit log
    const { createAuditLog } = await import('../services/audit-log');
    await createAuditLog({
      entityType: 'payment',
      entityId: dealId,
      action: 'create',
      userId: req.user?.id,
      userName: req.user?.username,
      newValues: result,
      description: `Smart payment allocation: ${result.paymentApplied} applied${result.excessIgnored > 0 ? `, ${result.excessIgnored} excess ignored` : ''}`,
      req,
    });

    res.json({
      success: true,
      paymentApplied: result.paymentApplied,
      excessIgnored: result.excessIgnored,
      updatedInstallments: result.updatedInstallments,
      summary: result.summary,
      dealClosed: result.dealClosed,
      message: result.excessIgnored > 0 
        ? `Payment applied: ${result.paymentApplied}. Excess amount (${result.excessIgnored}) ignored.`
        : `Payment of ${result.paymentApplied} successfully allocated across installments.`,
    });
  } catch (error: any) {
    logger.error('Smart allocation error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to allocate payment',
    });
  }
});

router.post('/deals', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealService } = await import('../services/deal-service');
    
    const deal = await DealService.createDeal({
      ...req.body,
      createdBy: req.user?.id || '',
    });

    await createActivity({
      type: 'deal',
      action: 'created',
      entityId: deal.id,
      entityName: deal.title,
      message: `Deal "${deal.title}" was created`,
      userId: req.user?.id,
      metadata: {
        value: deal.dealAmount,
        stage: deal.stage,
        clientId: deal.clientId,
        dealerId: deal.dealerId,
      },
    });

    res.status(201).json(deal);
  } catch (error: any) {
    console.error('Create deal error:', error);
    res.status(400).json({ error: error.message || 'Failed to create deal' });
  }
});

router.put('/deals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { DealService } = await import('../services/deal-service');
    
    const deal = await DealService.updateDeal(req.params.id, {
      ...req.body,
      updatedBy: req.user?.id || '',
    });

    const updatedDeal = await prisma.deal.findUnique({
      where: { id: req.params.id },
      include: { client: true, dealer: true },
    });

    await createActivity({
      type: 'deal',
      action: 'updated',
      entityId: deal.id,
      entityName: deal.title,
      message: `Deal "${deal.title}" was updated`,
      userId: req.user?.id,
      metadata: {
        value: deal.dealAmount,
        stage: deal.stage,
        clientId: deal.clientId,
        dealerId: deal.dealerId,
      },
    });

    res.json(updatedDeal || deal);
  } catch {
    res.status(400).json({ error: 'Failed to update deal' });
  }
});

router.delete('/deals/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const deal = await prisma.deal.delete({
      where: { id: req.params.id },
      include: { client: true, dealer: true },
    });

    await createActivity({
      type: 'deal',
      action: 'deleted',
      entityId: deal.id,
      entityName: deal.title,
      message: `Deal "${deal.title}" was deleted`,
      userId: req.user?.id,
      metadata: {
        value: deal.dealAmount,
        stage: deal.stage,
        clientId: deal.clientId,
        dealerId: deal.dealerId,
      },
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete deal' });
  }
});

// Communications
router.get('/communications', authenticate, async (_req: AuthRequest, res: Response) => {
  try {
    const communications = await prisma.communication.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        lead: true,
      },
    });
    res.json(communications);
  } catch {
    res.status(500).json({ error: 'Failed to fetch communications' });
  }
});

router.get('/communications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.communication.findUnique({ where: { id: req.params.id } });
    if (!item) return res.status(404).json({ error: 'Communication not found' });
    res.json(item);
  } catch {
    res.status(500).json({ error: 'Failed to fetch communication' });
  }
});

router.post('/communications', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.communication.create({
      data: req.body,
      include: { client: true, lead: true },
    });

    await createActivity({
      type: 'communication',
      action: 'created',
      entityId: item.id,
      entityName: item.channel,
      message: `Communication logged via ${item.channel}`,
      userId: req.user?.id,
      metadata: {
        clientId: item.clientId,
        leadId: item.leadId,
        channel: item.channel,
      },
    });

    res.status(201).json(item);
  } catch {
    res.status(400).json({ error: 'Failed to create communication' });
  }
});

router.put('/communications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.communication.update({
      where: { id: req.params.id },
      data: req.body,
      include: { client: true, lead: true },
    });

    await createActivity({
      type: 'communication',
      action: 'updated',
      entityId: item.id,
      entityName: item.channel,
      message: `Communication via ${item.channel} was updated`,
      userId: req.user?.id,
      metadata: {
        clientId: item.clientId,
        leadId: item.leadId,
        channel: item.channel,
      },
    });

    res.json(item);
  } catch {
    res.status(400).json({ error: 'Failed to update communication' });
  }
});

router.delete('/communications/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.communication.delete({
      where: { id: req.params.id },
      include: { client: true, lead: true },
    });

    await createActivity({
      type: 'communication',
      action: 'deleted',
      entityId: item.id,
      entityName: item.channel,
      message: `Communication via ${item.channel} was deleted`,
      userId: req.user?.id,
      metadata: {
        clientId: item.clientId,
        leadId: item.leadId,
        channel: item.channel,
      },
    });

    res.status(204).end();
  } catch {
    res.status(400).json({ error: 'Failed to delete communication' });
  }
});

export default router;


