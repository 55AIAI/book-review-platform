const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { username, email, password } = req.body;
  const user = await User.create({ username, email, password: await bcrypt.hash(password, 12) });
  res.status(201).json({ _id: user._id, username: user.username, email: user.email });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const token = jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, {
    algorithm: "HS256", expiresIn: "7d"
  });
  res.json({ token, user: { id: user._id, username: user.username, email: user.email } });
};
