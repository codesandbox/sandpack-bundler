export function collectDependencies(requires: Set<string>) {
  return {
    visitor: {
      CallExpression(path) {
        var callee = path.get("callee");

        if (callee.isIdentifier() && callee.node.name === "require") {
          var arg = path.get("arguments.0");
          var evaluated = arg.evaluate();
          requires.add(evaluated.value);
        }
      }
    }
  };
}
