//Express and database import
const express = require("express");
const db = require("../src/database/db");

// importing requisition routes
const routesUser = require("./routes/users");
const routesCompany = require("./routes/companies");
const routesEvent = require("./routes/events");
const routesAssociate = require("./routes/associates");

//connections to routes
const app = express();
app.use(express.json());
const port = 3333;

app.get("/", (req, res) => {
  res.send("Intranet online");
});

//Route URLs
app.use("/users", routesUser);
app.use("/companies", routesCompany);
app.use("/events", routesEvent);
app.use("/associates", routesAssociate);

//Database connection and express listening to requests
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
