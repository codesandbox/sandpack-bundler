const fastify = require("fastify")();
const path = require("path");

const PORT = +(process.env.PORT || "4587");

fastify.register(require("fastify-static"), {
  root: path.join(__dirname, "dist"),
  prefix: "/",
});

// Fallback to index.html, it's a SPA
fastify.setNotFoundHandler((req, reply) => {
  return reply.sendFile("index.html");
});

// Run the server!
fastify.listen(PORT, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Server is now listening on ${address}
  console.log(`Server is listening on http://localhost:${PORT}`);
});
