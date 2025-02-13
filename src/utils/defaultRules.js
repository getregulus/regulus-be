module.exports = [
  {
    rule_name: "High-value transaction alert",
    field: "amount",
    operator: "GREATER_THAN",
    value: "10000",
  },
  {
    rule_name: "Transaction from a high-risk currency",
    field: "currency",
    operator: "EQUAL",
    value: "POL",
  },
];
