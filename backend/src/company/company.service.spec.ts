import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { CompanyService } from './company.service';
import { CompanyConfig } from './schemas/company-config.schema';

describe('CompanyService', () => {
  let service: CompanyService;

  const mockCompanyModel = {
    findOneAndUpdate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ companyId: 'C1', name: 'Acme' }),
    }),
    findOne: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({ companyId: 'C1', name: 'Acme' }),
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompanyService,
        { provide: getModelToken(CompanyConfig.name), useValue: mockCompanyModel },
      ],
    }).compile();

    service = module.get<CompanyService>(CompanyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('upsertConfig should call findOneAndUpdate with companyId and dto', async () => {
    const dto: any = { name: 'Acme' };
    const result = await service.upsertConfig('C1', dto);
    expect(mockCompanyModel.findOneAndUpdate).toHaveBeenCalledWith(
      { companyId: 'C1' },
      { ...dto, companyId: 'C1' },
      { upsert: true, new: true },
    );
    expect(result).toEqual({ companyId: 'C1', name: 'Acme' });
  });

  it('getConfig should call findOne with companyId', async () => {
    const result = await service.getConfig('C1');
    expect(mockCompanyModel.findOne).toHaveBeenCalledWith({ companyId: 'C1' });
    expect(result).toEqual({ companyId: 'C1', name: 'Acme' });
  });
});
