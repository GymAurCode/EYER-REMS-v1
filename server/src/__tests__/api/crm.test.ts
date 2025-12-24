/**
 * CRM API Tests
 * Tests leads, clients, deals, communications endpoints
 */

import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/test-app';
import { createTestUser, createTestRole, cleanupDatabase, createAuthHeaders } from '../helpers/test-data';

const prisma = new PrismaClient();
let app: express.Application;
let authHeaders: { Authorization: string; 'X-CSRF-Token': string };
let userId: string;

describe('CRM API', () => {
  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanupDatabase();
    
    // Create user with CRM permissions
    const crmRole = await createTestRole('CRM Manager', [
      'crm.*',
      'properties.view',
    ]);
    const user = await createTestUser({
      email: 'crm@test.com',
      password: 'password123',
      roleId: crmRole.id,
    });
    userId = user.id;
    authHeaders = await createAuthHeaders(app, 'crm@test.com', 'password123');
  });

  afterAll(async () => {
    await cleanupDatabase();
    await prisma.$disconnect();
  });

  describe('Leads API', () => {
    describe('POST /api/crm/leads', () => {
      it('should create lead successfully', async () => {
        const leadData = {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          source: 'website',
          priority: 'high',
          interest: 'residential',
          budget: '500000-1000000',
          followUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const response = await request(app)
          .post('/api/crm/leads')
          .set(authHeaders)
          .send(leadData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            source: 'website',
            priority: 'high',
            leadCode: expect.stringMatching(/^lead-\d{2}-\d{4}$/),
          },
        });
      });

      it('should reject invalid lead data', async () => {
        const response = await request(app)
          .post('/api/crm/leads')
          .set(authHeaders)
          .send({
            name: '', // empty name
            email: 'invalid-email',
            priority: 'invalid-priority',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should reject request without permission', async () => {
        const limitedRole = await createTestRole('Limited User', ['properties.view']);
        const limitedUser = await createTestUser({
          email: 'limited@test.com',
          password: 'password123',
          roleId: limitedRole.id,
        });
        const limitedHeaders = await createAuthHeaders(app, 'limited@test.com', 'password123');

        const response = await request(app)
          .post('/api/crm/leads')
          .set(limitedHeaders)
          .send({
            name: 'John Doe',
            email: 'john@example.com',
          });

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Insufficient permissions');
      });
    });

    describe('GET /api/crm/leads', () => {
      it('should get leads with pagination', async () => {
        // Create test leads
        await prisma.lead.createMany({
          data: [
            {
              name: 'Lead 1',
              email: 'lead1@test.com',
              leadCode: 'lead-24-0001',
              priority: 'high',
              status: 'new',
            },
            {
              name: 'Lead 2',
              email: 'lead2@test.com',
              leadCode: 'lead-24-0002',
              priority: 'medium',
              status: 'contacted',
            },
          ],
        });

        const response = await request(app)
          .get('/api/crm/leads?page=1&limit=10')
          .set(authHeaders);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: expect.arrayContaining([
            expect.objectContaining({
              name: 'Lead 1',
              priority: 'high',
            }),
            expect.objectContaining({
              name: 'Lead 2',
              priority: 'medium',
            }),
          ]),
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        });
      });

      it('should filter leads by status', async () => {
        await prisma.lead.createMany({
          data: [
            {
              name: 'Active Lead',
              leadCode: 'lead-24-0001',
              status: 'qualified',
            },
            {
              name: 'Lost Lead',
              leadCode: 'lead-24-0002',
              status: 'lost',
            },
          ],
        });

        const response = await request(app)
          .get('/api/crm/leads?status=qualified')
          .set(authHeaders);

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveLength(1);
        expect(response.body.data[0].name).toBe('Active Lead');
      });
    });

    describe('PUT /api/crm/leads/:id', () => {
      it('should update lead successfully', async () => {
        const lead = await prisma.lead.create({
          data: {
            name: 'Original Name',
            leadCode: 'lead-24-0001',
            priority: 'low',
          },
        });

        const response = await request(app)
          .put(`/api/crm/leads/${lead.id}`)
          .set(authHeaders)
          .send({
            name: 'Updated Name',
            priority: 'high',
            notes: 'Updated notes',
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            name: 'Updated Name',
            priority: 'high',
            notes: 'Updated notes',
          },
        });
      });

      it('should return 404 for non-existent lead', async () => {
        const response = await request(app)
          .put('/api/crm/leads/00000000-0000-0000-0000-000000000000')
          .set(authHeaders)
          .send({
            name: 'Updated Name',
          });

        expect(response.status).toBe(404);
        expect(response.body.error).toBe('Lead not found');
      });
    });
  });

  describe('Clients API', () => {
    describe('POST /api/crm/clients', () => {
      it('should create client successfully', async () => {
        const clientData = {
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+1987654321',
          company: 'Smith Corp',
          clientType: 'corporate',
          address: '123 Business St',
          city: 'New York',
        };

        const response = await request(app)
          .post('/api/crm/clients')
          .set(authHeaders)
          .send(clientData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            clientType: 'corporate',
            clientCode: expect.stringMatching(/^cli-\d{2}-\d{4}$/),
          },
        });
      });

      it('should handle duplicate email', async () => {
        // Create first client
        await prisma.client.create({
          data: {
            name: 'First Client',
            email: 'duplicate@test.com',
            clientCode: 'cli-24-0001',
          },
        });

        // Try to create second client with same email
        const response = await request(app)
          .post('/api/crm/clients')
          .set(authHeaders)
          .send({
            name: 'Second Client',
            email: 'duplicate@test.com',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Unique constraint violation');
      });
    });

    describe('GET /api/crm/clients/:id', () => {
      it('should get client with deals', async () => {
        const client = await prisma.client.create({
          data: {
            name: 'Test Client',
            email: 'client@test.com',
            clientCode: 'cli-24-0001',
          },
        });

        const property = await prisma.property.create({
          data: {
            name: 'Test Property',
            type: 'residential',
            address: '123 Test St',
            propertyCode: 'prop-24-0001',
          },
        });

        await prisma.deal.create({
          data: {
            title: 'Test Deal',
            clientId: client.id,
            propertyId: property.id,
            dealAmount: 500000,
            dealCode: 'deal-24-0001',
          },
        });

        const response = await request(app)
          .get(`/api/crm/clients/${client.id}`)
          .set(authHeaders);

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            name: 'Test Client',
            email: 'client@test.com',
            deals: expect.arrayContaining([
              expect.objectContaining({
                title: 'Test Deal',
                dealAmount: 500000,
              }),
            ]),
          },
        });
      });
    });
  });

  describe('Deals API', () => {
    let clientId: string;
    let propertyId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Deal Client',
          clientCode: 'cli-24-0001',
        },
      });
      clientId = client.id;

      const property = await prisma.property.create({
        data: {
          name: 'Deal Property',
          type: 'residential',
          address: '456 Deal St',
          propertyCode: 'prop-24-0001',
        },
      });
      propertyId = property.id;
    });

    describe('POST /api/crm/deals', () => {
      it('should create deal successfully', async () => {
        const dealData = {
          title: 'Property Sale Deal',
          clientId,
          propertyId,
          dealAmount: 750000,
          role: 'buyer',
          dealType: 'sale',
          stage: 'prospecting',
          probability: 60,
          commissionRate: 2.5,
        };

        const response = await request(app)
          .post('/api/crm/deals')
          .set(authHeaders)
          .send(dealData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            title: 'Property Sale Deal',
            dealAmount: 750000,
            role: 'buyer',
            dealType: 'sale',
            stage: 'prospecting',
            probability: 60,
            commissionRate: 2.5,
            dealCode: expect.stringMatching(/^dl-\d{2}-\d{4}$/),
          },
        });
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/crm/deals')
          .set(authHeaders)
          .send({
            title: 'Incomplete Deal',
            // missing clientId, propertyId, dealAmount
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Validation error');
      });

      it('should validate foreign key constraints', async () => {
        const response = await request(app)
          .post('/api/crm/deals')
          .set(authHeaders)
          .send({
            title: 'Invalid Deal',
            clientId: '00000000-0000-0000-0000-000000000000',
            propertyId: '00000000-0000-0000-0000-000000000000',
            dealAmount: 100000,
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Foreign key constraint violation');
      });
    });

    describe('PUT /api/crm/deals/:id/stage', () => {
      it('should update deal stage', async () => {
        const deal = await prisma.deal.create({
          data: {
            title: 'Stage Test Deal',
            clientId,
            propertyId,
            dealAmount: 300000,
            dealCode: 'deal-24-0001',
            stage: 'prospecting',
          },
        });

        const response = await request(app)
          .put(`/api/crm/deals/${deal.id}/stage`)
          .set(authHeaders)
          .send({
            stage: 'negotiation',
            probability: 75,
            notes: 'Moved to negotiation stage',
          });

        expect(response.status).toBe(200);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            stage: 'negotiation',
            probability: 75,
          },
        });
      });
    });
  });

  describe('Communications API', () => {
    let clientId: string;

    beforeEach(async () => {
      const client = await prisma.client.create({
        data: {
          name: 'Communication Client',
          clientCode: 'cli-24-0001',
        },
      });
      clientId = client.id;
    });

    describe('POST /api/crm/communications', () => {
      it('should create communication successfully', async () => {
        const commData = {
          clientId,
          channel: 'email',
          activityType: 'email',
          subject: 'Follow-up Email',
          content: 'Following up on our previous conversation',
          nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        };

        const response = await request(app)
          .post('/api/crm/communications')
          .set(authHeaders)
          .send(commData);

        expect(response.status).toBe(201);
        expect(response.body).toMatchObject({
          success: true,
          data: {
            channel: 'email',
            activityType: 'email',
            subject: 'Follow-up Email',
            content: 'Following up on our previous conversation',
          },
        });
      });

      it('should require either leadId, clientId, or dealId', async () => {
        const response = await request(app)
          .post('/api/crm/communications')
          .set(authHeaders)
          .send({
            channel: 'phone',
            content: 'Phone call',
          });

        expect(response.status).toBe(400);
        expect(response.body.error).toBe('Either leadId, clientId, or dealId is required');
      });
    });
  });

  describe('Authorization Tests', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .get('/api/crm/leads');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication required');
    });

    it('should reject requests without CSRF token for POST', async () => {
      const response = await request(app)
        .post('/api/crm/leads')
        .set('Authorization', authHeaders.Authorization)
        .send({
          name: 'Test Lead',
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CSRF token required');
    });
  });
});