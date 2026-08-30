import request from "supertest";
import { app } from "../../server";
import { prisma } from "../../infrastructure/database/prismaClient";

// Mock prisma for isolated integration test
jest.mock("../../infrastructure/database/prismaClient", () => ({
  prisma: {
    organization: {
      count: jest.fn().mockResolvedValue(3),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "org-1",
          name: "Torre Bella Vista",
          address: "Av. Winston Churchill",
          createdAt: new Date(),
          _count: { users: 12, properties: 10, meetings: 4 },
          users: [],
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: "org-1",
        name: "Torre Bella Vista",
        users: [],
        properties: [],
        meetings: [],
      }),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: `org-${Date.now()}`, createdAt: new Date(), ...data })
      ),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: "org-1", ...data })
      ),
      delete: jest.fn().mockResolvedValue({ id: "org-1" }),
    },
    user: {
      count: jest.fn().mockResolvedValue(45),
      findMany: jest.fn().mockResolvedValue([
        {
          id: "user-1",
          fullName: "Diego Alejo Murillo (Superadmin)",
          email: "diegodanielalejomurillo@gmail.com",
          role: { id: "role-1", name: "SUPERADMIN" },
          organization: null,
          isActive: true,
          createdAt: new Date(),
        },
      ]),
      findFirst: jest.fn().mockResolvedValue({
        id: "c280d672-dc80-442d-9744-251bfff1fc79",
        fullName: "Diego Alejo Murillo (Superadmin)",
        email: "diegodanielalejomurillo@gmail.com",
        role: { id: "role-1", name: "SUPERADMIN" },
        organizationId: null,
        isActive: true,
      }),
      update: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({
          id: "user-1",
          fullName: "Diego Alejo Murillo",
          role: { id: data.roleId || "role-1", name: "SUPERADMIN" },
          organization: null,
          ...data,
        })
      ),
    },
    role: {
      findMany: jest.fn().mockResolvedValue([
        { id: "role-1", name: "SUPERADMIN", description: "Global admin", permissions: [], _count: { users: 1 } },
        { id: "role-2", name: "ORG_ADMIN", description: "Condominium admin", permissions: [], _count: { users: 5 } },
      ]),
      findUnique: jest.fn().mockResolvedValue({ id: "role-1", name: "SUPERADMIN" }),
    },
    permission: {
      findMany: jest.fn().mockResolvedValue([
        { id: "perm-1", action: "MANAGE", resource: "ORGANIZATIONS" },
        { id: "perm-2", action: "MANAGE", resource: "USERS" },
      ]),
    },
    meeting: {
      count: jest.fn().mockResolvedValue(8),
    },
    vote: {
      count: jest.fn().mockResolvedValue(124),
    },
    $transaction: jest.fn().mockResolvedValue([]),
    rolePermission: {
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      createMany: jest.fn().mockResolvedValue({ count: 2 }),
    },
  },
}));

describe("Task 2: Superadmin & RBAC Endpoints Integration Tests", () => {
  describe("GET /api/v1/superadmin/stats", () => {
    it("returns system statistics when authenticated with superadmin token", async () => {
      const res = await request(app)
        .get("/api/v1/superadmin/stats")
        .set("Authorization", "Bearer dev-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalOrganizations).toBe(3);
      expect(res.body.data.totalUsers).toBe(45);
      expect(res.body.data.totalMeetings).toBe(8);
      expect(res.body.data.totalVotes).toBe(124);
    });

    it("rejects unauthorized requests with 403 when no auth token is provided", async () => {
      const res = await request(app).get("/api/v1/superadmin/stats");
      expect(res.status).toBe(403);
    });
  });

  describe("POST /api/v1/superadmin/organizations", () => {
    it("successfully creates a new condominium with isolated settings", async () => {
      const testOrgName = "Condominio Torre Bella Vista II";
      const res = await request(app)
        .post("/api/v1/superadmin/organizations")
        .set("Authorization", "Bearer dev-token")
        .send({
          name: testOrgName,
          address: "Av. Anacaona #100",
          settings: { quorumRule: "COEFFICIENT", threshold: 60 },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(testOrgName);
      expect(res.body.data.address).toBe("Av. Anacaona #100");
    });

    it("fails with 400 when organization name is missing", async () => {
      const res = await request(app)
        .post("/api/v1/superadmin/organizations")
        .set("Authorization", "Bearer dev-token")
        .send({ address: "No name" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/v1/superadmin/roles", () => {
    it("lists all system roles with their assigned permissions", async () => {
      const res = await request(app)
        .get("/api/v1/superadmin/roles")
        .set("Authorization", "Bearer dev-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const roleNames = res.body.data.map((r: any) => r.name);
      expect(roleNames).toContain("SUPERADMIN");
      expect(roleNames).toContain("ORG_ADMIN");
    });
  });

  describe("GET /api/v1/superadmin/users", () => {
    it("lists global users across all condominiums", async () => {
      const res = await request(app)
        .get("/api/v1/superadmin/users")
        .set("Authorization", "Bearer dev-token");

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].email).toBe("diegodanielalejomurillo@gmail.com");
    });
  });
});
