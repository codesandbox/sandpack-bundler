// TODO: Use ast-walker, the babel plugin api is very sub-optimal
export function collectDependencies(requires: Set<string>) {
  return {
    visitor: {
      CallExpression(path: any) {
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
