import 'reflect-metadata';
import { container } from '../container';
import { IAuthService, ICreditService } from '../interfaces';
import { PrismaClient } from '@prisma/client';

describe('DI Container', () => {
  it('should resolve PrismaClient', () => {
    const prisma = container.resolve<PrismaClient>('PrismaClient');
    expect(prisma).toBeDefined();
  });

  it('should verify container successfully', () => {
    expect(() => {
      const { verifyContainer } = require('../container');
      verifyContainer();
    }).not.toThrow();
  });
});
