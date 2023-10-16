const express = require("express");
const db = require("../src/database/db");

// importing routes
const routesUser = require("./routes/users");
const routesCompany = require("./routes/companies");

//connections
const app = express();
app.use(express.json());
const port = 3333;

app.get("/", (req, res) => {
  res.send("Intranet online");
});

//routes
app.use("/users", routesUser);
app.use("/companies", routesCompany);

app.listen(port, () => {
  db.connect()
    .then(() => {
      console.log("DB connected");
    })
    .catch((error) => {
      throw new Error(error);
    });
  console.log(`Example app listening on port ${port}`);
});
