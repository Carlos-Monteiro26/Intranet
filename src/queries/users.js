const usersQueries = {
  findByEmail: (email) => {
    return {
      name: "fetch-user",
      text: "SELECT * FROM users WHERE email = $1",
      values: [email],
    };
  },

  findByName: (name) => {
    return {
      name: "fetch-user-name",
      text: "SELECT * FROM users WHERE name = $1",
      values: [name],
    };
  },
};

module.exports = usersQueries;
