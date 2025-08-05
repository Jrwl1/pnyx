import { INestApplication } from '@nestjs/common';
import { Test }             from '@nestjs/testing';
import request              from 'supertest';
import { AppModule }        from '../src/app.module';
import { PrismaService }    from '../src/prisma.service';
import { UserRole, StatementStatus } from '@prisma/client';

describe('Statements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtUser: string;
  let jwtMod: string;
  let jwtAdmin: string;
  let politicianId: string;
  let statementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = moduleRef.get<PrismaService>(PrismaService);

    // seed a politician
    const pol = await prisma.politician.create({
      data: {
        name: 'Test Politician',
        party: 'Indie',
        office: 'Senator',
        region: 'TestLand',
        termStart: new Date(),
        termEnd:   new Date(Date.now() + 86400000),
      },
    });
    politicianId = pol.id;

    // register & login user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@test.com', password: 'password123' });
    const loginUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    jwtUser = loginUser.body.access_token;

    // register & promote mod
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'mod@test.com', password: 'password123' });
    await prisma.user.update({
      where: { email: 'mod@test.com' },
      data: { role: UserRole.mod },
    });
    const loginMod = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'mod@test.com', password: 'password123' });
    jwtMod = loginMod.body.access_token;

    // register & promote admin
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'admin@test.com', password: 'password123' });
    await prisma.user.update({
      where: { email: 'admin@test.com' },
      data: { role: UserRole.admin },
    });
    const loginAdmin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'admin@test.com', password: 'password123' });
    jwtAdmin = loginAdmin.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('user can create a statement', async () => {
    const res = await request(app.getHttpServer())
      .post('/statements')
      .set('Authorization', `Bearer ${jwtUser}`)
      .send({
        politicianId,
        text: 'Test promise',
        sourceUrl: 'https://example.com',
        dateMade: new Date().toISOString(),
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    statementId = res.body.id;
  });

  it('user cannot update status', () => {
    return request(app.getHttpServer())
      .patch(`/statements/${statementId}/status`)
      .set('Authorization', `Bearer ${jwtUser}`)
      .send({ status: StatementStatus.kept })
      .expect(403);
  });

  it('mod can update status', () => {
    return request(app.getHttpServer())
      .patch(`/statements/${statementId}/status`)
      .set('Authorization', `Bearer ${jwtMod}`)
      .send({ status: StatementStatus.kept })
      .expect(200)
      .expect(res => {
        expect(res.body.status).toEqual(StatementStatus.kept);
      });
  });

  describe('Delete flows', () => {
    let ownerStmtId: string;
    let modStmtId: string;

    beforeAll(async () => {
      // statement for owner-delete
      const res1 = await request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${jwtUser}`)
        .send({
          politicianId,
          text: 'Owner delete',
          sourceUrl: 'https://owner.delete',
          dateMade: new Date().toISOString(),
        })
        .expect(201);
      ownerStmtId = res1.body.id;

      // statement for mod-request-delete
      const res2 = await request(app.getHttpServer())
        .post('/statements')
        .set('Authorization', `Bearer ${jwtUser}`)
        .send({
          politicianId,
          text: 'Mod request delete',
          sourceUrl: 'https://mod.request',
          dateMade: new Date().toISOString(),
        })
        .expect(201);
      modStmtId = res2.body.id;
    });

    it('user can delete own statement immediately', () => {
      return request(app.getHttpServer())
        .delete(`/statements/${ownerStmtId}`)
        .set('Authorization', `Bearer ${jwtUser}`)
        .expect(200)
        .expect(res => {
          expect(res.body.isDeleted).toBe(true);
        });
    });

    it('mod can request delete (pendingApproval)', () => {
      return request(app.getHttpServer())
        .delete(`/statements/${modStmtId}`)
        .set('Authorization', `Bearer ${jwtMod}`)
        .expect(200)
        .expect(res => {
          expect(res.body.pendingDelete).toBe(true);
          expect(res.body.isDeleted).toBe(false);
        });
    });

    it('admin can approve delete', () => {
      return request(app.getHttpServer())
        .patch(`/statements/${modStmtId}/approve-delete`)
        .set('Authorization', `Bearer ${jwtAdmin}`)
        .expect(200)
        .expect(res => {
          expect(res.body.isDeleted).toBe(true);
          expect(res.body.pendingDelete).toBe(false);
        });
    });
  });
});
