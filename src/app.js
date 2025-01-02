const express = require("express");
const app = express();

app.use(express.json());

const transactionRoutes = require("./routes/transactions");
app.use("/transactions", transactionRoutes);

app.get("/", (req, res) => {
  res.send({ message: "Hello from Regulus MVP!!" });
});

module.exports = app;
