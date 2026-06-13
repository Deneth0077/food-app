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

  // Define minimal schemas for the dry run
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
  const admins = await User.find({ role: 'ADMIN' });
  const canteens = await User.find({ role: 'CANTEEN' });

  console.log('\n--- Database Summary ---');
  console.log(`Admins in system: ${admins.length}`);
  console.log(`Canteen users in system: ${canteens.length}`);
  console.log(`Employees to be deleted: ${employees.length}`);

  if (employees.length > 0) {
    console.log('\nSample of employees to delete:');
    employees.slice(0, 10).forEach(emp => {
      console.log(`- ${emp.fullName} (${emp.employeeNo})`);
    });
    if (employees.length > 10) console.log(`... and ${employees.length - 10} more`);

    const employeeIds = employees.map(e => e._id);
    const employeeNos = employees.map(e => e.employeeNo);

    // Count orders
    const ordersCount = await Order.countDocuments({
      $or: [
        { userId: { $in: employeeIds } },
        { employeeNo: { $in: employeeNos } }
      ]
    });
    console.log(`\nOrders associated with these employees: ${ordersCount}`);

    // Count notifications
    const notificationsCount = await Notification.countDocuments({
      employeeNo: { $in: employeeNos }
    });
    console.log(`Notifications associated with these employees: ${notificationsCount}`);
  } else {
    console.log('\nNo employees found to delete.');
  }

  await mongoose.disconnect();
  console.log('\nDisconnected.');
}

run().catch(err => {
  console.error('Error during dry run:', err);
  process.exit(1);
});
