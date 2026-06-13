const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Read .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    envVars[key] = val;
  }
});

const mongoUri = envVars['MONGODB_URI'];
if (!mongoUri) {
  console.error('MONGODB_URI not found in .env.local');
  process.exit(1);
}

async function run() {
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri);
  console.log('Connected successfully!');

  // Define schemas
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
    fullName: String,
    employeeNo: String,
    role: String
  }, { collection: 'users' }));

  const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
    userId: mongoose.Schema.Types.ObjectId,
    employeeNo: String
  }, { collection: 'orders' }));

  const Notification = mongoose.models.Notification || mongoose.model('Notification', new mongoose.Schema({
    employeeNo: String
  }, { collection: 'notifications' }));

  // Find employees
  const employees = await User.find({ role: 'EMPLOYEE' });

  if (employees.length === 0) {
    console.log('No employees found to delete. Database is already clean.');
    await mongoose.disconnect();
    return;
  }

  const employeeIds = employees.map(e => e._id);
  const employeeNos = employees.map(e => e.employeeNo);

  console.log(`Found ${employees.length} employees to delete.`);
  console.log('Starting cleanup...');

  // 1. Delete orders
  const deletedOrders = await Order.deleteMany({
    $or: [
      { userId: { $in: employeeIds } },
      { employeeNo: { $in: employeeNos } }
    ]
  });
  console.log(`Deleted ${deletedOrders.deletedCount} associated orders.`);

  // 2. Delete notifications
  const deletedNotifications = await Notification.deleteMany({
    employeeNo: { $in: employeeNos }
  });
  console.log(`Deleted ${deletedNotifications.deletedCount} associated notifications.`);

  // 3. Delete users
  const deletedUsers = await User.deleteMany({
    role: 'EMPLOYEE'
  });
  console.log(`Deleted ${deletedUsers.deletedCount} employees.`);

  console.log('Database cleanup completed successfully!');

  await mongoose.disconnect();
  console.log('Disconnected.');
}

run().catch(err => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
