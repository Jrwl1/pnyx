import { INestApplication }   from '@nestjs/common';
import { Test }               from '@nestjs/testing';
import request                from 'supertest';
import { AppModule }          from '../src/app.module';
import { PrismaService }      from '../src/prisma.service';
import { UserRole, StatementStatus } from '@prisma/client';

describe('Statements (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtUser: string;
  let jwtMod: string;
  let politicianId: string;
  let statementId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();

    // grab PrismaService for seeding
    prisma = moduleRef.get<PrismaService>(PrismaService);

    // create a politician to satisfy FK on statement
    const pol = await prisma.politician.create({
      data: {
        name: 'Test Politician',
        party: 'Indie',
        office: 'Senator',
        region: 'TestLand',
        termStart: new Date(),
        termEnd:   new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
    politicianId = pol.id;

    // register & login a normal user
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ email: 'user@test.com', password: 'password123' });
    const loginUser = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@test.com', password: 'password123' });
    jwtUser = loginUser.body.access_token;

    // register & promote a mod user
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
});
