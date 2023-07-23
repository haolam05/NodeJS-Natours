const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);
mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
  })
  .then(() => console.log('DB is successfully connected!'));

const server = app.listen(process.env.PORT, () =>
  console.log(`App running on port ${process.env.PORT}`),
);

process.on('unhandledRejection', err => {
  console.log(`\nError: ${err.name}\nMessage: ${err.message}\n`);
  console.log('UNHANDLED REJECTION! ❌ Shutting down ...');
  server.close(() => process.exit(1));
});
