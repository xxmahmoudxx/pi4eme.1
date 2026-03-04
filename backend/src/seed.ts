import * as mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/bi_platform');

  const CompanyModel = mongoose.model('CompanyConfig', new mongoose.Schema({
    companyId: String,
    companyName: String,
    taxRate: Number,
    currency: String,
    email: String,
  }, { collection: 'company_config' }));

  const UserModel = mongoose.model('User', new mongoose.Schema({
    companyId: String,
    name: String,
    email: String,
    passwordHash: String,
    role: String,
    status: String,
  }, { collection: 'users' }));

  // ── Company ─────────────
  const company = {
    companyId: 'demo-company-1',
    companyName: 'Demo Company 1',
    taxRate: 20,
    currency: 'USD',
    email: 'demo@company.com',
  };

  const companyExists = await CompanyModel.exists({ companyId: company.companyId });
  if (!companyExists) {
    await CompanyModel.create(company);
    console.log('Created company: demo-company-1');
  } else {
    console.log('Company already exists');
  }

  // ── Admin User ─────────────
  const adminEmail = 'admin@demo.com';
  const userExists = await UserModel.exists({ email: adminEmail });
  if (!userExists) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await UserModel.create({
      companyId: company.companyId,
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'Admin',
      status: 'active',
    });
    console.log('Created admin user');
  } else {
    console.log('Admin user already exists');
  }

  await mongoose.disconnect();
  console.log('Seed finished!');
}

seed().catch(err => console.error(err));