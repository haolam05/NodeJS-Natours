const crypto = require('crypto');
const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name'],
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true, // not a validator, just conveted to lowercase
    validate: [validator.isEmail, 'Please provide a valid email'],
  },
  photo: {
    type: String,
    default: 'default.jpg',
  },
  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user',
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, 'Please confirm your password'],
    validate: {
      validator: function (passwordConfirm) {
        // only works on save() and create()
        return passwordConfirm === this.password;
      },
      message: 'Passwords are not the same',
    },
  },
  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false,
  },
});

userSchema.pre('save', async function (next) {
  // encrypt when password is actually modified (on save() & create())
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12); // saved encrypted version
    this.passwordConfirm = undefined;
  }

  next();
});

userSchema.pre('save', function (next) {
  if (this.isModified('password') && !this.isNew)
    this.passwordChangedAt = Date.now() - 1000;
  next();
});

userSchema.pre(/^find/, function (next) {
  this.find({ active: true });
  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword,
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (!this.passwordChangedAt) return false; // never changed password

  const changedTimestamp = parseInt(
    this.passwordChangedAt.getTime() / 1000,
    10,
  );

  return JWTTimestamp < changedTimestamp; // user changed pswd after token is issued
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetExpires =
    Date.now() + +process.env.PASSWORD_RESET_EXPIRES * 60 * 1000;
  this.passwordResetToken = crypto // saved encrypted version to compare later
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
