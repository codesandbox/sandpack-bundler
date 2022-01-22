const fastify = require("fastify");
const fastifyStatic = require("fastify-static");
const path = require("path");

const PORT = +(process.env.PORT || "4587");

const app = fastify();

app.register(fastifyStatic, {
  root: path.join(__dirname, "dist"),
  prefix: "/",
  cacheControl: true,
  dotfiles: "deny",
  etag: true,
  immutable: true,
  maxAge: 31 * 24 * 60 * 60 * 1000,
});

// Fallback to index.html, it's a SPA
app.setNotFoundHandler((req, reply) => {
  return reply.sendFile("index.html", { cacheControl: false });
});

// Run the server!
app.listen(PORT, (err, address) => {
  if (err) {
    app.log.error(err);
    process.exit(1);
  }

  // Server is now listening on ${address}
  console.log(`Server is listening on http://localhost:${PORT}`);
});
